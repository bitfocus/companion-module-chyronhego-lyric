import { actionOptions, cmd } from './consts.js'

export async function UpdateActions(self) {
	let actionDefinitions = []
	actionDefinitions['sendMacro'] = {
		name: 'Send and Execute Macro',
		options: [actionOptions.macro, actionOptions.macroInfo],
		callback: async ({ options }) => {
			const macro = await self.parseVariablesInString(options.macro)
			self.sendCommand(cmd.macro + cmd.sep + macro)
		},
	}
	actionDefinitions['readMessage'] = {
		name: 'Read Message',
		options: [actionOptions.readBuffer, actionOptions.readMessage, actionOptions.readDisplayMode],
		callback: async ({ options }) => {
			const msg = parseInt(await self.parseVariablesInString(options.message))
			if (isNaN(msg) || msg < 0) {
				self.log('warn', `Invalid Message Number ${msg} From: ${options.message}`)
				return undefined
			}
			self.sendCommand(cmd.read + options.buffer + cmd.sep + msg + cmd.sep + options.mode)
		},
	}
	actionDefinitions['customMessage'] = {
		name: 'Custom Message',
		options: [actionOptions.customMessage],
		callback: async ({ options }) => {
			const msg = await self.parseVariablesInString(options.message)
			self.sendCommand(msg)
		},
	}
	self.setActionDefinitions(actionDefinitions)
}
