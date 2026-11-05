import { EventEmitter } from 'node:events'
import { InstanceStatus, TCPHelper, type LogLevel } from '@companion-module/base'
import PQueue from 'p-queue'
import { cmd, EOL } from './consts.js'
import { errorMessage } from './utils.js'

export interface ConnectionTiming {
	/** Least time from sending one command to sending the next */
	messageInterval: number
	/** The keep alive message is sent once nothing has been sent for this long */
	keepAliveInterval: number
	reconnectInterval: number
}

export const DEFAULT_TIMING: ConnectionTiming = {
	messageInterval: 20,
	keepAliveInterval: 30000,
	reconnectInterval: 2000,
}

export interface ConnectionOptions {
	host: string
	port: number
	/** Sent once nothing has been sent for the keep alive interval, to hold the connection open */
	keepAlive: string
	log: (level: LogLevel, message: string) => void
	/** Defaults to {@link DEFAULT_TIMING}. Tests shorten it */
	timing?: Partial<ConnectionTiming>
}

export interface ConnectionEvents {
	/** A line from Lyric, without its line ending */
	reply: [line: string]
	status: [status: InstanceStatus, message: string | null]
}

/**
 * The Intelligent Interface connection to Lyric: framing, pacing, keep alive and reconnection. Knows nothing of
 * Companion beyond reporting a status for it.
 */
export class LyricConnection extends EventEmitter<ConnectionEvents> {
	readonly #options: ConnectionOptions
	readonly #timing: ConnectionTiming
	readonly #queue: PQueue
	/** Aborted as the connection is destroyed, which drops everything still queued */
	readonly #controller = new AbortController()
	#socket: TCPHelper | undefined
	#buffer = ''
	#keepAliveTimer: NodeJS.Timeout | undefined
	/** Set by the first failure of an outage, so retries against a Lyric that is down don't flood the log */
	#outageLogged = false

	constructor(options: ConnectionOptions) {
		super()
		this.#options = options
		this.#timing = { ...DEFAULT_TIMING, ...options.timing }
		this.#queue = new PQueue({ concurrency: 1, interval: this.#timing.messageInterval, intervalCap: 1 })
	}

	get isConnected(): boolean {
		return this.#socket?.isConnected ?? false
	}

	/** Opens the connection, replacing any already open. After that, TCPHelper reconnects by itself */
	connect(): void {
		if (this.#controller.signal.aborted) throw new Error('Connection has been destroyed')
		this.#closeSocket()
		const { host, port } = this.#options
		this.emit('status', InstanceStatus.Connecting, `Connecting to Lyric: ${host}:${port}`)
		const socket = new TCPHelper(host, port, { reconnect: true, reconnect_interval: this.#timing.reconnectInterval })
		this.#socket = socket
		socket.on('connect', () => this.#onConnect())
		socket.on('data', (chunk) => this.#receive(chunk))
		socket.on('end', () => {
			this.#stopKeepAlive()
			this.emit('status', InstanceStatus.Disconnected, 'Connection closed by Lyric')
			this.#logOutage('warn', `Connection closed by ${host}:${port}`)
		})
		socket.on('error', (err) => {
			this.#stopKeepAlive()
			this.emit('status', InstanceStatus.ConnectionFailure, err.message)
			this.#logOutage('error', `Network error: ${err.message}`)
		})
	}

	/** Closes the connection for good. Anything still queued is rejected */
	destroy(): void {
		this.#controller.abort(new Error('Connection to Lyric closed'))
		this.removeAllListeners()
		this.#closeSocket()
	}

	/**
	 * Queues a command for Lyric
	 * @param command the command, without the terminating `\\` and line ending
	 * @param signal an action's context.signal. A command whose signal aborts before its turn is never sent
	 * @returns once the command is written to the socket
	 * @throws if not connected when the command's turn comes, or the connection is destroyed or the signal aborts first
	 */
	async send(command: string, signal?: AbortSignal): Promise<void> {
		// p-queue listens on the combined signal from the moment the job is queued, which makes it pass an abort on
		// eagerly. Only reading .aborted could miss one: AbortSignal.any holds its sources weakly
		const combined = signal ? AbortSignal.any([this.#controller.signal, signal]) : this.#controller.signal
		await this.#queue.add(
			async ({ signal: jobSignal }) => {
				jobSignal?.throwIfAborted()
				const socket = this.#socket
				if (!socket?.isConnected || !(await socket.sendAsync(command + cmd.eom + EOL))) {
					throw new Error('Not connected to Lyric')
				}
				this.#options.log('debug', `Sending message: ${command}`)
				this.#startKeepAlive()
			},
			{ signal: combined },
		)
	}

	#onConnect(): void {
		const { host, port } = this.#options
		this.#buffer = ''
		this.#outageLogged = false
		this.#options.log('info', `Connected to ${host}:${port}`)
		this.emit('status', InstanceStatus.Ok, null)
		this.#startKeepAlive()
	}

	#receive(chunk: Buffer): void {
		this.#buffer += chunk.toString()
		const lines = this.#buffer.split(EOL)
		this.#buffer = lines.pop() ?? ''
		for (const line of lines) {
			try {
				this.emit('reply', line)
			} catch (err) {
				// This runs in the socket's data listener, where a throw would end the module's process
				this.#options.log('error', `Could not handle reply ${line}: ${errorMessage(err)}`)
			}
		}
	}

	/** (Re)starts the wait before the keep alive message. Every command sent restarts it */
	#startKeepAlive(): void {
		this.#stopKeepAlive()
		this.#keepAliveTimer = setTimeout(() => {
			this.#keepAliveTimer = undefined
			// A failure here is the connection dropping, which is reported already
			this.send(this.#options.keepAlive).catch((err) =>
				this.#options.log('debug', `Keep alive not sent: ${errorMessage(err)}`),
			)
		}, this.#timing.keepAliveInterval)
	}

	#stopKeepAlive(): void {
		clearTimeout(this.#keepAliveTimer)
		this.#keepAliveTimer = undefined
	}

	#closeSocket(): void {
		this.#stopKeepAlive()
		// TCPHelper's destroy removes its listeners first, so the old socket can't report anything once replaced
		this.#socket?.destroy()
		this.#socket = undefined
		this.#buffer = ''
	}

	#logOutage(level: LogLevel, message: string): void {
		this.#options.log(this.#outageLogged ? 'debug' : level, message)
		this.#outageLogged = true
	}
}
