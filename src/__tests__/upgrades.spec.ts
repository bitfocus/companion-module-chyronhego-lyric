import { describe, expect, it } from 'vitest'
import type {
	CompanionMigrationAction,
	CompanionStaticUpgradeProps,
	CompanionUpgradeContext,
} from '@companion-module/base'
import { UpgradeScripts, numericActionOptionsApi2 } from '../upgrades.js'
import { ActionId } from '../actions.js'
import { DEFAULT_PORT, GetConfigFields, type ModuleConfig } from '../config.js'
import { actionDefinitions, fakeInstance } from './fixtures.js'

/**
 * Upgrade scripts are order-sensitive: a stored upgrade index records how far a configuration has been migrated, so
 * scripts may only ever be appended. Pin the indexes rather than taking the last entry, so appending a script can't
 * silently retarget this suite.
 */
const API2_SCRIPT_INDEX = 0
const EXPECTED_SCRIPT_COUNT = 1

// Options reach upgrade scripts already wrapped as ExpressionOrValue — Companion does that before running them
const v = (value: unknown) => ({ isExpression: false, value })
const expr = (value: string) => ({ isExpression: true, value })

function action(actionId: string, options: Record<string, unknown>): CompanionMigrationAction {
	return {
		id: `action-${actionId}`,
		controlId: 'bank-1',
		actionId,
		options: options as CompanionMigrationAction['options'],
	}
}

const config = (overrides: Record<string, unknown> = {}) =>
	({
		host: '10.0.0.1',
		port: 23,
		keepAlive: 'W\\1002\\6001\\Pinging\\Chyron',
		verbose: false,
		...overrides,
	}) as ModuleConfig

function run(index: number, actions: CompanionMigrationAction[], savedConfig: ModuleConfig | null = null) {
	return UpgradeScripts[index]({} as CompanionUpgradeContext<ModuleConfig>, {
		config: savedConfig,
		secrets: undefined,
		actions,
		feedbacks: [],
	} satisfies CompanionStaticUpgradeProps<ModuleConfig, undefined>)
}

it('the scripts sit at the indexes this suite targets', () => {
	// Appending a script is fine — bump EXPECTED_SCRIPT_COUNT. Never insert, reorder or remove one.
	expect(UpgradeScripts).toHaveLength(EXPECTED_SCRIPT_COUNT)
})

describe('API 2.x upgrade script', () => {
	it('makes the numbers typed into the old text inputs numbers, or expressions where they held variables', () => {
		const read = action(ActionId.ReadMessage, { buffer: v('1'), message: v('0012'), mode: v('1') })
		const write = action(ActionId.TemplateDataMessage, {
			templateDataMessage: v('$(internal:custom_tdm)'),
			lyricMessageNumber: v('55$(local:n)'),
			templates: v('5'),
		})
		const update = action(ActionId.UpdateCurrentTemplateData, {
			templateDataMessage: v(5501),
			templateNumber: v('7'),
			templatesData: v('9'),
		})
		const result = run(API2_SCRIPT_INDEX, [read, write, update])
		expect(result.updatedActions).toEqual([read, write, update])
		expect(read.options).toEqual({ buffer: v('1'), message: v(12), mode: v('1') })
		expect(write.options).toEqual({
			templateDataMessage: expr('$(internal:custom_tdm)'),
			lyricMessageNumber: expr('parseVariables("55$(local:n)")'),
			// Template data is text, and stays as it was
			templates: v('5'),
		})
		expect(update.options).toEqual({ templateDataMessage: v(5501), templateNumber: v(7), templatesData: v('9') })
	})

	it("leaves Custom Message's text alone, though its key is message too", () => {
		const custom = action(ActionId.CustomMessage, { message: v('42') })
		expect(run(API2_SCRIPT_INDEX, [custom]).updatedActions).toEqual([])
		expect(custom.options).toEqual({ message: v('42') })
	})

	it('reports only the actions it changed', () => {
		const done = action(ActionId.ReadMessage, { buffer: v('1'), message: v(3), mode: v('1') })
		const macro = action(ActionId.SendMacro, { macro: v('12') })
		expect(run(API2_SCRIPT_INDEX, [done, macro]).updatedActions).toEqual([])
		expect(done.options).toEqual({ buffer: v('1'), message: v(3), mode: v('1') })
	})

	it('makes a port saved as text a number, and leaves anything else for the module to reject', () => {
		expect(run(API2_SCRIPT_INDEX, [], config({ port: '2323' })).updatedConfig).toEqual(config({ port: 2323 }))
		expect(run(API2_SCRIPT_INDEX, [], config({ port: 23 })).updatedConfig).toBeNull()
		expect(run(API2_SCRIPT_INDEX, [], config({ port: 'telnet' })).updatedConfig).toBeNull()
		expect(run(API2_SCRIPT_INDEX, []).updatedConfig).toBeNull()
	})

	it('makes it a port the number field holds', () => {
		expect(GetConfigFields().find((field) => field.id === 'port')).toMatchObject({
			type: 'number',
			min: 1,
			max: 65535,
			default: DEFAULT_PORT,
		})
	})

	it('lists only options that are number fields now', () => {
		const defs = actionDefinitions(fakeInstance())
		for (const [actionId, keys] of Object.entries(numericActionOptionsApi2)) {
			const options = (defs[actionId as ActionId] || undefined)?.options ?? []
			for (const key of keys) {
				expect(options.find((o) => o.id === key)?.type, `${actionId}.${key}`).toBe('number')
			}
		}
	})
})
