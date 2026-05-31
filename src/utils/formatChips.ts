import { loadSettings } from './storage';

const SUFFIX_LIST = [
    '', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qd', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'
];

/**
 * Smart chip number formatting
 * 
 * Rules:
 *   < 10,000              → full number with commas (e.g., 1,500 / 5,800)
 *   ≥ 10,000              → K format, 1 decimal if needed (e.g., 12.5K / 50K)
 *   ≥ 1,000,000           → M format, 1 decimal if needed (e.g., 1.5M / 2M)
 *   ...and scales up infinitely through standard large number abbreviations
 */
export function formatChips(amount: number): string {
    const settings = loadSettings();
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (settings.fullChipFormat || abs < 10000) {
        return sign + abs.toLocaleString();
    }

    let tier = Math.floor(Math.log10(abs) / 3);
    
    // Cap tier to the maximum suffix we have defined
    if (tier >= SUFFIX_LIST.length) {
        tier = SUFFIX_LIST.length - 1;
    }

    const value = abs / Math.pow(10, tier * 3);
    const formattedNum = value % 1 === 0 ? value.toString() : value.toFixed(1);
    
    return sign + formattedNum + SUFFIX_LIST[tier];
}

/**
 * Converts a number to spoken Thai words for Voice Synthesis.
 * e.g. 50000 -> "ห้าหมื่น"
 * e.g. 1500000 -> "หนึ่งล้านห้าแสน"
 */
export function numberToThaiVoice(amount: number): string {
    if (amount === 0) return "ศูนย์";

    const abs = Math.abs(amount);
    const sign = amount < 0 ? "ลบ" : "";

    // Helper to format the number string for TTS: e.g. 4.5 -> "4.5", 4.0 -> "4"
    const formatNumStr = (num: number) => {
        const str = num.toFixed(1);
        return str.endsWith('.0') ? str.slice(0, -2) : str;
    };

    // For extremely large numbers, use shorthand decimals so TTS reads it faster
    if (abs >= 100_000) {
        const exp = Math.floor(Math.log10(abs));
        
        // Special case for 100k - 999k (แสน)
        if (exp === 5) {
            const num = abs / 100_000;
            return sign + formatNumStr(num) + " แสน";
        }

        // Algorithmic generation for ล้าน, พันล้าน, ล้านล้าน, พันล้านล้าน, ...
        const tier = Math.floor(exp / 3);
        const value = abs / Math.pow(10, tier * 3);
        
        let unit = "";
        const baseMillions = Math.floor(tier / 2);
        const isPan = tier % 2 !== 0;
        
        if (isPan) {
            unit = " พัน";
        } else {
            unit = " ";
        }
        
        for (let i = 0; i < baseMillions; i++) {
            unit += "ล้าน";
        }
        
        return sign + formatNumStr(value) + unit;
    }

    // For amounts below 100,000, explicitly build the Thai phonetic string to ensure 
    // all TTS engines (especially older ones) read it correctly instead of digit-by-digit.
    let result = '';
    const numStr = abs.toString();
    const length = numStr.length;
    const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    for (let i = 0; i < length; i++) {
        const digit = parseInt(numStr.charAt(i), 10);
        const position = length - i - 1;

        if (digit !== 0) {
            if (position === 1 && digit === 1) {
                result += positions[position];
            } else if (position === 1 && digit === 2) {
                result += 'ยี่' + positions[position];
            } else if (position === 0 && digit === 1 && length > 1) {
                if (numStr.charAt(length - 2) === '0') {
                    result += digits[digit] + positions[position];
                } else {
                    result += 'เอ็ด' + positions[position];
                }
            } else {
                result += digits[digit] + positions[position];
            }
        }
    }

    return sign + result;
}
