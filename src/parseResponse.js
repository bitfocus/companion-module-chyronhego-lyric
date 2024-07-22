import { errorCodes, loginMsg, msgSuccess } from './consts'
import { InstanceStatus } from '@companion-module/base'

export function parseResponse(msg) {
	if (msg === msgSuccess) {
		this.updateStatus(InstanceStatus.Ok)
		this.log('debug', 'Message Success')
		return true
	}
	if (msg.startsWith(loginMsg.welcome)) {
		this.updateStatus(InstanceStatus.Ok, 'Connected')
		this.log('info', msg)
		return true
	}
	if (msg.search(loginMsg.inUse) >= 0) {
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Port In Use')
		this.log('warn', msg)
		return false
	}
	for (error of errorCodes) {
		if (msg === error.code) {
			this.log('warn', `Error returned: ${error.label}`)
			this.updateStatus(InstanceStatus.UnknownWarning, error.label)
			return undefined
		}
	}
	this.updateStatus(InstanceStatus.UnknownWarning, 'Unexpected Response')
	this.log('warn', `Unexpected Response: ${msg}`)
	return undefined
}
