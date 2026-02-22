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
