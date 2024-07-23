import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import * as config from './config.js'
import * as keepAlive from './keepalive.js'
import * as response from './parseResponse.js'
import * as tcp from './tcp.js'

class Chyron_Lyric extends InstanceBase {
	constructor(internal) {
		super(internal)
		Object.assign(this, { ...config, ...keepAlive, ...response, ...tcp })
		this.clearToTx = true
	}

	async init(config) {
		this.configUpdated(config)
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', `destroy ${this.id}`)
		this.stopKeepAlive()
		if (this.socket !== undefined) {
			await this.socket.destroy()
			delete this.socket
		}
	}

	async configUpdated(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.initTCP(this.config.host, this.config.port)
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
