import type {
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldStaticText,
	CompanionInputFieldTextInput,
	DropdownChoice,
} from '@companion-module/base'
import { cmd } from './consts.js'

/**
 * The largest message or template number the module sends. Lyric's own limit isn't documented, so this only rejects
 * what can't be one.
 */
export const NUMBER_MAX = 2_147_483_647

export const BUFFERS = [
	{ id: '0', label: 'VGA' },
	{ id: '1', label: 'Frame Buffer 1' },
	{ id: '2', label: 'Frame Buffer 2' },
] as const satisfies DropdownChoice<string>[]
export type BufferId = (typeof BUFFERS)[number]['id']

export const DISPLAY_MODES = [
	{ id: '0', label: 'Read Next (Prebuild)' },
	{ id: '1', label: 'Read & Display' },
] as const satisfies DropdownChoice<string>[]
export type DisplayMode = (typeof DISPLAY_MODES)[number]['id']

/** The ids are the start of the command, so are saved against every button using them */
export const READ_UPDATE_MODES = [
	{ id: cmd.readUpdateIntelligentInterface, label: 'Read & Update All Intelligent Interface Fields' },
	{ id: cmd.readUpdateExternalControl, label: 'Read & Update External Update Fields' },
] as const satisfies DropdownChoice<string>[]
export type ReadUpdateMode = (typeof READ_UPDATE_MODES)[number]['id']

/** A number Lyric takes: a message, a Template Data Message or a template field */
function numberField<TKey extends string>(
	id: TKey,
	label: string,
	defaultValue: number,
	tooltip?: string,
): CompanionInputFieldNumber<TKey> {
	return { type: 'number', id, label, default: defaultValue, min: 0, max: NUMBER_MAX, asInteger: true, tooltip }
}

export const macro: CompanionInputFieldTextInput<'macro'> = {
	type: 'textinput',
	id: 'macro',
	label: 'Macro',
	default: '',
	useVariables: true,
	minLength: 1,
	tooltip: `Any VB Script command that can be executed via Lyric Macros may be contained in an E command.  Each command is separated by a "tilde" (~) character.`,
}

export const macroInfo: CompanionInputFieldStaticText = {
	type: 'static-text',
	id: 'info',
	label: 'Note the following about building macro subroutines using Intelligent Interface:',
	value: `The name of the macro subroutine that is built via Intelligent Interface cannot duplicate the name of any of the macros currently loaded in the Macros dialog box.  If there is a duplication, Intelligent Interface returns a 000041d7 (Duplicate Macro) error code. See below for A macro subroutine that is built via Intelligent Interface is not loaded into the Macros dialog box, and therefore does not appear in the dialog box. A macro subroutine that is successfully sent to Lyric can be overwritten, i.e., subsequent macros that are sent can have the same name.  The name restriction applies only to macros that are listed in the Macro dialog box. Additionally, if the macro engine is reset, the script must be resent. The E command can also trigger a loaded macro by executing its Hot Key.  Suppose that a macro script in Lyric is assigned the hot key trigger Alt + 3, meaning that it executes when Alt + 3 is pressed.  The following example uses a VB Script command to set up a shell object that passes commands to the Windows command interpreter.  A second VB Script command then sends the key combination Alt + 3, specified in VB Script as %3, triggering the macro script.E\\set WshShell = CreateObject ("WScript.Shell")~WshShell.SendKeys("%3")\\\\<CR><LF>`,
}

export const readBuffer: CompanionInputFieldDropdown<'buffer'> = {
	type: 'dropdown',
	id: 'buffer',
	label: 'Buffer',
	choices: BUFFERS,
	default: BUFFERS[1].id,
	tooltip: 'Specifies destination of the message',
}

export const readMessage = numberField('message', 'Lyric Message Number', 1)

export const readDisplayMode: CompanionInputFieldDropdown<'mode'> = {
	type: 'dropdown',
	id: 'mode',
	label: 'Display Mode',
	choices: DISPLAY_MODES,
	default: DISPLAY_MODES[1].id,
}

export const readUpdate: CompanionInputFieldDropdown<'update'> = {
	type: 'dropdown',
	id: 'update',
	label: 'Update Mode',
	choices: READ_UPDATE_MODES,
	default: READ_UPDATE_MODES[0].id,
}

export const customMessage: CompanionInputFieldTextInput<'message'> = {
	type: 'textinput',
	id: 'message',
	label: 'Custom Message',
	default: '',
	useVariables: true,
	minLength: 1,
	tooltip: `Send custom message. Module will append \\\\\\r\\n to the end.`,
}

export const templateDataMessage = numberField('templateDataMessage', 'Template Data Message', 5501)

export const lyricMessage = numberField('lyricMessageNumber', 'Lyric Message Number', 5500)

/**
 * No minLength, unlike the other text fields: the module has always sent template data as given, empty included, and
 * Companion skips an action whose text is shorter than its field's minLength.
 */
export const templateData: CompanionInputFieldTextInput<'templates'> = {
	type: 'textinput',
	id: 'templates',
	label: 'Template Data',
	default: '',
	useVariables: true,
	tooltip: 'Can include multiple template fields separated by \\',
}

/** No minLength, as {@link templateData} */
export const templateDataSingle: CompanionInputFieldTextInput<'templatesData'> = {
	type: 'textinput',
	id: 'templatesData',
	label: 'Template Data',
	default: '',
	useVariables: true,
	tooltip: 'Data that is to be fed to specified Template',
}

export const templateNumber = numberField(
	'templateNumber',
	'Template Number',
	1,
	`The number that should be cited here is the field's specific identifying number as set in the Number control, and NOT a value representing the order in which the field was created. In other words, a command for Field 7 should cite "7" and not the value "2", which specifies the order in which the fields were created.`,
)

export const templateInfo: CompanionInputFieldStaticText = {
	type: 'static-text',
	id: 'info',
	label: 'The following should be noted regarding W commands:',
	value: `A single-space update within a W command skips a 2D Text Template if and only if Auto-Erase is not enabled in the 2D Text Template dialog box.  The 2D Text Template dialog box is accessed by right-clicking on a 2D Text Template, then selecting Template Properties from the context-sensitive menu. A null update (\\\\) within a W command skips a 2D Text Template, regardless of Auto-Erase setting. If a W command attempts to overwrite a read-only file, an error is returned. When a Template Data Message created using the W command is read, Lyric displays the Message Number of the Template Description Message on the Canvas Title Bar. A Template Data Message can also be created by selectively recording (Ctrl + Record + D) the message from Lyric.`,
}

export const updateTemplateInfo: CompanionInputFieldStaticText = {
	type: 'static-text',
	id: 'info',
	label: 'Note:',
	value: `The U command is used to update Template data of a single Template in a preexisting Template Data Message.`,
}

export const updateCurrentTemplateInfo: CompanionInputFieldStaticText = {
	type: 'static-text',
	id: 'info',
	label: 'Note:',
	value: `Although the Lyric interface allows the operator to assign the same value to multiple templates using the Number control, this should be avoided. Assigning the same numerical designation to multiple templates will cause the U/* command not to work correctly. This condition may occur due to manual alteration of field numbers or Lyric numbering new fields following manual deletion and subsequent addition of template fields.`,
}

export const messagePath: CompanionInputFieldTextInput<'msgPath'> = {
	type: 'textinput',
	id: 'msgPath',
	label: 'Message Directory',
	default: 'C:\\Data\\Messages',
	useVariables: true,
	minLength: 1,
	tooltip:
		'If a colon ( : ) is to be used in the file path information, you may use back slashes ( \\ ), but if using forward slashes ( / ), do not include a colon with the drive letter. ',
}
