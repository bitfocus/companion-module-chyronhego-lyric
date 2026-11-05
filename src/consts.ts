/** Ends every line, in both directions */
export const EOL = '\r\n'

/** Intelligent Interface command codes and delimiters */
export const cmd = {
	ping: 'W\\1002\\6001\\Pinging\\Chyron',
	changeColor: 'C',
	macro: 'E',
	changeFont: 'F',
	setDriveAndMessageDirectory: 'M',
	resendPrevious: 'Q',
	updateTabDataField: 'U',
	updateCurrentTemplate: 'U\\*',
	control: 'V',
	read: 'V\\5\\3\\1\\',
	readUpdateIntelligentInterface: 'V\\5\\13\\1\\',
	readUpdateExternalControl: 'V\\5\\14\\1\\',
	writeTabData: 'W',
	requestExternalUpdate: 'X', //Also R
	assorted: 'Y', //!!!
	/** Ends every command, before the {@link EOL} */
	eom: '\\\\',
	sep: '\\',
} as const

/** What Lyric sends when a connection opens */
export const loginMsg = {
	welcome: 'Welcome to the ChyronHego Intelligent Interface Telnet Server on',
	inUse: 'already in use',
} as const

/** Starts Lyric's reply to a command it carried out */
export const msgSuccess = '*'
