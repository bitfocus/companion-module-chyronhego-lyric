import { vi } from 'vitest'
import type {
	CompanionActionCallbackContext,
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionOptionValues,
} from '@companion-module/base'
import type LyricInstance from '../main.js'
import { UpdateActions, type ActionId, type ActionSchema } from '../actions.js'

function createMocks() {
	return {
		sendCommand: vi.fn<LyricInstance['sendCommand']>(async () => {}),
		setActionDefinitions: vi.fn<(defs: CompanionActionDefinitions<ActionSchema>) => void>(),
	}
}

export type FakeInstance = { self: LyricInstance } & ReturnType<typeof createMocks>

/**
 * A plain object standing in for the instance, for the definitions to be built from. Everything that would reach
 * Companion or Lyric is a mock.
 */
export function fakeInstance(): FakeInstance {
	const mocks = createMocks()
	const self = { ...mocks } as unknown as LyricInstance
	return { self, ...mocks }
}

export function actionDefinitions(fake: FakeInstance): CompanionActionDefinitions<ActionSchema> {
	UpdateActions(fake.self)
	return fake.setActionDefinitions.mock.calls[0][0]
}

// The definitions' hooks are typed per action. This takes any options, as the values Companion passes are not checked
type AnyCallback = (event: CompanionActionEvent, context: CompanionActionCallbackContext) => Promise<void> | void

/** Runs an action's callback as Companion would, with the option values already resolved */
export async function runAction(
	defs: CompanionActionDefinitions<ActionSchema>,
	actionId: ActionId,
	options: CompanionOptionValues = {},
	signal = new AbortController().signal,
): Promise<void> {
	const def = defs[actionId]
	if (!def) throw new Error(`${actionId} is not defined`)
	const event: CompanionActionEvent = {
		id: `action-${actionId}`,
		controlId: 'bank-1',
		actionId,
		surfaceId: undefined,
		options,
	}
	await (def.callback as AnyCallback)(event, { type: 'action', signal } as never)
}
