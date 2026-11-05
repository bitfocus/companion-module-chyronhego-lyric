import {
	FixupNumericOrVariablesValueToExpressions,
	type CompanionMigrationAction,
	type CompanionStaticUpgradeProps,
	type CompanionStaticUpgradeResult,
	type CompanionStaticUpgradeScript,
	type CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'
import { ActionId } from './actions.js'

/**
 * Options that were textinputs taking numbers before the API 2.x migration. They are number fields since. Frozen
 * history for UpgradeScripts[0]: do not edit to track later changes, add a new script instead.
 *
 * Custom Message's `message` is text, and is left alone: only Read Message's and Read & Update Message's are numbers.
 */
export const numericActionOptionsApi2: Partial<Record<ActionId, string[]>> = {
	[ActionId.ReadMessage]: ['message'],
	[ActionId.ReadUpdateMessage]: ['message'],
	[ActionId.TemplateDataMessage]: ['templateDataMessage', 'lyricMessageNumber'],
	[ActionId.UpdateTemplateData]: ['templateDataMessage', 'templateNumber'],
	[ActionId.UpdateCurrentTemplateData]: ['templateDataMessage', 'templateNumber'],
}

/**
 * Converts the listed options in place. Returns whether anything changed — the helper always hands back a fresh object,
 * so compare contents rather than identity, or every untouched action would be reported as updated.
 */
function fixupOptions(action: CompanionMigrationAction, keys: string[] | undefined): boolean {
	if (!keys) return false
	let changed = false
	for (const key of keys) {
		const current = action.options[key]
		const fixed = FixupNumericOrVariablesValueToExpressions(current)
		if (fixed?.isExpression !== current?.isExpression || fixed?.value !== current?.value) {
			action.options[key] = fixed
			changed = true
		}
	}
	return changed
}

/** The port as a number, where a textinput saved it as a string. Anything else is left for validPort to reject */
function numericPort(port: unknown): unknown {
	if (typeof port !== 'string' || !/^\d+$/.test(port.trim())) return port
	return Number(port.trim())
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */

	// 0: API 2.x — the message and template numbers became number fields, and so did the port in the config.
	// "0012" becomes 12, "$(local:x)" becomes an expression, anything else with a variable is wrapped in parseVariables().
	function api2(
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig, undefined>,
	): CompanionStaticUpgradeResult<ModuleConfig, undefined> {
		let updatedConfig: ModuleConfig | null = null
		if (props.config !== null) {
			const port = numericPort(props.config.port)
			if (port !== props.config.port) updatedConfig = { ...props.config, port: port as number }
		}
		return {
			updatedConfig,
			updatedActions: props.actions.filter((action) =>
				fixupOptions(action, numericActionOptionsApi2[action.actionId as ActionId]),
			),
			updatedFeedbacks: [],
		}
	},
]
