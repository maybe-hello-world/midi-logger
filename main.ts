import { MarkdownView, Notice, Plugin } from 'obsidian';

interface MIDILoggerSettings {}
const DEFAULT_SETTINGS: MIDILoggerSettings = {}

export default class MIDILogger extends Plugin {
	settings: MIDILoggerSettings;
	enabled: boolean = false;
	mainStatusBar: HTMLElement;
	midiAccess: WebMidi.MIDIAccess;

	writeNoteToEditor(note: number) {
		const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
		const noteName = noteNames[note % 12];
		const octave = Math.floor(note / 12) - 1;
		const noteString = `${noteName}${octave},`;

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
