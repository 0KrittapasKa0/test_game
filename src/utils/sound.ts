import { loadSettings } from './storage';

// Web Audio API based sound system - no external files needed
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function isSoundEnabled(): boolean {
    return loadSettings().soundEnabled;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch {
        // Silently fail if audio not available
    }
}

function playNoise(duration: number, volume = 0.08) {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        // Bandpass filter for card-like sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.Q.setValueAtTime(1, ctx.currentTime);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    } catch {
        // Silently fail
    }
}

/** Play multiple tones simultaneously as a chord */
function playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume = 0.08) {
    frequencies.forEach(freq => playTone(freq, duration, type, volume / frequencies.length));
}

export const SFX = {
    /** UI button click */
    click: () => {
        playTone(800, 0.08, 'sine', 0.1);
    },

    /** Card flip/deal sound */
    cardDeal: () => {
        playNoise(0.1, 0.12);
    },

    /** Card slide */
    cardSlide: () => {
        playNoise(0.06, 0.06);
    },

    /** Chip place on table */
    chipPlace: () => {
        playTone(1200, 0.06, 'sine', 0.08);
        setTimeout(() => playTone(900, 0.04, 'sine', 0.05), 30);
    },

    /** Chip stack clink */
    chipStack: () => {
        playTone(2400, 0.04, 'triangle', 0.06);
        setTimeout(() => playTone(3200, 0.03, 'triangle', 0.04), 20);
        setTimeout(() => playTone(2800, 0.03, 'triangle', 0.03), 45);
    },

    /** Betting confirm */
    betConfirm: () => {
        playTone(523, 0.12, 'sine', 0.12);
        setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 80);
        setTimeout(() => playTone(784, 0.15, 'sine', 0.08), 160);
    },

    /** Win fanfare */
    win: () => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.25, 'sine', 0.12 - i * 0.02), i * 100);
        });
    },

    /** Lose sound */
    lose: () => {
        playTone(330, 0.3, 'sine', 0.1);
        setTimeout(() => playTone(262, 0.4, 'sine', 0.08), 200);
    },

    /** Draw sound */
    draw: () => {
        playTone(440, 0.15, 'triangle', 0.08);
        setTimeout(() => playTone(440, 0.15, 'triangle', 0.06), 150);
    },

    /** Pok! special */
    pok: () => {
        playTone(880, 0.1, 'square', 0.06);
        setTimeout(() => playTone(1175, 0.1, 'square', 0.05), 60);
        setTimeout(() => playTone(1760, 0.15, 'sine', 0.08), 120);
    },

    /** Turn notification */
    yourTurn: () => {
        playTone(660, 0.1, 'sine', 0.1);
        setTimeout(() => playTone(880, 0.15, 'sine', 0.12), 120);
    },

    /** Navigation / screen transition */
    navigate: () => {
        playTone(600, 0.06, 'sine', 0.06);
    },

    /** Error / invalid action */
    error: () => {
        playTone(200, 0.15, 'square', 0.06);
    },

    /** Deal cards start */
    dealStart: () => {
        playTone(440, 0.08, 'triangle', 0.08);
        setTimeout(() => playTone(550, 0.08, 'triangle', 0.06), 60);
    },

    /** Round start */
    roundStart: () => {
        playTone(523, 0.1, 'sine', 0.08);
        setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 100);
    },

    // ══════════════════════════════════════════════════════════════
    // NEW SOUND EFFECTS
    // ══════════════════════════════════════════════════════════════

    /** 🔥 All-in — dramatic rising tension */
    allIn: () => {
        // Low rumble → rising sweep → impact chord
        playTone(110, 0.4, 'sawtooth', 0.06);
        setTimeout(() => playTone(165, 0.3, 'sawtooth', 0.07), 80);
        setTimeout(() => playTone(220, 0.25, 'sine', 0.08), 160);
        setTimeout(() => playTone(330, 0.2, 'sine', 0.09), 240);
        setTimeout(() => playTone(440, 0.15, 'sine', 0.1), 320);
        // Impact chord
        setTimeout(() => {
            playChord([523, 659, 784], 0.4, 'sine', 0.18);
            playNoise(0.15, 0.1);
        }, 400);
        // Shimmering tail
        setTimeout(() => playTone(1047, 0.5, 'sine', 0.06), 500);
        setTimeout(() => playTone(1319, 0.4, 'sine', 0.04), 580);
    },

    /** 🃏 Pok reveal — exciting sting when Pok detected */
    pokReveal: () => {
        // Sharp attack + sparkle
        playTone(1047, 0.08, 'square', 0.08);
        setTimeout(() => playTone(1319, 0.08, 'square', 0.07), 50);
        setTimeout(() => playTone(1568, 0.12, 'sine', 0.1), 100);
        setTimeout(() => playChord([1047, 1319, 1568], 0.3, 'sine', 0.12), 160);
        // Sparkle tail
        setTimeout(() => playTone(2093, 0.15, 'sine', 0.04), 300);
        setTimeout(() => playTone(2637, 0.12, 'sine', 0.03), 380);
    },

    /** 🔎 Showdown reveal — card flip burst */
    showdownReveal: () => {
        // Dramatic sweep up
        playNoise(0.12, 0.1);
        playTone(330, 0.1, 'triangle', 0.06);
        setTimeout(() => {
            playNoise(0.08, 0.08);
            playTone(440, 0.1, 'triangle', 0.07);
        }, 80);
        setTimeout(() => {
            playNoise(0.06, 0.06);
            playTone(660, 0.15, 'sine', 0.08);
        }, 160);
        // Sustain chord
        setTimeout(() => playChord([523, 659, 784], 0.3, 'sine', 0.08), 240);
    },

    /** 🤖 AI draw — subtle card sound for AI */
    aiDraw: () => {
        playNoise(0.08, 0.08);
        playTone(600, 0.05, 'sine', 0.04);
    },

    /** 💰 Chip collect — cascading metallic coins */
    chipCollect: () => {
        const tones = [2000, 2400, 1800, 2600, 2200, 3000, 2800];
        tones.forEach((freq, i) => {
            setTimeout(() => {
                playTone(freq, 0.06, 'triangle', 0.05 - i * 0.005);
                playTone(freq * 0.75, 0.04, 'sine', 0.03);
            }, i * 60);
        });
    },

    /** 🎰 Slider tick — subtle roulette tick */
    sliderTick: () => {
        playTone(3000, 0.02, 'sine', 0.04);
    },

    /** 🏆 Big win — extended fanfare for Deng ×2+ */
    bigWin: () => {
        // Ascending major chord arpeggio
        const notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.35 - i * 0.03, 'sine', 0.12 - i * 0.01), i * 80);
        });
        // Triumph chord
        setTimeout(() => playChord([1047, 1319, 1568, 2093], 0.6, 'sine', 0.14), 520);
        // Sparkle finish
        setTimeout(() => playTone(2093, 0.2, 'sine', 0.05), 800);
        setTimeout(() => playTone(2637, 0.15, 'sine', 0.04), 880);
        setTimeout(() => playTone(3136, 0.12, 'sine', 0.03), 960);
    },

    /** 💀 Game over — dramatic low heartbeat */
    gameOver: () => {
        // Deep bass throb
        playTone(80, 0.5, 'sine', 0.12);
        playTone(82, 0.5, 'sine', 0.1); // Slight detune for thickness
        setTimeout(() => {
            playTone(75, 0.6, 'sine', 0.1);
            playTone(77, 0.6, 'sine', 0.08);
        }, 500);
        // Descending sadness
        setTimeout(() => playTone(330, 0.4, 'sine', 0.06), 200);
        setTimeout(() => playTone(262, 0.5, 'sine', 0.05), 500);
        setTimeout(() => playTone(196, 0.7, 'sine', 0.04), 800);
    },

    /** 🔄 Repeat bet — quick chip slide */
    repeatBet: () => {
        playTone(1000, 0.04, 'sine', 0.06);
        setTimeout(() => playTone(1400, 0.04, 'sine', 0.05), 25);
        setTimeout(() => playTone(1100, 0.03, 'triangle', 0.04), 50);
    },

    /** ⏰ Countdown tick — clock-like tick */
    countdownTick: () => {
        playTone(1800, 0.03, 'sine', 0.08);
        setTimeout(() => playTone(1200, 0.02, 'sine', 0.04), 15);
    },
};

// Initialize audio context on first user interaction
export function initAudio() {
    const handler = () => {
        getAudioContext();
        document.removeEventListener('click', handler);
        document.removeEventListener('touchstart', handler);
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
}
