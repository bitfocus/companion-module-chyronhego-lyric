import { errorCodes, loginMsg, msgSuccess } from './consts.js'
import { InstanceStatus } from '@companion-module/base'

export function parseResponse(msg) {
	if (msg === msgSuccess) {
		this.updateStatus(InstanceStatus.Ok)
		if (this.config.verbose) {
			this.log('debug', `Message Success: ${msg}`)
		}
		return true
	}
	if (msg.startsWith(loginMsg.welcome)) {
		this.updateStatus(InstanceStatus.Ok, 'Connected')
		if (this.config.verbose) {
			this.log('info', `Logged In: ${msg}`)
		}
		return true
	}
	if (msg.search(loginMsg.inUse) >= 0) {
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Port In Use')
		if (this.config.verbose) {
			this.log('warn', `Port In Use: ${msg}`)
		}
		return false
	}
	for (error of errorCodes) {
		if (msg === error.code) {
			this.log('warn', `Error returned: ${error.code}: ${error.label}`)
			this.updateStatus(error.status, error.label)
			return undefined
		}
	}
	this.updateStatus(InstanceStatus.UnknownWarning, 'Unexpected Response')
	this.log('warn', `Unexpected Response: ${msg}`)
	return undefined
}
