import { setTimeout as sleep } from 'node:timers/promises'
import { InstanceStatus } from '@companion-module/base'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LyricInstance from '../main.js'
import type { ModuleConfig } from '../config.js'
import type { ConnectionTiming } from '../connection.js'
import { closedPort, FakeLyric, IN_USE, WELCOME } from './fakeLyric.js'
import { createContext } from './hostContext.js'

/** Long enough that no keep alive is sent unless a test shortens it */
const TIMING: ConnectionTiming = { messageInterval: 2, keepAliveInterval: 60_000, reconnectInterval: 40 }

const KEEP_ALIVE = 'W\\1002\\6001\\Pinging\\Chyron'

let lyric: FakeLyric
const instances: LyricInstance[] = []

beforeEach(async () => {
	lyric = new FakeLyric()
	await lyric.listen()
})

afterEach(async () => {
	for (const instance of instances.splice(0)) await instance.destroy()
	await lyric.close()
})

function createInstance(timing: Partial<ConnectionTiming> = TIMING) {
	const context = createContext()
	const instance = new LyricInstance(context)
	instance.timing = timing
	const log = vi.spyOn(instance, 'log').mockImplementation(() => {})
	instances.push(instance)
	return { instance, context, log }
}

function config(overrides: Partial<ModuleConfig> = {}): ModuleConfig {
	return { host: '127.0.0.1', port: lyric.port, keepAlive: KEEP_ALIVE, verbose: false, ...overrides }
}

/** Waits for Lyric's welcome */
async function started(overrides: Partial<ModuleConfig> = {}, timing?: Partial<ConnectionTiming>) {
	const created = createInstance(timing)
	await created.instance.init(config(overrides))
	await vi.waitFor(() => expect(created.context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, 'Connected'))
	return created
}

describe('connecting', () => {
	it("shows Lyric's welcome as connected", async () => {
		const { context, log } = await started()
		expect(context.updateStatus.mock.calls).toEqual([
			[InstanceStatus.Connecting, `Connecting to Lyric: 127.0.0.1:${lyric.port}`],
			[InstanceStatus.Ok, null],
			[InstanceStatus.Ok, 'Connected'],
		])
		expect(log).toHaveBeenCalledWith('info', `Logged In: ${WELCOME}`)
	})

	it('reports the port already in use by another client', async () => {
		lyric.greeting = IN_USE
		const { instance, context, log } = createInstance()
		await instance.init(config())
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.ConnectionFailure, 'Port In Use'),
		)
		expect(log).toHaveBeenCalledWith('warn', `Port Already In Use: ${IN_USE}`)
	})

	it('reports a missing host or an unusable port as bad config, without connecting', async () => {
		const { instance, context } = createInstance()
		await instance.init(config({ host: '  ' }))
		expect(context.updateStatus).toHaveBeenLastCalledWith(
			InstanceStatus.BadConfig,
			'Invalid host () or port (' + lyric.port + ')',
		)
		await instance.configUpdated(config({ port: '23' as unknown as number }))
		expect(context.updateStatus).toHaveBeenLastCalledWith(
			InstanceStatus.BadConfig,
			'Invalid host (127.0.0.1) or port (23)',
		)
		await sleep(50)
		expect(lyric.connections).toBe(0)
		await expect(instance.sendCommand('E\\x')).rejects.toThrow('Not connected')
	})

	it('reports Lyric unreachable, and rejects commands meanwhile', async () => {
		const { instance, context } = createInstance()
		await instance.init(config({ port: await closedPort() }))
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.ConnectionFailure, expect.any(String)),
		)
		await expect(instance.sendCommand('E\\x')).rejects.toThrow('Not connected to Lyric')
	})

	it('logs only the first failure of an outage at error level', async () => {
		const { instance, log } = createInstance()
		// Verbose, so the retries can be seen logged at debug level
		await instance.init(config({ port: await closedPort(), verbose: true }))
		const failures = () => log.mock.calls.filter(([, message]) => message.startsWith('Network error'))
		await vi.waitFor(() => expect(failures().length).toBeGreaterThan(2))
		expect(failures().map(([level]) => level)).toEqual([
			'error',
			...failures()
				.slice(1)
				.map(() => 'debug'),
		])
	})

	it('connects again after Lyric closes the connection', async () => {
		const { context } = await started()
		context.updateStatus.mockClear()
		lyric.dropConnections()
		await vi.waitFor(() => expect(lyric.connections).toBe(2))
		await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, 'Connected'))
		expect(context.updateStatus).toHaveBeenCalledWith(InstanceStatus.Disconnected, 'Connection closed by Lyric')
	})
})

describe('sending', () => {
	it('ends each command with \\\\ and a line ending, spaced by the message interval', async () => {
		const { instance } = await started({}, { ...TIMING, messageInterval: 20 })
		await Promise.all([instance.sendCommand('E\\a'), instance.sendCommand('E\\b'), instance.sendCommand('E\\c')])
		// A send resolves once written to the socket, which may be before Lyric has it
		await vi.waitFor(() => expect(lyric.commands()).toEqual(['E\\a', 'E\\b', 'E\\c']))
		const arrivals = lyric.received.map((r) => r.at)
		for (let i = 1; i < arrivals.length; i++) expect(arrivals[i] - arrivals[i - 1]).toBeGreaterThanOrEqual(15)
	})

	it('drops commands still queued when the config changes, at once, and connects with the new config', async () => {
		const { instance, context } = await started({}, { ...TIMING, messageInterval: 100 })
		const second = new FakeLyric()
		await second.listen()
		try {
			const sends = Array.from({ length: 5 }, async (_, i) => instance.sendCommand(`E\\${i}`))
			const changed = performance.now()
			await instance.configUpdated(config({ port: second.port }))
			const results = await Promise.allSettled(sends)
			expect(results.filter((r) => r.status === 'rejected').length).toBeGreaterThanOrEqual(4)
			// Rather than each waiting its turn in the old queue, a message interval apart, to find the socket gone
			expect(performance.now() - changed).toBeLessThan(80)
			await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, 'Connected'))
			await instance.sendCommand('E\\new')
			await vi.waitFor(() => expect(second.commands()).toEqual(['E\\new']))
			expect(lyric.commands()).not.toContain('E\\new')
		} finally {
			await instance.destroy()
			await second.close()
		}
	})

	it('drops a command whose action signal aborts before its turn', async () => {
		const { instance } = await started({}, { ...TIMING, messageInterval: 50 })
		const controller = new AbortController()
		const filler = Array.from({ length: 3 }, async () => instance.sendCommand('E\\filler'))
		const call = instance.sendCommand('E\\aborted', controller.signal)
		controller.abort()
		await expect(call).rejects.toThrow()
		await Promise.all(filler)
		await sleep(100)
		expect(lyric.commands()).not.toContain('E\\aborted')
	})
})

describe('keep alive', () => {
	it('is sent once nothing has been sent for the interval', async () => {
		await started({ keepAlive: 'W\\1\\2\\ping' }, { ...TIMING, keepAliveInterval: 100 })
		await vi.waitFor(() => expect(lyric.commands()).toContain('W\\1\\2\\ping'), { timeout: 1000 })
	})

	it('waits again after every command sent', async () => {
		const { instance } = await started({}, { ...TIMING, keepAliveInterval: 150 })
		const until = performance.now() + 400
		while (performance.now() < until) {
			await instance.sendCommand('E\\busy')
			await sleep(50)
		}
		expect(lyric.commands()).not.toContain(KEEP_ALIVE)
		await vi.waitFor(() => expect(lyric.commands()).toContain(KEEP_ALIVE), { timeout: 1000 })
	})

	it('sends the default for a config saved without one', async () => {
		await started({ keepAlive: undefined as unknown as string }, { ...TIMING, keepAliveInterval: 100 })
		await vi.waitFor(() => expect(lyric.commands()).toContain(KEEP_ALIVE), { timeout: 1000 })
	})
})

describe('replies', () => {
	it('show the errors Lyric returns, and a success clears them', async () => {
		const { context, log } = await started()
		lyric.broadcast('412c')
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(
				InstanceStatus.UnknownWarning,
				'Requested message file does not exist',
			),
		)
		expect(log).toHaveBeenCalledWith('warn', 'Error returned: 412c: Requested message file does not exist')

		lyric.broadcast('V\\5\\1')
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.UnknownError, 'Task timed out'),
		)
		expect(log).toHaveBeenCalledWith('error', 'Error returned: V\\5\\1: Task timed out')

		lyric.broadcast('*')
		await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, null))
	})

	it('warn of a reply the module does not know', async () => {
		const { context, log } = await started()
		lyric.broadcast('hello')
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.UnknownWarning, 'Unexpected Response'),
		)
		expect(log).toHaveBeenCalledWith('warn', 'Unexpected Response: hello')
	})

	it('are put back together when split across packets', async () => {
		const { context } = await started()
		lyric.write('41')
		await sleep(20)
		lyric.write('d5\r')
		await sleep(20)
		lyric.write('\n')
		await vi.waitFor(() =>
			expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.UnknownWarning, 'Missing Macro'),
		)
	})

	it('update the status only when it changes', async () => {
		const { instance, context } = await started()
		await instance.sendCommand('E\\a')
		await vi.waitFor(() => expect(context.updateStatus).toHaveBeenLastCalledWith(InstanceStatus.Ok, null))
		const calls = context.updateStatus.mock.calls.length
		await instance.sendCommand('E\\b')
		await instance.sendCommand('E\\c')
		await sleep(50)
		expect(context.updateStatus).toHaveBeenCalledTimes(calls)
	})
})

describe('logging', () => {
	it('writes debug messages only with Verbose Logging on', async () => {
		const quiet = await started()
		await quiet.instance.sendCommand('E\\a')
		await sleep(50)
		expect(quiet.log.mock.calls.filter(([level]) => level === 'debug')).toEqual([])

		const verbose = await started({ verbose: true })
		await verbose.instance.sendCommand('E\\a')
		await vi.waitFor(() => expect(verbose.log).toHaveBeenCalledWith('debug', 'Message Success: *'))
		expect(verbose.log).toHaveBeenCalledWith('debug', 'Sending message: E\\a')
	})
})
