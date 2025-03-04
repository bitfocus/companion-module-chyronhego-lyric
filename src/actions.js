import { actionOptions, cmd } from './consts.js'

export async function UpdateActions(self) {
	let actionDefinitions = []
	actionDefinitions['sendMacro'] = {
		name: 'Send and Execute Macro',
		options: [actionOptions.macro, actionOptions.macroInfo],
		callback: async ({ options }, context) => {
			const macro = await context.parseVariablesInString(options.macro)
			return await self.sendCommand(cmd.macro + cmd.sep + macro)
		},
	}
	actionDefinitions['readMessage'] = {
		name: 'Read Message',
		options: [actionOptions.readBuffer, actionOptions.readMessage, actionOptions.readDisplayMode],
		callback: async ({ options }, context) => {
			const msg = parseInt(await context.parseVariablesInString(options.message))
			if (isNaN(msg) || msg < 0) {
				self.log('warn', `Invalid Message Number ${msg} From: ${options.message}`)
				return undefined
			}
			return await self.sendCommand(cmd.read + options.buffer + cmd.sep + msg + cmd.sep + options.mode)
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
		callback: async ({ options }, context) => {
			const msg = parseInt(await context.parseVariablesInString(options.message))
			const data = await context.parseVariablesInString(options.templates)
			if (isNaN(msg) || msg < 0) {
				self.log('warn', `Invalid Message Number ${msg} From: ${options.message}`)
				return undefined
			}
			return await self.sendCommand(
				options.update + options.buffer + cmd.sep + msg + cmd.sep + options.mode + cmd.sep + data,
			)
		},
	}
	actionDefinitions['customMessage'] = {
		name: 'Custom Message',
		options: [actionOptions.customMessage],
		callback: async ({ options }, context) => {
			const msg = await context.parseVariablesInString(options.message)
			return await self.sendCommand(msg)
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
		callback: async ({ options }, context) => {
			const templateNumber = parseInt(await context.parseVariablesInString(options.templateDataMessage))
			const lyricMsg = parseInt(await context.parseVariablesInString(options.lyricMessageNumber))
			const templateData = await context.parseVariablesInString(options.templates)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(lyricMsg) || lyricMsg < 0) {
				self.log('warn', `Invalid Template Number: ${templateNumber} or Lyric Message Number: ${lyricMsg}`)
				return undefined
			}
			return await self.sendCommand(
				cmd.writeTabData + cmd.sep + templateNumber + cmd.sep + lyricMsg + cmd.sep + templateData,
			)
		},
	}
	actionDefinitions['updateTemplateData'] = {
		name: 'Update Template Data Message',
		options: [
			actionOptions.templateDataMessage,
			actionOptions.templateNumber,
			actionOptions.templateDataSingle,
			actionOptions.updateTemplateInfo,
		],
		callback: async ({ options }, context) => {
			const templateDataMsg = parseInt(await context.parseVariablesInString(options.templateDataMessage))
			const templateNumber = parseInt(await context.parseVariablesInString(options.templateNumber))
			const templateData = await context.parseVariablesInString(options.templatesData)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(templateDataMsg) || templateDataMsg < 0) {
				self.log(
					'warn',
					`Invalid Template Number: ${templateNumber} or Templdate Data Message Number: ${templateDataMsg}`,
				)
				return undefined
			}
			return await self.sendCommand(
				cmd.updateTabDataField + cmd.sep + templateDataMsg + cmd.sep + templateNumber + cmd.sep + templateData,
			)
		},
	}
	actionDefinitions['updateCurrentTemplateData'] = {
		name: 'Update Current Template Data Message',
		options: [
			actionOptions.templateDataMessage,
			actionOptions.templateNumber,
			actionOptions.templateDataSingle,
			actionOptions.updateCurrentTemplateInfo,
		],
		callback: async ({ options }, context) => {
			const templateDataMsg = parseInt(await context.parseVariablesInString(options.templateDataMessage))
			const templateNumber = parseInt(await context.parseVariablesInString(options.templateNumber))
			const templateData = await context.parseVariablesInString(options.templatesData)
			if (isNaN(templateNumber) || templateNumber < 0 || isNaN(templateDataMsg) || templateDataMsg < 0) {
				self.log(
					'warn',
					`Invalid Template Number: ${templateNumber} or Template Data Message Number: ${templateDataMsg}`,
				)
				return undefined
			}
			return await self.sendCommand(
				cmd.updateCurrentTemplate + cmd.sep + templateDataMsg + cmd.sep + templateNumber + cmd.sep + templateData,
			)
		},
	}
	actionDefinitions['updateMessagePath'] = {
		name: 'Update Message Path',
		options: [actionOptions.messagePath],
		callback: async ({ options }, context) => {
			return await self.sendCommand(
				cmd.setDriveAndMessageDirectory + cmd.sep + (await context.parseVariablesInString(options.msgPath)),
			)
		},
	}
	self.setActionDefinitions(actionDefinitions)
}
