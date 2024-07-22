import { InstanceStatus, TCPHelper } from '@companion-module/base'
import { EOL } from './consts.js'

export function initTCP(host, port) {
	this.log('debug', 'initTCP')
	if (this.socket !== undefined) {
		this.socket.destroy()
		delete this.socket
	}
	if (host !== undefined && !isNaN(port)) {
		this.log('debug', 'Creating New Socket')

		this.updateStatus(`Connecting to lyric: ${host}:${port}`)
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
			this.cmdQueue = []
			this.clearToTx = true
			this.receiveBuffer = Buffer.from('')
			this.queryOnConnect()
			this.clearToTxTimeout()
		})
		this.socket.on('data', (chunk) => {
			//console.log (`Chunk Recieved: ${chunk}`)
			this.clearToTxTimeout()
			let i = 0,
				line = '',
				offset = 0
			this.receiveBuffer += chunk
			while ((i = this.receiveBuffer.indexOf(EOL, offset)) !== -1) {
				line = this.receiveBuffer.substring(offset, i)
				offset = i + 2
				this.processResponse(line.toString())
			}
			this.receiveBuffer = this.receiveBuffer.substring(offset)
		})
	} else {
		this.updateStatus(InstanceStatus.BadConfig)
	}
}