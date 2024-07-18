import { Regex } from '@companion-module/base'

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
		},
	]
}
