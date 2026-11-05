import { cmd, loginMsg, msgSuccess } from './consts.js'
import { findError, type LyricError } from './errors.js'

export type ParsedReply =
	/** A command was carried out */
	| { type: 'success' }
	/** The greeting Lyric sends when a connection opens */
	| { type: 'welcome' }
	/** Another client holds the Intelligent Interface port */
	| { type: 'inUse' }
	/** An error code, on its own or in a V (control) message */
	| { type: 'error'; error: LyricError }
	/** A V message too short to hold an error code */
	| { type: 'malformedControl'; fields: number }
	/** A V message whose code is not a documented error */
	| { type: 'unknownControl' }
	| { type: 'blank' }
	| { type: 'unknown' }

/** Makes sense of a line from Lyric, without its line ending */
export function parseReply(line: string): ParsedReply {
	if (line.startsWith(msgSuccess)) return { type: 'success' }
	if (line.startsWith(loginMsg.welcome)) return { type: 'welcome' }
	if (line.includes(loginMsg.inUse)) return { type: 'inUse' }
	if (line.startsWith(cmd.control)) {
		const fields = line.split(cmd.sep)
		const code = fields[2]
		if (code === undefined) return { type: 'malformedControl', fields: fields.length }
		const error = findError(code)
		return error ? { type: 'error', error } : { type: 'unknownControl' }
	}
	if (line.trim() === '') return { type: 'blank' }
	const error = findError(line)
	return error ? { type: 'error', error } : { type: 'unknown' }
}
