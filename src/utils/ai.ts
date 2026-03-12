import { calculateScore } from './deck';
import { getBotTraits, getMood } from './aiEmojiLogic';
import type { Card, RoomConfig } from '../types/game';

export function aiShouldDraw(cards: Card[], botId: string): boolean {
    const score = calculateScore(cards);

    // แต้ม ≤3: จั่วเสมอ 100%
    if (score <= 3) return true;

    // --- ดึงอุปนิสัยและอารมณ์บอท ---
    const traits = getBotTraits(botId);
    const mood = getMood(botId); // -1.0 (เสียติด) ถึง +1.0 (ได้ติด)

    // คำนวณความกล้าได้กล้าเสีย (Aggression)
    let aggression = (traits.reactivity + traits.emotionality) / 2;
    if (mood > 0) aggression += mood * 0.2;

    // ถ้าแพ้หนักๆ บอทกวนๆ จะยิ่งบ้าบิ่น (tilt)
    if (mood < -0.5 && traits.trollLevel > 0.3) aggression += 0.3;

    // Clamp aggression ให้อยู่ในช่วง 0.1 - 0.9
    aggression = Math.max(0.1, Math.min(0.9, aggression));

    // --- โอกาสจั่วตามแต้ม (เหมือนคนจริง) ---
    if (score === 4) {
        // แต้ม 4: คนส่วนใหญ่จั่ว (70-90%)
        const chance = 0.55 + (aggression * 0.35);
        return Math.random() < chance;
    }

    if (score === 5) {
        // แต้ม 5: ครึ่งๆ (30-65%)
        const chance = 0.20 + (aggression * 0.45);
        return Math.random() < chance;
    }

    if (score === 6) {
        // แต้ม 6: ส่วนใหญ่ไม่จั่ว แต่คนกล้าๆ อาจจั่ว (3-20%)
        const chance = 0.03 + (aggression * 0.17);
        return Math.random() < chance;
    }

    if (score === 7) {
        // แต้ม 7: แทบไม่มีใครจั่ว — แต่บอทบ้าบิ่นมากอาจลอง (0-3%)
        if (aggression > 0.75 && Math.random() < 0.03) return true;
        return false;
    }

    // แต้ม 8-9: ไม่จั่ว (ป๊อก ไม่ต้องเลือก)
    return false;
}

export function aiSelectBet(totalChips: number, room: RoomConfig): number {
    // If AI can't afford minimum bet, bet all chips
    if (totalChips < room.minBet) return totalChips;

    // ── Raise decision (เกทับ) ──
    const chipRatio = totalChips / room.maxBet;
    let raiseChance = 0;
    if (chipRatio > 5) raiseChance = 0.25;
    else if (chipRatio > 3) raiseChance = 0.15;
    else if (chipRatio > 1.5) raiseChance = 0.07;

    const willRaise = raiseChance > 0 && Math.random() < raiseChance;

    if (willRaise) {
        const minRaise = room.maxBet;
        const maxRaise = totalChips;
        if (minRaise >= maxRaise) return maxRaise;

        const allInChance = 0.08;
        if (Math.random() < allInChance) return maxRaise;

        const raiseFactor = 1.1 + Math.random() * 0.9;
        const raiseAmt = Math.round(room.maxBet * raiseFactor);
        return Math.min(raiseAmt, maxRaise);
    }

    // ── Normal bet: pick from chipPresets (mixed chips style) ──
    const cappedMax = Math.min(totalChips, room.maxBet);
    const options = room.chipPresets.filter(b => b >= room.minBet && b <= cappedMax);

    if (options.length === 0) return Math.min(totalChips, room.minBet);

    let weights: number[];
    const ratio = totalChips / room.maxBet;
    if (ratio < 0.5) {
        weights = [60, 25, 10, 5];
    } else if (ratio < 1.5) {
        weights = [35, 35, 20, 10];
    } else if (ratio < 3) {
        weights = [20, 35, 30, 15];
    } else {
        weights = [10, 25, 40, 25];
    }

    const baseOption = weightedPick(options, weights.slice(0, options.length));
    const mixChance = 0.3;
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
