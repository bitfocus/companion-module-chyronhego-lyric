import { createServer, type Server, type Socket } from 'node:net'

// Written out here rather than taken from the module under test
const EOL = '\r\n'
const EOM = '\\\\'

export const WELCOME = 'Welcome to the ChyronHego Intelligent Interface Telnet Server on LYRIC-PC'
export const IN_USE = 'The Intelligent Interface port is already in use'

export interface ReceivedLine {
	/** performance.now() on arrival */
	at: number
	/** Which connection it came on, counting from 1 */
	connection: number
	/** The line without its line ending, but with the `\\` ending the command */
	text: string
}

/**
 * Lyric's Intelligent Interface on a loopback TCP port, for the module to connect to. It greets each connection, and
 * answers every command with a success.
 *
 * These replies are synthetic, not captured from Lyric: they follow the reply forms the module was written against.
 */
export class FakeLyric {
	readonly received: ReceivedLine[] = []
	/** Sent on each new connection */
	greeting = WELCOME
	/** The reply to every command. Undefined sends none */
	reply: string | undefined = '*'
	port = 0
	/** Connections accepted so far */
	connections = 0
	readonly #server: Server
	readonly #sockets = new Set<Socket>()

	constructor() {
		this.#server = createServer((socket) => {
			this.connections++
			const connection = this.connections
			this.#sockets.add(socket)
			socket.write(this.greeting + EOL)
			let buffer = ''
			socket.on('data', (chunk: Buffer) => {
				buffer += chunk.toString()
				let end: number
				while ((end = buffer.indexOf(EOL)) !== -1) {
					const text = buffer.slice(0, end)
					buffer = buffer.slice(end + EOL.length)
					this.received.push({ at: performance.now(), connection, text })
					if (this.reply !== undefined) socket.write(this.reply + EOL)
				}
			})
			socket.on('close', () => this.#sockets.delete(socket))
			socket.on('error', () => {})
		})
	}

	async listen(): Promise<void> {
		await new Promise<void>((resolve) => this.#server.listen(0, '127.0.0.1', resolve))
		const address = this.#server.address()
		if (!address || typeof address === 'string') throw new Error('fake Lyric did not get a port')
		this.port = address.port
	}

	async close(): Promise<void> {
		this.dropConnections()
		await new Promise<void>((resolve) => this.#server.close(() => resolve()))
	}

	/** Closes every connection from Lyric's end */
	dropConnections(): void {
		for (const socket of this.#sockets) socket.destroy()
	}

	/** Writes raw text to every connection, line ending and all */
	write(text: string): void {
		for (const socket of this.#sockets) socket.write(text)
	}

	/** Writes a line to every connection */
	broadcast(line: string): void {
		this.write(line + EOL)
	}

	/** The commands received, in order, without the `\\` ending each, optionally only those on one connection */
	commands(connection?: number): string[] {
		return this.received
			.filter((r) => connection === undefined || r.connection === connection)
			.map((r) => (r.text.endsWith(EOM) ? r.text.slice(0, -EOM.length) : `<no EOM> ${r.text}`))
	}
}

/** A port nothing is listening on */
export async function closedPort(): Promise<number> {
	const lyric = new FakeLyric()
	await lyric.listen()
	const { port } = lyric
	await lyric.close()
	return port
}
