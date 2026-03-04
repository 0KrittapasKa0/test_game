import { calculateScore } from './deck';
import { shouldNerfAiDraw } from './luckAssist';
import { getBotTraits, getMood } from './aiEmojiLogic';
import type { Card, RoomConfig } from '../types/game';

export function aiShouldDraw(cards: Card[], botId: string): boolean {
    const score = calculateScore(cards);

    // Nerf: AI ที่แต้มดี (6-7) อาจจั่วเข้าตัว — ดูเป็นธรรมชาติเหมือน AI ตัดสินใจผิด
    if (score >= 6 && shouldNerfAiDraw()) return true;

    // แต้ม ≤3: จั่วเสมอ 100% (ยกเว้นมือพิเศษ ซึ่งปกติจะไม่โผล่มาตรงนี้ถ้ารวมแต้มได้แค่นี้)
    if (score <= 3) return true;

    // --- ดึงอุปนิสัยและอารมณ์บอท ---
    const traits = getBotTraits(botId);
    const mood = getMood(botId); // -1.0 (เสียติด) ถึง +1.0 (ได้ติด)

    // คำนวณความกล้าได้กล้าเสีย (Aggression)
    // - ยิ่ง reactivity/emotionality สูงยิ่งกล้าจั่ว
    // - ถ้ากำลังติดลมบน (mood > 0) ยิ่งมั่นใจ กล้าจั่ว
    // - ถ้ากำลังเสีย (mood < -0.3) บางตัวอาจเพลย์เซฟ หรือหน้ามืดตามัวจั่ว
    let aggression = (traits.reactivity + traits.emotionality) / 2;
    if (mood > 0) aggression += mood * 0.2;

    // ถ้าแพ้หนักๆ บอทกวนๆ จะยิ่งบ้าบิ่น (tilt)
    if (mood < -0.5 && traits.trollLevel > 0.3) aggression += 0.3;

    // Clamp aggression ให้อยู่ในช่วง 0.1 - 0.9
    aggression = Math.max(0.1, Math.min(0.9, aggression));

    // --- โอกาสจั่วตามแต้ม ---
    if (score === 4) {
        // Base chance: 80%. บอทขี้ขลาดลดเหลือ 60%, บอทกล้าได้ให้ 95%
        const chance = 0.60 + (aggression * 0.35);
        return Math.random() < chance;
    }

    if (score === 5) {
        // Base chance: 50%. บอทขี้ขลาดลดเหลือ 20%, บอทกล้าได้ให้ 80%
        const chance = 0.20 + (aggression * 0.60);
        return Math.random() < chance;
    }

    if (score === 6) {
        // Base chance: 20%. บอทขี้ขลาด 5%, บอทกล้าได้ให้ 45%
        const chance = 0.05 + (aggression * 0.40);
        return Math.random() < chance;
    }

    if (score === 7) {
        // แอบจั่วที่แต้ม 7 แบบโง่ๆ นานๆ ที (เฉพาะบอทบ้าบิ่นมาก)
        if (aggression > 0.8 && Math.random() < 0.05) return true;
        return false;
    }

    return false;
}

export function aiSelectBet(totalChips: number, room: RoomConfig): number {
    // If AI can't afford minimum bet, bet all chips
    if (totalChips < room.minBet) return totalChips;

    // ── Raise decision (เกทับ) ──
    // Chance to raise beyond room maxBet, based on chip stack
    const chipRatio = totalChips / room.maxBet; // how many maxBets AI has
    let raiseChance = 0;
    if (chipRatio > 5) raiseChance = 0.25;       // very wealthy → 25%
    else if (chipRatio > 3) raiseChance = 0.15;  // comfortable → 15%
    else if (chipRatio > 1.5) raiseChance = 0.07; // slight edge → 7%
    // else: can't comfortably raise — stays at 0%

    const willRaise = raiseChance > 0 && Math.random() < raiseChance;

    if (willRaise) {
        // ── Raise: pick an amount between maxBet and all chips ──
        // Vary the aggression: 50-100% raise over maxBet
        const minRaise = room.maxBet;
        const maxRaise = totalChips;
        if (minRaise >= maxRaise) return maxRaise; // all-in if can't exceed nicely

        // Pick from: 110-200% of maxBet (or all-in occasionally)
        const allInChance = 0.08; // 8% chance of full all-in during a raise
        if (Math.random() < allInChance) return maxRaise;

        // Random between maxBet*1.1 and maxBet*2 (capped at all chips)
        const raiseFactor = 1.1 + Math.random() * 0.9; // 1.1x to 2.0x
        const raiseAmt = Math.round(room.maxBet * raiseFactor);
        return Math.min(raiseAmt, maxRaise);
    }

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
