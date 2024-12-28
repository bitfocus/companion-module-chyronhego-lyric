import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import * as config from './config.js'
import * as keepAlive from './keepalive.js'
import * as response from './parseResponse.js'
import * as tcp from './tcp.js'
import PQueue from 'p-queue'

class Chyron_Lyric extends InstanceBase {
	constructor(internal) {
		super(internal)
		Object.assign(this, { ...config, ...keepAlive, ...response, ...tcp })
		this.clearToTx = true
		this.queue = new PQueue({ concurrency: 1, interval: 20, intervalCap: 1 })
		this.currentStatus = { status: InstanceStatus.Disconnected, message: '' }
	}

	async init(config) {
		this.configUpdated(config)
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', `destroy ${this.id}`)
		this.stopKeepAlive()
		this.queue.clear()
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}
	}

	async configUpdated(config) {
		this.queue.clear()
		this.config = config
		this.checkStatus(InstanceStatus.Connecting)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.initTCP(this.config.host, this.config.port)
	}
	checkStatus(status = InstanceStatus.Disconnected, message = '') {
		if (status === this.currentStatus.status && message === this.currentStatus.message) return false
		this.updateStatus(status, message.toString())
		this.currentStatus.status = status
		this.currentStatus.message = message
		return true
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(Chyron_Lyric, UpgradeScripts)
