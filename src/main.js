import { InstanceBase, Regex, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdateVariableDefinitions } from './variables.js'
import * as config from './config.js'
import * as tcp from './tcp.js'

class IntelligentInterface extends InstanceBase {
	constructor(internal) {
		super(internal)
		Object.assign(this, { ...config, ...tcp })
	}

	async init(config) {
		this.configUpdated(config)
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', `destroy ${this.id}`)
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

runEntrypoint(IntelligentInterface, UpgradeScripts)
