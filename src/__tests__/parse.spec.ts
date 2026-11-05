import { InstanceStatus } from '@companion-module/base'
import { describe, expect, it } from 'vitest'
import { ERROR_CODES, findError } from '../errors.js'
import { parseReply } from '../parse.js'

// The replies below are synthetic: no capture from Lyric was available. They follow the reply forms the module was
// written against, from the Intelligent Interface documentation.

describe('parseReply', () => {
	it('recognises a success, the welcome, and a port in use', () => {
		expect(parseReply('*')).toEqual({ type: 'success' })
		expect(parseReply('*W\\5501')).toEqual({ type: 'success' })
		expect(parseReply('Welcome to the ChyronHego Intelligent Interface Telnet Server on LYRIC-PC')).toEqual({
			type: 'welcome',
		})
		expect(parseReply('Port 23 already in use')).toEqual({ type: 'inUse' })
	})

	it('finds an error code sent on its own, in any case and without its leading zeros', () => {
		for (const line of ['0000412C', '412c', '412C']) {
			expect(parseReply(line)).toEqual({ type: 'error', error: findError('0000412C') })
		}
		expect(parseReply('412c')).toMatchObject({ error: { label: 'Requested message file does not exist' } })
	})

	it('finds the error code in the third field of a V message', () => {
		expect(parseReply('V\\5\\41d5')).toMatchObject({
			type: 'error',
			error: { code: '000041D5', label: 'Missing Macro' },
		})
		expect(parseReply('V\\5\\12345678')).toEqual({ type: 'unknownControl' })
		expect(parseReply('V\\5')).toEqual({ type: 'malformedControl', fields: 2 })
	})

	it('ignores blank lines, and calls anything else unknown', () => {
		expect(parseReply('')).toEqual({ type: 'blank' })
		expect(parseReply(' ')).toEqual({ type: 'blank' })
		expect(parseReply('hello')).toEqual({ type: 'unknown' })
	})
})

describe('error codes', () => {
	it('are eight upper case hex digits, each listed once', () => {
		for (const { code } of ERROR_CODES) expect(code).toMatch(/^[0-9A-F]{8}$/)
		expect(new Set(ERROR_CODES.map((e) => e.code)).size).toBe(ERROR_CODES.length)
	})

	it('each log at the level their status calls for', () => {
		for (const error of ERROR_CODES) {
			expect(error.level, error.code).toBe(error.status === InstanceStatus.UnknownError ? 'error' : 'warn')
		}
		// 1.x listed this one without a level, so logged it at undefined
		expect(findError('7200')).toMatchObject({ status: InstanceStatus.UnknownWarning, level: 'warn' })
	})
})
