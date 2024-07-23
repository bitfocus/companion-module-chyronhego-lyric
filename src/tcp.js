import { Buffer } from 'node:buffer'
import { InstanceStatus, TCPHelper } from '@companion-module/base'
import { cmd, EOL } from './consts.js'

export function queryOnConnect() {
	if (this.config.verbose) {
		this.log('debug', `queryOnConnect`)
	}
	//function to make initial queries and start message command queue
	this.subscribeActions() //no callbacks at present
	this.subscribeFeedbacks() //no callbacks at present
	this.startKeepAlive()
}

export function sendCommand(msg) {
	if (msg !== undefined) {
		if (this.socket !== undefined && this.socket.isConnected) {
			if (this.config.verbose) {
				this.log('debug', `Sending message: ${msg}`)
			}
			this.socket.send(msg + cmd.eom + EOL)
			this.startKeepAlive()
		} else {
			this.log('warn', `sendCommand: Socket not connected, tried to send: ${msg}`)
		}
	} else {
		this.log('warn', 'sendCommand: Command undefined')
	}
	return undefined
}

export function initTCP(host, port) {
	if (this.config.verbose) {
		this.log('debug', 'initTCP')
	}
	if (this.socket !== undefined) {
		this.stopKeepAlive()
		this.socket.destroy()
		delete this.socket
	}
	if (host !== undefined && !isNaN(port)) {
		if (this.config.verbose) {
			this.log('debug', 'Creating New Socket')
		}
		this.updateStatus(InstanceStatus.Connecting, `Connecting to Lyric: ${host}:${port}`)
		this.socket = new TCPHelper(host, port)

		this.socket.on('status_change', (status, message) => {
			this.updateStatus(status, message)
		})
		this.socket.on('error', (err) => {
			this.log('error', `Network error: ${err.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
			this.cmdQueue = []
		})
		this.socket.on('connect', () => {
			this.log('info', `Connected to ${host}:${port}`)
			this.updateStatus(InstanceStatus.Ok, 'Connected')
			this.receiveBuffer = Buffer.from('')
			this.queryOnConnect()
		})
		this.socket.on('data', (chunk) => {
			let i = 0,
				line = '',
				offset = 0
			this.receiveBuffer += chunk
			while ((i = this.receiveBuffer.indexOf(EOL, offset)) !== -1) {
				line = this.receiveBuffer.substring(offset, i)
				offset = i + 2
				this.parseResponse(line.toString())
			}
			this.receiveBuffer = this.receiveBuffer.substring(offset)
		})
	} else {
		this.updateStatus(InstanceStatus.BadConfig)
	}
}
