import { keep_alive_timeout } from './consts.js'

export function startKeepAlive() {
	if (this.keepAliveTimer) {
		clearTimeout(this.keepAliveTimer)
	}
	this.keepAliveTimer = setTimeout(() => {
		this.keepAlive()
	}, keep_alive_timeout)
}

export function stopKeepAlive() {
	if (this.keepAliveTimer) {
		clearTimeout(this.keepAliveTimer)
		delete this.keepAliveTimer
	}
}

export function keepAlive() {
	this.sendCommand(this.config.keepAlive)
}
