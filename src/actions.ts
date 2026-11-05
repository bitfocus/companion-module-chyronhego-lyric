import type { CompanionActionDefinitions } from '@companion-module/base'
import type LyricInstance from './main.js'
import { cmd } from './consts.js'
import {
	BUFFERS,
	DISPLAY_MODES,
	NUMBER_MAX,
	READ_UPDATE_MODES,
	customMessage,
	lyricMessage,
	macro,
	macroInfo,
	messagePath,
	readBuffer,
	readDisplayMode,
	readMessage,
	readUpdate,
	templateData,
	templateDataMessage,
	templateDataSingle,
	templateInfo,
	templateNumber,
	updateCurrentTemplateInfo,
	updateTemplateInfo,
	type BufferId,
	type DisplayMode,
	type ReadUpdateMode,
} from './options.js'
import { choiceValue, wholeNumber } from './utils.js'

/**
 * Action ids. The values are the ids saved against every button using the action, so they must never change. They
 * predate this enum, which is why they are camelCase.
 */
export enum ActionId {
	SendMacro = 'sendMacro',
	ReadMessage = 'readMessage',
	ReadUpdateMessage = 'readUpdateMessage',
	CustomMessage = 'customMessage',
	TemplateDataMessage = 'templateDataMessage',
	UpdateTemplateData = 'updateTemplateData',
	UpdateCurrentTemplateData = 'updateCurrentTemplateData',
	UpdateMessagePath = 'updateMessagePath',
}

/** The option keys are saved against every button too */
type TemplateUpdateOptions = { templateDataMessage: number; templateNumber: number; templatesData: string }

export type ActionSchema = {
	[ActionId.SendMacro]: { options: { macro: string } }
	[ActionId.ReadMessage]: { options: { buffer: BufferId; message: number; mode: DisplayMode } }
	[ActionId.ReadUpdateMessage]: {
		options: { update: ReadUpdateMode; buffer: BufferId; message: number; mode: DisplayMode; templates: string }
	}
	[ActionId.CustomMessage]: { options: { message: string } }
	[ActionId.TemplateDataMessage]: {
		options: { templateDataMessage: number; lyricMessageNumber: number; templates: string }
	}
	[ActionId.UpdateTemplateData]: { options: TemplateUpdateOptions }
	[ActionId.UpdateCurrentTemplateData]: { options: TemplateUpdateOptions }
	[ActionId.UpdateMessagePath]: { options: { msgPath: string } }
}

/** Joins a command's fields with Lyric's separator */
const join = (...fields: (string | number)[]): string => fields.join(cmd.sep)

const lyricNumber = (value: unknown, label: string): number => wholeNumber(value, 0, NUMBER_MAX, label)

export function UpdateActions(self: LyricInstance): void {
	const actions: CompanionActionDefinitions<ActionSchema> = {
		[ActionId.SendMacro]: {
			name: 'Send and Execute Macro',
			options: [macro, macroInfo],
			callback: async ({ options }, { signal }) => {
				await self.sendCommand(join(cmd.macro, options.macro), signal)
			},
		},
		[ActionId.ReadMessage]: {
			name: 'Read Message',
			options: [readBuffer, readMessage, readDisplayMode],
			callback: async ({ options }, { signal }) => {
				const buffer = choiceValue(BUFFERS, options.buffer, 'Buffer')
				const message = lyricNumber(options.message, 'Lyric Message Number')
				const mode = choiceValue(DISPLAY_MODES, options.mode, 'Display Mode')
				// cmd.read ends with the separator
				await self.sendCommand(cmd.read + join(buffer, message, mode), signal)
			},
		},
		[ActionId.ReadUpdateMessage]: {
			name: 'Read & Update Message',
			options: [readUpdate, readBuffer, readMessage, readDisplayMode, templateData],
			callback: async ({ options }, { signal }) => {
				const update = choiceValue(READ_UPDATE_MODES, options.update, 'Update Mode')
				const buffer = choiceValue(BUFFERS, options.buffer, 'Buffer')
				const message = lyricNumber(options.message, 'Lyric Message Number')
				const mode = choiceValue(DISPLAY_MODES, options.mode, 'Display Mode')
				// The update mode ends with the separator
				await self.sendCommand(update + join(buffer, message, mode, options.templates), signal)
			},
		},
		[ActionId.CustomMessage]: {
			name: 'Custom Message',
			options: [customMessage],
			callback: async ({ options }, { signal }) => {
				await self.sendCommand(options.message, signal)
			},
		},
		[ActionId.TemplateDataMessage]: {
			name: 'Template Data Message',
			options: [templateDataMessage, lyricMessage, templateData, templateInfo],
			callback: async ({ options }, { signal }) => {
				const templateDataMsg = lyricNumber(options.templateDataMessage, 'Template Data Message')
				const lyricMsg = lyricNumber(options.lyricMessageNumber, 'Lyric Message Number')
				await self.sendCommand(join(cmd.writeTabData, templateDataMsg, lyricMsg, options.templates), signal)
			},
		},
		[ActionId.UpdateTemplateData]: {
			name: 'Update Template Data Message',
			options: [templateDataMessage, templateNumber, templateDataSingle, updateTemplateInfo],
			callback: async ({ options }, { signal }) => {
				await self.sendCommand(templateUpdate(cmd.updateTabDataField, options), signal)
			},
		},
		[ActionId.UpdateCurrentTemplateData]: {
			name: 'Update Current Template Data Message',
			options: [templateDataMessage, templateNumber, templateDataSingle, updateCurrentTemplateInfo],
			callback: async ({ options }, { signal }) => {
				await self.sendCommand(templateUpdate(cmd.updateCurrentTemplate, options), signal)
			},
		},
		[ActionId.UpdateMessagePath]: {
			name: 'Update Message Path',
			options: [messagePath],
			callback: async ({ options }, { signal }) => {
				await self.sendCommand(join(cmd.setDriveAndMessageDirectory, options.msgPath), signal)
			},
		},
	}
	self.setActionDefinitions(actions)
}

/** A U or U\* command, updating one template in a Template Data Message */
function templateUpdate(command: string, options: TemplateUpdateOptions): string {
	const templateDataMsg = lyricNumber(options.templateDataMessage, 'Template Data Message')
	const template = lyricNumber(options.templateNumber, 'Template Number')
	return join(command, templateDataMsg, template, options.templatesData)
}
