import { MarkdownView, Notice, Plugin, App, PluginSettingTab, Setting } from 'obsidian';
import { rawFormatter, scientificFormatter, ABCFormatter } from "./formatters";

enum ExportType {
	RawMessage = 'raw',
	Scientific = 'scientific',
	ABC = 'abc',
}

interface MIDILoggerSettings {
	exportType: ExportType;
	separator: string;
}

const DEFAULT_SETTINGS: MIDILoggerSettings = {
	exportType: ExportType.Scientific,
	separator: ',',
};

export default class MIDILogger extends Plugin {
	settings: MIDILoggerSettings;
	enabled: boolean = false;
	mainStatusBar: HTMLElement;
	midiAccess: WebMidi.MIDIAccess;

	writeNoteToEditor(note: number) {
		let noteString = '<UNKNOWN_FORMAT>';
		switch (this.settings.exportType) {
			case ExportType.RawMessage:
				noteString = rawFormatter.format(note, this.settings.separator);
				break;
			case ExportType.Scientific:
				noteString = scientificFormatter.format(note, this.settings.separator);
				break;
			case ExportType.ABC:
				noteString = ABCFormatter.format(note, this.settings.separator);
				break;
		}

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			const cursor = view.editor.getCursor();
			view.editor.replaceRange(noteString, cursor);
			view.editor.setCursor(cursor.line, cursor.ch + noteString.length);
		}
	}

	async enable() {
		try {
			this.midiAccess = await navigator.requestMIDIAccess();
			const inputs = this.midiAccess.inputs.values();
			for (let input of inputs) {
				input.onmidimessage = (msg) => {
					const [status, data1, data2] = msg.data;
					const command = status >> 4;
					const channel = status & 0xf;
	
					if (command === 0x9 && channel === 0) {
						const note = data1;
						const velocity = data2;
						if (velocity > 0) {
							this.writeNoteToEditor(note);
						}
					}
				};
			}
			new Notice('MIDI Logger is active');
			this.mainStatusBar.setText('MIDI Logger is active');
			this.enabled = true;
		} catch (error) {
			new Notice('Cannot open MIDI input port!');
		}
	}

	disable() {
		if (this.midiAccess) {
			const inputs = this.midiAccess.inputs.values();
			for (let input of inputs) {
				input.close();
			}
		}
		new Notice('MIDI Logger is inactive');
		this.mainStatusBar.setText('');
		this.enabled = false;
	}

	async onload() {
		await this.loadSettings();

		this.mainStatusBar = this.addStatusBarItem();

		this.addRibbonIcon('music', 'MIDI Logger', (evt: MouseEvent) => {
			if (this.enabled) {
				this.disable();
			} else {
				this.enable();
			}
		});

		this.addCommand({
			id: "enable",
			name: "Enable MIDI Logger",
			checkCallback: (checking: boolean) => {
				if (!this.enabled) {
					if (!checking) {
						this.enable();
					}
					return true
				}
				return false;
			},
		  });

		this.addCommand({
			id: "disable",
			name: "Disable MIDI Logger",
			checkCallback: (checking: boolean) => {
				if (this.enabled) {
					if (!checking) {
						this.disable();
					}
					return true
				}
				return false;
			},
		  });

		  this.addSettingTab(new MIDILoggerSettingTab(this.app, this));
	}

	onunload() {
		if (this.enabled) {
			this.disable();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MIDILoggerSettingTab extends PluginSettingTab {
	plugin: MIDILogger;

	constructor(app: App, plugin: MIDILogger) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Output format')
			.setDesc('Choose the format of the MIDI note to be written to the editor')
			.addDropdown(dropdown => dropdown
				.addOptions({
					[ExportType.RawMessage]: 'Raw message',
					[ExportType.Scientific]: 'Scientific',
					[ExportType.ABC]: 'ABC',
				})
				.setValue(this.plugin.settings.exportType)
				.onChange(async (value) => {
					this.plugin.settings.exportType = value as ExportType;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Separator')
			.setDesc('Separator between notes (only for raw and scientific formats)')
			.addText(text => text
				.setValue(this.plugin.settings.separator)
				.onChange(async (value) => {
					this.plugin.settings.separator = value;
					await this.plugin.saveSettings();
				}));
	}
}