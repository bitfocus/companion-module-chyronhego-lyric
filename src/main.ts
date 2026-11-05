import { InstanceBase, InstanceStatus, type LogLevel, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, keepAliveMessage, validPort, type ModuleConfig } from './config.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionSchema } from './actions.js'
import { LyricConnection, type ConnectionTiming } from './connection.js'
import { parseReply } from './parse.js'
import { unhandledOption } from './utils.js'

export type ModuleTypes = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionSchema
	feedbacks: Record<string, never>
	variables: Record<string, never>
}

export { UpgradeScripts }

export default class LyricInstance extends InstanceBase<ModuleTypes> {
	config!: ModuleConfig // Setup in init()
	/** Overrides the connection's timing. Tests shorten it */
	timing: Partial<ConnectionTiming> | undefined
	#connection: LyricConnection | undefined
	#lastStatus: { status: InstanceStatus; message: string | null } | undefined

	async init(config: ModuleConfig): Promise<void> {
		UpdateActions(this)
		await this.configUpdated(config)
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.#close()
		this.#open()
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy ${this.id}: ${this.label}`)
		this.#close()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	/**
	 * Queues a command for Lyric
	 * @param command the command, without the terminating `\\` and line ending
	 * @param signal an action's context.signal, so a command the user no longer wants is dropped before it is sent
	 * @throws if not connected, or the command is not sent
	 */
	async sendCommand(command: string, signal?: AbortSignal): Promise<void> {
		if (this.#connection === undefined) throw new Error('Not connected to Lyric')
		await this.#connection.send(command, signal)
	}

	#open(): void {
		const host = this.config.host?.trim()
		const port = validPort(this.config.port)
		if (!host || port === undefined) {
			this.#setStatus(InstanceStatus.BadConfig, `Invalid host (${host}) or port (${String(this.config.port)})`)
			return
		}
		const connection = new LyricConnection({
			host,
			port,
			keepAlive: keepAliveMessage(this.config),
			log: (level, message) => this.#log(level, message),
			timing: this.timing,
		})
		connection.on('status', (status, message) => this.#setStatus(status, message))
		connection.on('reply', (line) => this.#onReply(line))
		this.#connection = connection
		connection.connect()
	}

	#close(): void {
		this.#connection?.destroy()
		this.#connection = undefined
	}

	/** Logs, leaving out debug messages unless Verbose Logging is on */
	#log(level: LogLevel, message: string): void {
		if (level === 'debug' && !this.config.verbose) return
		this.log(level, message)
	}

	/** Updates the status, unless it is unchanged */
	#setStatus(status: InstanceStatus, message: string | null): void {
		if (this.#lastStatus?.status === status && this.#lastStatus.message === message) return
		this.#lastStatus = { status, message }
		this.updateStatus(status, message)
	}

	#onReply(line: string): void {
		const reply = parseReply(line)
		switch (reply.type) {
			case 'success':
				this.#setStatus(InstanceStatus.Ok, null)
				this.#log('debug', `Message Success: ${line}`)
				break
			case 'welcome':
				this.#setStatus(InstanceStatus.Ok, 'Connected')
				this.#log('info', `Logged In: ${line}`)
				break
			case 'inUse':
				this.#setStatus(InstanceStatus.ConnectionFailure, 'Port In Use')
				this.#log('warn', `Port Already In Use: ${line}`)
				break
			case 'error':
				this.#log(reply.error.level, `Error returned: ${line}: ${reply.error.label}`)
				this.#setStatus(reply.error.status, reply.error.label)
				break
			case 'malformedControl':
				this.#log('debug', `Control error message - unexpected array length: ${reply.fields} from ${line}`)
				break
			case 'unknownControl':
				this.#log('debug', `Control message with an unknown error code: ${line}`)
				break
			case 'blank':
				break
			case 'unknown':
				this.#setStatus(InstanceStatus.UnknownWarning, 'Unexpected Response')
				this.#log('warn', `Unexpected Response: ${line}`)
				break
			default:
				unhandledOption(reply, undefined)
		}
	}
}
