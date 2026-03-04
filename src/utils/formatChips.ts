/**
 * Smart chip number formatting
 * 
 * Rules:
 *   < 10,000              → full number with commas (e.g., 1,500 / 5,800)
 *   ≥ 10,000              → K format, 1 decimal if needed (e.g., 12.5K / 50K)
 *   ≥ 1,000,000           → M format, 1 decimal if needed (e.g., 1.5M / 2M)
 *   ≥ 1,000,000,000       → B format (e.g., 5B / 2.5B)
 *   ≥ 1,000,000,000,000   → T format (e.g., 1T / 50T)
 *   ≥ 1,000,000,000,000,000 → Q format (e.g., 2.5Q)
 */
export function formatChips(amount: number): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (abs >= 1_000_000_000_000_000) {
        const q = abs / 1_000_000_000_000_000;
        return sign + (q % 1 === 0 ? `${q}Q` : `${q.toFixed(1)}Q`);
    }

    if (abs >= 1_000_000_000_000) {
        const t = abs / 1_000_000_000_000;
        return sign + (t % 1 === 0 ? `${t}T` : `${t.toFixed(1)}T`);
    }

    if (abs >= 1_000_000_000) {
        const b = abs / 1_000_000_000;
        return sign + (b % 1 === 0 ? `${b}B` : `${b.toFixed(1)}B`);
    }

    if (abs >= 1_000_000) {
        const m = abs / 1_000_000;
        return sign + (m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`);
    }

    if (abs >= 10_000) {
        const k = abs / 1_000;
        return sign + (k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`);
    }

    return sign + abs.toLocaleString();
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
    // e.g. "1.5 ล้าน" instead of "หนึ่งล้านห้าแสน"
    if (abs >= 1_000_000_000_000_000) {
        const num = abs / 1_000_000_000_000_000;
        return sign + formatNumStr(num) + " ล้านล้านล้าน"; // Q scale
    }

    if (abs >= 1_000_000_000_000) {
        const num = abs / 1_000_000_000_000;
        return sign + formatNumStr(num) + " ล้านล้าน";
    }

    if (abs >= 1_000_000_000) {
        const num = abs / 1_000_000_000;
        return sign + formatNumStr(num) + " พันล้าน";
    }

    if (abs >= 1_000_000) {
        const num = abs / 1_000_000;
        return sign + formatNumStr(num) + " ล้าน";
    }

    if (abs >= 100_000) {
        const num = abs / 100_000;
        return sign + formatNumStr(num) + " แสน";
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
