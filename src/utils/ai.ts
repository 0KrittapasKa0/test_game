import { calculateScore } from './deck';
import { shouldNerfAiDraw } from './luckAssist';
import type { Card, RoomConfig } from '../types/game';

export function aiShouldDraw(cards: Card[]): boolean {
    const score = calculateScore(cards);

    // Nerf: AI ที่แต้มดี (6-7) อาจจั่วเข้าตัว — ดูเป็นธรรมชาติเหมือน AI ตัดสินใจผิด
    if (score >= 6 && shouldNerfAiDraw()) return true;

    if (score <= 3) return true;

    if (score >= 4 && score <= 5) {
        return Math.random() < 0.65;
    }

    if (score === 6) {
        return Math.random() < 0.3;
    }

    return false;
}

export function aiSelectBet(totalChips: number, room: RoomConfig): number {
    // If AI can't afford minimum bet, bet all chips
    if (totalChips < room.minBet) return totalChips;

    // ── Normal bet: pick from chipPresets (mixed chips style) ──
    const cappedMax = Math.min(totalChips, room.maxBet);
    const options = room.chipPresets.filter(b => b >= room.minBet && b <= cappedMax);

    // If no valid preset options, use minimum bet or all chips
    if (options.length === 0) return Math.min(totalChips, room.minBet);

    // Realistic betting weights — more aggressive when flush
    let weights: number[];
    const ratio = totalChips / room.maxBet;
    if (ratio < 0.5) {
        // Desperate / short stack → bet mostly small or push all in closer to minBet
        weights = [60, 25, 10, 5];
    } else if (ratio < 1.5) {
        // Around normal range → balanced
        weights = [35, 35, 20, 10];
    } else if (ratio < 3) {
        // Comfortable stack → slightly aggressive
        weights = [20, 35, 30, 15];
    } else {
        // Big stack → aggressive betting
        weights = [10, 25, 40, 25];
    }

    // Mixed chip variation: occasionally add a random small top-up within range
    // This simulates stacking chips of different denominations
    const baseOption = weightedPick(options, weights.slice(0, options.length));
    const mixChance = 0.3; // 30% chance to mix chips
    if (Math.random() < mixChance) {
        const smallPresets = room.chipPresets.filter(p => p < baseOption);
        if (smallPresets.length > 0) {
            const small = smallPresets[Math.floor(Math.random() * smallPresets.length)];
            const mixed = baseOption + small;
            if (mixed <= cappedMax) return mixed;
        }
    }

    return baseOption;
}

function weightedPick(options: number[], weights: number[]): number {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < options.length; i++) {
        random -= weights[i];
        if (random <= 0) return options[i];
    }
    return options[0];
}
