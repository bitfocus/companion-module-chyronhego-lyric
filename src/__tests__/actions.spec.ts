import { describe, expect, it } from 'vitest'
import type { SomeCompanionActionInputField } from '@companion-module/base'
import { ActionId } from '../actions.js'
import { actionDefinitions, fakeInstance, runAction } from './fixtures.js'

function optionField(actionId: ActionId, key: string): SomeCompanionActionInputField | undefined {
	return (actionDefinitions(fakeInstance())[actionId] || undefined)?.options.find((o) => o.id === key)
}

describe('actions', () => {
	it('defines every action id', () => {
		const defs = actionDefinitions(fakeInstance())
		expect(Object.keys(defs).sort()).toEqual(Object.values(ActionId).sort())
	})

	it('send their command, with the action signal', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		const { signal } = new AbortController()
		await runAction(defs, ActionId.SendMacro, { macro: 'Dim x~x = 1' }, signal)
		await runAction(defs, ActionId.ReadMessage, { buffer: '1', message: 5500, mode: '1' })
		await runAction(defs, ActionId.ReadUpdateMessage, {
			update: 'V\\5\\13\\1\\',
			buffer: '2',
			message: 12,
			mode: '0',
			templates: 'Jane\\Doe',
		})
		await runAction(defs, ActionId.CustomMessage, { message: 'Y\\<C0>' })
		await runAction(defs, ActionId.TemplateDataMessage, {
			templateDataMessage: 5501,
			lyricMessageNumber: 5500,
			templates: 'a\\b',
		})
		await runAction(defs, ActionId.UpdateTemplateData, {
			templateDataMessage: 5501,
			templateNumber: 7,
			templatesData: 'x',
		})
		await runAction(defs, ActionId.UpdateCurrentTemplateData, {
			templateDataMessage: 5501,
			templateNumber: 7,
			templatesData: 'y',
		})
		await runAction(defs, ActionId.UpdateMessagePath, { msgPath: 'C:\\Data\\Messages' })
		expect(fake.sendCommand.mock.calls).toEqual([
			['E\\Dim x~x = 1', signal],
			['V\\5\\3\\1\\1\\5500\\1', expect.any(AbortSignal)],
			['V\\5\\13\\1\\2\\12\\0\\Jane\\Doe', expect.any(AbortSignal)],
			['Y\\<C0>', expect.any(AbortSignal)],
			['W\\5501\\5500\\a\\b', expect.any(AbortSignal)],
			['U\\5501\\7\\x', expect.any(AbortSignal)],
			['U\\*\\5501\\7\\y', expect.any(AbortSignal)],
			['M\\C:\\Data\\Messages', expect.any(AbortSignal)],
		])
	})

	it('send empty template data as given', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		await runAction(defs, ActionId.TemplateDataMessage, {
			templateDataMessage: 1,
			lyricMessageNumber: 2,
			templates: '',
		})
		expect(fake.sendCommand).toHaveBeenCalledExactlyOnceWith('W\\1\\2\\', expect.any(AbortSignal))
	})

	it('send nothing for a number or choice that is not valid, as a value saved by an older version can be', async () => {
		const fake = fakeInstance()
		const defs = actionDefinitions(fake)
		await expect(runAction(defs, ActionId.ReadMessage, { buffer: '1', message: -1, mode: '1' })).rejects.toThrow(
			'Lyric Message Number -1 is not valid',
		)
		await expect(runAction(defs, ActionId.ReadMessage, { buffer: '1', message: '12', mode: '1' })).rejects.toThrow(
			'not valid',
		)
		await expect(runAction(defs, ActionId.ReadMessage, { buffer: '3', message: 1, mode: '1' })).rejects.toThrow(
			'Buffer 3 is not valid',
		)
		await expect(
			runAction(defs, ActionId.UpdateTemplateData, { templateDataMessage: 1, templateNumber: 1.5, templatesData: '' }),
		).rejects.toThrow('Template Number 1.5 is not valid')
		expect(fake.sendCommand).not.toHaveBeenCalled()
	})
})

describe('action options', () => {
	it('let template data be empty, as Companion skips an action whose text is shorter than minLength', () => {
		for (const [actionId, key] of [
			[ActionId.ReadUpdateMessage, 'templates'],
			[ActionId.TemplateDataMessage, 'templates'],
			[ActionId.UpdateTemplateData, 'templatesData'],
			[ActionId.UpdateCurrentTemplateData, 'templatesData'],
		] as const) {
			const field = optionField(actionId, key)
			expect(field?.type, `${actionId}.${key}`).toBe('textinput')
			expect(field && 'minLength' in field ? field.minLength : undefined, `${actionId}.${key}`).toBeUndefined()
		}
	})

	it('parse variables in every text field', () => {
		for (const def of Object.values(actionDefinitions(fakeInstance()))) {
			for (const field of (def || undefined)?.options ?? []) {
				if (field.type === 'textinput') expect(field.useVariables, field.id).toBe(true)
			}
		}
	})
})
