import { Regex } from '@companion-module/base'
import { cmd, default_port, keep_alive_timeout } from './consts.js'

// Return config fields for web config
export function getConfigFields() {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Host',
			width: 8,
			regex: Regex.HOST,
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Port',
			width: 4,
			regex: Regex.PORT,
			default: default_port,
		},
		{
			type: 'textinput',
			id: 'keepAlive',
			label: 'Keep Alive Message',
			width: 6,
			regex: Regex.SOMETHING,
			default: cmd.ping,
			tooltip: `Sent after ${keep_alive_timeout / 1000} seconds of inactivity to maintain TCP Connection`,
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
