import type { SomeCompanionConfigField } from '@companion-module/base'
import { cmd } from './consts.js'
import { DEFAULT_TIMING } from './connection.js'

export const DEFAULT_PORT = 23

export type ModuleConfig = {
	host: string
	port: number
	/** Sent once nothing has been sent for a while, to hold the connection open */
	keepAlive: string
	/** Write debug messages to the log */
	verbose: boolean
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Host',
			width: 8,
			minLength: 4,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			asInteger: true,
			default: DEFAULT_PORT,
		},
		{
			type: 'textinput',
			id: 'keepAlive',
			label: 'Keep Alive Message',
			width: 6,
			minLength: 1,
			default: cmd.ping,
			tooltip: `Sent after ${DEFAULT_TIMING.keepAliveInterval / 1000} seconds of inactivity to maintain TCP Connection`,
		},
		{
			type: 'checkbox',
			id: 'verbose',
			label: 'Verbose Logging',
			width: 4,
			default: false,
		},
	]
}

/** The port, or undefined if it is not one TCP can use. A saved config isn't checked against its field's min and max */
export function validPort(port: unknown): number | undefined {
	return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535 ? port : undefined
}

/** The keep alive message, or the default for a config without one */
export function keepAliveMessage(config: ModuleConfig): string {
	const message: unknown = config.keepAlive
	return typeof message === 'string' && message !== '' ? message : cmd.ping
}
