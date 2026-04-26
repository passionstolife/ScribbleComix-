// Lightweight procedural ambient music using Web Audio API.
// 6 mood presets; zero external files; ~1% CPU.
// Each engine returns { start, stop, setVolume }.

const MOOD_PRESETS = {
    adventure: {
        label: "Adventure",
        emoji: "🗺️",
        baseFreq: 220,
        chord: [0, 4, 7, 12],
        tempo: 110,
        waveform: "triangle",
        filter: 1400,
        reverb: 0.35,
    },
    funny: {
        label: "Funny",
        emoji: "🤡",
        baseFreq: 330,
        chord: [0, 4, 7, 9],
        tempo: 135,
        waveform: "square",
        filter: 2200,
        reverb: 0.15,
    },
    sad: {
        label: "Sad",
        emoji: "🌧️",
        baseFreq: 196,
        chord: [0, 3, 7, 10],
        tempo: 70,
        waveform: "sine",
        filter: 900,
        reverb: 0.55,
    },
    spooky: {
        label: "Spooky",
        emoji: "👻",
        baseFreq: 146,
        chord: [0, 3, 6, 10],
        tempo: 60,
        waveform: "sawtooth",
        filter: 700,
        reverb: 0.65,
    },
    heroic: {
        label: "Heroic",
        emoji: "⚔️",
        baseFreq: 174,
        chord: [0, 4, 7, 11],
        tempo: 100,
        waveform: "triangle",
        filter: 1800,
        reverb: 0.30,
    },
    chill: {
        label: "Chill",
        emoji: "🌊",
        baseFreq: 261,
        chord: [0, 4, 7, 14],
        tempo: 80,
        waveform: "sine",
        filter: 1100,
        reverb: 0.50,
    },
};

export const MOODS = Object.entries(MOOD_PRESETS).map(([k, v]) => ({
    key: k,
    label: v.label,
    emoji: v.emoji,
}));

export const createAmbientEngine = (moodKey = "adventure") => {
    const preset = MOOD_PRESETS[moodKey] || MOOD_PRESETS.adventure;
    let ctx = null;
    let master = null;
    let filter = null;
    let intervalId = null;
    let oscs = [];
    let started = false;
    let volume = 0.18;

    const midiToFreq = (semitones) => preset.baseFreq * Math.pow(2, semitones / 12);

    const playNote = (semitoneOffset, duration = 1.2, gain = 0.15) => {
        if (!ctx || !master) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = preset.waveform;
        osc.frequency.value = midiToFreq(semitoneOffset);
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(gain, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + duration + 0.05);
        oscs.push(osc);
        // cleanup old references
        if (oscs.length > 40) oscs = oscs.slice(-20);
    };

    const playPad = () => {
        if (!ctx || !master) return;
        const now = ctx.currentTime;
        preset.chord.forEach((n) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = midiToFreq(n - 12); // octave lower
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.04, now + 0.8);
            g.gain.exponentialRampToValueAtTime(0.001, now + 6);
            osc.connect(g);
            g.connect(filter);
            osc.start(now);
            osc.stop(now + 6.2);
            oscs.push(osc);
        });
    };

    let stepCounter = 0;
    const tick = () => {
        if (!ctx) return;
        // arpeggio pattern
        const note = preset.chord[stepCounter % preset.chord.length];
        const accent = stepCounter % 8 === 0 ? 0.22 : 0.12;
        playNote(note, 0.9, accent);
        if (stepCounter % 16 === 0) playPad();
        stepCounter++;
    };

    const start = async () => {
        if (started) return;
        started = true;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        master = ctx.createGain();
        master.gain.value = volume;
        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = preset.filter;
        filter.Q.value = 0.9;
        filter.connect(master);
        master.connect(ctx.destination);
        const interval = (60 / preset.tempo / 2) * 1000; // eighth-note
        playPad();
        intervalId = setInterval(tick, interval);
    };

    const stop = () => {
        started = false;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        if (master) {
            try {
                const now = ctx.currentTime;
                master.gain.cancelScheduledValues(now);
                master.gain.setValueAtTime(master.gain.value, now);
                master.gain.linearRampToValueAtTime(0, now + 0.5);
            } catch (_e) { /* ignore */ }
        }
        setTimeout(() => {
            try { oscs.forEach((o) => { try { o.stop(); } catch (_e) { /* ignore */ } }); } catch (_e) { /* ignore */ }
            oscs = [];
            if (ctx) { try { ctx.close(); } catch (_e) { /* ignore */ } ctx = null; master = null; filter = null; }
        }, 600);
    };

    const setVolume = (v) => {
        volume = Math.max(0, Math.min(1, v));
        if (master && ctx) {
            try {
                master.gain.cancelScheduledValues(ctx.currentTime);
                master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
            } catch (_e) { /* ignore */ }
        }
    };

    return { start, stop, setVolume };
};
