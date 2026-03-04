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

function isVoiceEnabled(): boolean {
    return loadSettings().voiceEnabled ?? true;
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

// Unlock Speech Synthesis context on strictly user-gesture events for iOS Safari
export function unlockSpeech() {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
    }
}

// ══════════════════════════════════════════════════════════════
// WEB SPEECH API (Voice TTS)
// ══════════════════════════════════════════════════════════════

type OSType = 'Windows' | 'iOS' | 'Android' | 'Other';

function getOS(): OSType {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/windows/.test(userAgent)) return 'Windows';
    if (/iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iOS';
    if (/android/.test(userAgent)) return 'Android';
    return 'Other';
}

interface VoiceConfig {
    voice: SpeechSynthesisVoice | null;
    rate: number;
    pitch: number;
    volume: number;
}

function getVoiceConfig(): VoiceConfig {
    const os = getOS();
    const voices = window.speechSynthesis.getVoices();

    let selectedVoice: SpeechSynthesisVoice | null = null;
    let rate = 1.0;
    let pitch = 1.0;
    const volume = 1.0; // บังคับให้เสียงพากย์ดังสุดเสมอ

    if (os === 'Windows') {
        // ค้นหาเสียง Microsoft Premwadee Online (ตัวที่เป็น Natural Voice) ก่อน
        selectedVoice = voices.find(v => v.name.includes('Microsoft Premwadee Online (Natural)')) ||
            voices.find(v => v.name.includes('Premwadee')) ||
            voices.find(v => v.lang.startsWith('th')) || null;
        rate = 1.0;   // ปรับเข้ากับจังหวะของ Premwadee
        pitch = 1.15; // ให้เสียงสว่างใสขึ้น
    } else if (os === 'iOS') {
        // ใช้ Local Voice ของ iOS (เช่น Kanya, Narisa)
        selectedVoice = voices.find(v => v.lang.startsWith('th') && v.localService) ||
            voices.find(v => v.lang.startsWith('th')) || null;
        rate = 1.0;
        pitch = 1.05; // iOS มักจะมีเสียงผู้หญิงที่ทุ้มกว่า จึงปรับให้สว่างขึ้นเล็กน้อย
    } else if (os === 'Android') {
        // ใช้ Local Voice ของ Google TTS
        selectedVoice = voices.find(v => v.lang.startsWith('th') && v.localService) ||
            voices.find(v => v.lang.startsWith('th')) || null;
        rate = 0.95;  // Android TTS มักจะพูดค่อนข้างรัว การลด rate ลงนิดนึงช่วยให้ฟังชัดขึ้น
        pitch = 1.1;
    } else {
        // ระบบปฏิบัติการอื่นๆ (Mac, Linux, etc.)
        selectedVoice = voices.find(v => v.lang.startsWith('th')) || null;
        rate = 1.0;
        pitch = 1.1;
    }

    return { voice: selectedVoice, rate, pitch, volume };
}

export function speakWelcome(playerName: string = "ผู้เล่น") {
    if (!isSoundEnabled() || !isVoiceEnabled() || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const greetings = [
        `ยินดีต้อนรับค่ะ คุณ${playerName} วันนี้รับป๊อกเก้ากี่เด้งดีคะ?`,
        `สวัสดีค่ะ คุณ${playerName} พร้อมลุยโต๊ะไหนดีคะวันนี้?`,
        `คุณ${playerName} มาแล้ว! ขอให้วันนี้ไพ่เข้ามือปังๆ นะคะ`,
        `กลับมาทวงบัลลังก์แล้วหรอคะ คุณ${playerName}? โต๊ะวีไอพีรออยู่ค่ะ`,
        `รับชิปเพิ่มไหมคะ คุณ${playerName}? วันนี้แจกไพ่สวยแน่นอนค่ะ`,
        `เชิญเลยค่ะ คุณ${playerName} วันนี้เจ้ามือเตรียมตัวโดนเหมาโต๊ะแล้วแน่ๆ`,
        `แวะมาแจกโชคหลอกินเงียบๆ อีกแล้วใช่ไหมคะ คุณ${playerName}`,
        `สวัสดีค่ะเซียน${playerName} วันนี้จัดหนักหรือเล่นขำๆ ดีคะ?`,
        `คุณ${playerName} มาแล้ว วงแตกแน่นอนค่ะเจ้ามือหนาวแล้วนะ`,
        `ยินดีต้อนรับกลับมาค่ะ คุณ${playerName} ขอให้วันนี้ได้ถอนกำไรจุกๆ นะคะ`,
        `รวยๆ เฮงๆ นะคะ คุณ${playerName} ขอให้ป๊อกแปดป๊อกเก้าเข้ามือรัวๆ ค่ะ`,
        `ที่นั่งว่างพอดีเลยค่ะ คุณ${playerName} พร้อมไปลุยกันหรือยังคะ?`,
        `กราบสวัสดีค่ะ คุณ${playerName} ขาประจำของหนู วันนี้ขอให้มือขึ้นนะคะ`,
        `คุณ${playerName} คะ วันนี้อยากรวยกี่ล้านดีคะ เดี๋ยวหนูจัดให้`,
        `เชิญนั่งก่อนค่ะ คุณ${playerName} เสิร์ฟน้ำชาก่อนไหมคะ หรือจะเข้าโต๊ะเลย?`,
        `เล่นให้สนุกนะคะ คุณ${playerName} แต่อย่าลืมลุกไปพักเหยียดเส้นสายบ้างนะคะ`,
        `ขอให้ค่ำคืนนี้เป็นของคุณนะคะ คุณ${playerName} ลุยเลยค่ะ!`,
        `ยินดีต้อนรับค่ะ คุณ${playerName} โต๊ะเดิมพันสูงกำลังรอคนใจถึงแบบคุณอยู่นะคะ`,
        `มาแล้วเหรอคะ ตัวตึงประจำโต๊ะ คุณ${playerName} วันนี้เบาๆ หน่อยนะคะเจ้ามือกลัวหมดแล้ว`,
        `คุณ${playerName} พร้อมมาปะทะกับยอดฝีมือในห้องเซียนแล้วใช่ไหมคะ?`,
        `อย่าเพิ่งรีบร้อนนะคะ คุณ${playerName} ค่อยๆ เล่น ค่อยๆ ดูไพ่ค่ะ`,
        `ไพ่สวยๆ รอคุณอยู่นะคะ คุณ${playerName} เลือกโต๊ะที่ชอบได้เลยค่ะ`,
        `สวัสดีค่ะ คุณ${playerName} ใครทำคุณเสียเปรียบ บอกหนูได้เลยนะคะ`,
        `มาลุ้นจั่วไพ่ใบที่สามกันไหมคะ คุณ${playerName} วันนี้ดวงน่าจะแรงอยู่นะ`,
        `ชิปเต็มกระเป๋าขนาดนี้ คุณ${playerName} ไม่ลองเข้าห้องตำนานหน่อยเหรอคะ?`,
        `ยินดีต้อนรับยอดมนุษย์ คุณ${playerName} วันนี้จะมากวาดชิปไปเท่าไหร่ดีคะ?`,
        `หนูรอแจกไพ่ให้คุณ${playerName} อยู่ตั้งนาน มาช้าจังเลยนะคะวันนี้`,
        `ไพ่ป๊อกเด้งเล่นง่าย จ่ายไว คุณ${playerName} ขอให้ได้กำไรกลับไปเยอะๆ นะคะ`,
        `ทิ้งเรื่องเครียดๆ แล้วมาสนุกกับหนูดีกว่านะคะ คุณ${playerName}`,
        `ขอให้ไพ่ตอง ไพ่เรียง เข้ามือคุณ${playerName} รัวๆ เลยนะคะ สาธุ!`,
        `เข้าโต๊ะปุ๊บ ขอให้ได้กินรอบวงปั๊บเลยนะคะ คุณ${playerName}`,
        `ถ้าพร้อมที่จะรวยแล้ว กดเข้าโต๊ะได้เลยค่ะ คุณ${playerName}`,
        `แหม คุณ${playerName} วันนี้ออร่าเศรษฐีจับเลยนะคะเนี่ย`,
        `สู้ๆ ค่ะ คุณ${playerName} วันนี้หนูเชียร์เต็มที่เลยนะ`,
        `พร้อมกวาดชิปหมดโต๊ะหรือยังคะ คุณ${playerName}?`,
        `สวัสดีค่ะ คุณ${playerName} วันนี้พกดวงมาเต็มกระเป๋าเลยใช่ไหมคะ?`,
        `เตรียมถุงกรอบแกรบมาใส่เงินกลับบ้านหรือยังคะ คุณ${playerName}?`,
        `คิดถึงจังเลยค่ะ คุณ${playerName} รีบๆ เข้าโต๊ะมาสิคะ แจกไพ่รอแล้ว`,
        `วันนี้คุณ${playerName} ดูราศีจับนะคะ สงสัยจะได้ป๊อกเก้าสองเด้งบ่อยแน่เลย`,
        `เจ้ามือแอบกระซิบว่ากลัวคุณ${playerName} จังเลยค่ะ วันนี้เบามือหน่อยนะคะ`,
        `มาค่ะ คุณ${playerName} เดี๋ยวหนูสับไพ่รอให้เนียนๆ เลย`,
        `หนูว่าวันนี้คุณ${playerName} ต้องสร้างตำนานใหม่ในห้องนี้แน่ๆ ค่ะ`,
        `เอาล่ะค่ะ คุณ${playerName} ได้เวลาโชว์สเต็ปเซียนแล้วนะคะ`,
        `วันนี้ใครแผ่ว คุณ${playerName} ไม่แผ่วแน่นอนค่ะ หนูเชื่อแบบนั้น`,
        `เตรียมเฮลั่นโต๊ะได้เลยค่ะ คุณ${playerName} ไพ่ตองรออยู่`,
        `สวัสดีค่ะ คุณ${playerName} วันไหนๆ ก็สู้ดวงคุณไม่ได้หรอกค่ะ จริงไหม?`,
        `มาค่ะ มาโกยเงินเข้ากระเป๋ากันดีกว่านะคะ คุณ${playerName}`,
        `คุณ${playerName} มาทั้งที โต๊ะนี้ต้องลุกเป็นไฟแล้วล่ะค่ะ`,
        `ใจปํ้าแบบคุณ${playerName} ต้องห้องระดับท็อปเท่านั้นนะคะ วันนี้`,
        `อย่ามัวแต่ลังเลค่ะ คุณ${playerName} โชคใหญ่อาจจะอยู่ในตานี้ก็ได้นะ`,
        `ป๊อกเด้งไม่ใช่แค่พึ่งดวงนะคะ ฝีมือแบบคุณ${playerName} ก็สำคัญค่ะ`,
        `พร้อมรับแรงกระแทกจากป๊อกแปดป๊อกเก้าหรือยังคะ คุณ${playerName}?`
    ];

    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const utterance = new SpeechSynthesisUtterance(randomGreeting);
    utterance.lang = 'th-TH'; // สำรองไว้เผื่อระบบไม่ได้ผูก voice

    const setVoiceAndSpeak = () => {
        const config = getVoiceConfig();

        if (config.voice) utterance.voice = config.voice;
        utterance.rate = config.rate;
        utterance.pitch = config.pitch;
        utterance.volume = config.volume;

        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
    } else {
        setVoiceAndSpeak();
    }
}

let lastSpokenText = "";
let lastSpokenTime = 0;

export function speakPhrase(text: string) {
    if (!isSoundEnabled() || !isVoiceEnabled() || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (text === lastSpokenText && now - lastSpokenTime < 500) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';

    const config = getVoiceConfig();

    if (config.voice) utterance.voice = config.voice;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;

    lastSpokenText = text;
    lastSpokenTime = now;

    window.speechSynthesis.speak(utterance);
}
