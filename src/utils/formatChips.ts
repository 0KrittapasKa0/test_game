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

    const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    let numStr = Math.abs(amount).toString();
    if (numStr.length > 7) {
        // Handle values > 1 Million by taking the million part and adding 'ล้าน', then process the rest
        const millionsStr = numStr.substring(0, numStr.length - 6);
        const restStr = numStr.substring(numStr.length - 6);

        // Simple recursion for the millions part (since million in Thai is just a prefix read as a normal number + ล้าน)
        const millionsText = numberToThaiVoice(parseInt(millionsStr, 10)) + "ล้าน";
        const restText = parseInt(restStr, 10) === 0 ? "" : numberToThaiVoice(parseInt(restStr, 10));
        return millionsText + restText;
    }

    let result = '';
    const length = numStr.length;

    for (let i = 0; i < length; i++) {
        const digit = parseInt(numStr.charAt(i), 10);
        const position = length - i - 1;

        if (digit !== 0) {
            // Special rules for Thai numbers
            if (position === 1 && digit === 1) {
                // "สิบ" instead of "หนึ่งสิบ"
                result += positions[position];
            } else if (position === 1 && digit === 2) {
                // "ยี่สิบ" instead of "สองสิบ"
                result += 'ยี่' + positions[position];
            } else if (position === 0 && digit === 1 && length > 1) {
                // "เอ็ด" instead of "หนึ่ง" as the last digit
                // But only if the tens digit is not 0 (e.g. 101 => ร้อยเอ็ด)
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

    return amount < 0 ? "ลบ" + result : result;
}
