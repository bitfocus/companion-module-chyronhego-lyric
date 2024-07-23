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
	actionDefinitions['readUpdateMessage'] = {
		name: 'Read & Update Message',
		options: [
			actionOptions.readUpdate,
			actionOptions.readBuffer,
			actionOptions.readMessage,
			actionOptions.readDisplayMode,
			actionOptions.templateData,
		],
		callback: async ({ options }) => {
			const msg = parseInt(await self.parseVariablesInString(options.message))
			const data = await self.parseVariablesInString(options.templates)
			if (isNaN(msg) || msg < 0) {
				self.log('warn', `Invalid Message Number ${msg} From: ${options.message}`)
				return undefined
			}
			self.sendCommand(options.update + options.buffer + cmd.sep + msg + cmd.sep + options.mode + cmd.sep + data)
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
	actionDefinitions['templateDataMessage'] = {
		name: 'Template Data Message',
		options: [
			actionOptions.templateDataMessage,
			actionOptions.lyricMessage,
			actionOptions.templateData,
			actionOptions.templateInfo,
		],
		callback: async ({ options }) => {
			const templateNumber = parseInt(await self.parseVariablesInString(options.templateDataMessage))
			const lyricMsg = parseInt(await self.parseVariablesInString(options.lyricMessageNumber))
			const templateData = await self.parseVariablesInString(options.templates)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(lyricMsg) || lyricMsg < 0) {
				self.log('warn', `Invalid Template Number: ${templateNumber} or Lyric Message Number: ${lyricMsg}`)
				return undefined
			}
			self.sendCommand(cmd.writeTabData + cmd.sep + templateNumber + cmd.sep + lyricMsg + cmd.sep + templateData)
		},
	}
	actionDefinitions['updateTemplateData'] = {
		name: 'Update Template Data Message',
		options: [
			actionOptions.lyricMessage,
			actionOptions.templateNumber,
			actionOptions.templateData,
			actionOptions.updateTemplateInfo,
		],
		callback: async ({ options }) => {
			const templateNumber = parseInt(await self.parseVariablesInString(options.templateNumber))
			const lyricMsg = parseInt(await self.parseVariablesInString(options.lyricMessageNumber))
			const templateData = await self.parseVariablesInString(options.templates)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(lyricMsg) || lyricMsg < 0) {
				self.log('warn', `Invalid Template Number: ${templateNumber} or Lyric Message Number: ${lyricMsg}`)
				return undefined
			}
			self.sendCommand(cmd.updateTabDataField + cmd.sep + lyricMsg + cmd.sep + templateNumber + cmd.sep + templateData)
		},
	}
	actionDefinitions['updateCurrentTemplateData'] = {
		name: 'Update Current Template Data Message',
		options: [
			actionOptions.templateDataMessage,
			actionOptions.templateNumber,
			actionOptions.templateData,
			actionOptions.updateTemplateInfo,
		],
		callback: async ({ options }) => {
			const templateDataMsg = parseInt(await self.parseVariablesInString(options.templateDataMessage))
			const templateNumber = parseInt(await self.parseVariablesInString(options.templateNumber))
			const templateData = await self.parseVariablesInString(options.templates)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(templateDataMsg) || templateDataMsg < 0) {
				self.log(
					'warn',
					`Invalid Template Number: ${templateNumber} or Template Data Message Number: ${templateDataMsg}`
				)
				return undefined
			}
			self.sendCommand(
				cmd.updateCurrentTemplate + cmd.sep + templateDataMsg + cmd.sep + templateNumber + cmd.sep + templateData
			)
		},
	}
	actionDefinitions['updateMessagePath'] = {
		name: 'Update Message Path',
		options: [actionOptions.messagePath],
		callback: async ({ options }) => {
			self.sendCommand(cmd.setDriveAndMessageDirectory + cmd.sep + (await self.parseVariablesInString(options.msgPath)))
		},
	}
	self.setActionDefinitions(actionDefinitions)
}
