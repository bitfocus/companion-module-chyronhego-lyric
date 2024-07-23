import { cmd, errorCodes, loginMsg, msgSuccess } from './consts.js'
import { InstanceStatus } from '@companion-module/base'

export function parseResponse(msg) {
	if (msg.startsWith(msgSuccess)) {
		this.updateStatus(InstanceStatus.Ok)
		if (this.config.verbose) {
			this.log('debug', `Message Success: ${msg}`)
		}
		return true
	}
	if (msg.startsWith(loginMsg.welcome)) {
		this.updateStatus(InstanceStatus.Ok, 'Connected')
		this.log('info', `Logged In: ${msg}`)
		return true
	}
	if (msg.search(loginMsg.inUse) >= 0) {
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Port In Use')
		this.log('warn', `Port Already In Use: ${msg}`)
		return false
	}
	const errorMsg = msg.toUpperCase().padStart(8, cmd.pad)
	for (const error of errorCodes) {
		if (errorMsg === error.code) {
			this.log('warn', `Error returned: ${error.code}: ${error.label}`)
			this.updateStatus(error.status, error.label)
			return undefined
		}
	}
	if (msg.startsWith(cmd.control)) {
		let response = msg.split(cmd.sep)
		try {
			const errorMsg = response[2].toUpperCase().padStart(8, cmd.pad)
			for (const error of errorCodes) {
				if (errorMsg === error.code) {
					this.log('warn', `Error returned: ${msg}: ${error.label}`)
					this.updateStatus(error.status, error.label)
					return undefined
				}
			}
		} catch {
			//this.log('debug', 'V error message: unexpected array length')
		}
	}
	if (msg !== '' && msg !== ' ') {
		this.updateStatus(InstanceStatus.UnknownWarning, 'Unexpected Response')
		this.log('warn', `Unexpected Response: ${msg}`)
		return undefined
	}
}
