import type { DropdownChoice } from '@companion-module/base'

/**
 * Marks a branch the type system believes is unreachable, and supplies the value to use if it is reached anyway.
 * Leaving a union member unhandled above becomes a compile error here.
 *
 * It falls back rather than throwing: option values are restored from a saved configuration, so one that this version
 * no longer offers is still possible at runtime.
 */
export function unhandledOption<TFallback>(_value: never, fallback: TFallback): TFallback {
	return fallback
}

/** The message of anything thrown, which need not be an Error */
export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err)
}

/**
 * An option's value, checked against its choices. Companion checks a dropdown's value before running the action, but a
 * module can't rely on that for values saved by an older version.
 * @throws if the value is not one of the choices
 */
export function choiceValue<TId extends string>(
	choices: readonly DropdownChoice<TId>[],
	value: unknown,
	label: string,
): TId {
	const choice = choices.find((c) => c.id === value)
	if (choice === undefined) throw new Error(`${label} ${String(value)} is not valid`)
	return choice.id
}

/**
 * A number option's value, checked to be a whole number in range
 * @throws if it is not
 */
export function wholeNumber(value: unknown, min: number, max: number, label: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
		throw new Error(`${label} ${String(value)} is not valid`)
	}
	return value
}
