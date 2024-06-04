interface IFormatter {
	format(MIDInote: number, separator: string): string;
}

export var rawFormatter: IFormatter = {
	format(MIDInote: number, separator: string): string {
		return `${MIDInote}${separator}`;
	}
}

export var scientificFormatter: IFormatter = {
	format(MIDInote: number, separator: string): string {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteName = noteNames[MIDInote % 12];
		const octave = Math.floor(MIDInote / 12) - 1;
		const noteString = `${noteName}${octave}${separator}`;
		return `${noteString}`;
	}
}

export var ABCFormatter: IFormatter = {
    format(MIDInote: number, _separator: string): string {
        const noteNames = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];
        const noteName = noteNames[MIDInote % 12];
        const octave = Math.floor(MIDInote / 12) - 1;

        if (octave <= 4) {
            let outputText = `${noteName}`;
            for (let i = octave; i < 4; i++) {
                outputText += ',';
            }
            return `${outputText}`;
        } else {
            let outputText = `${noteName.toLowerCase()}`;
            for (let i = octave; i > 5; i--) {
                outputText += "'";
            }
            return `${outputText}`;
        }
    }
}