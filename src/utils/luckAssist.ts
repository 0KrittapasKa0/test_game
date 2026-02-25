/**
 * Luck Assist System — Enhanced Player-Favoring Probability Engine
 * 
 * ระบบช่วยเหลือความโชคดีสำหรับผู้เล่นสูงอายุ
 * ออกแบบให้รู้สึกเป็นธรรมชาติ ไม่มีรูปแบบที่ตรวจจับได้
 * 
 * === 5 กลยุทธ์หลัก ===
 * 1. เพิ่มโอกาสช่วยไพ่เปิด+จั่วผู้เล่น
 * 2. Nerf AI Opening — ให้ AI 1 คน/รอบ ได้ไพ่แย่
 * 3. Nerf AI Draw — ให้ AI แต้มดีจั่วเข้าตัว
 * 4. ป้องกันหมดตัว — ชิปน้อยช่วยมากขึ้น
 * 5. Win Rate Cap — ชนะ >60% ลดช่วยอัตโนมัติ
 * 
 * Applies ONLY to the human player. Never directly benefits AI.
 */

import type { Card, Rank } from '../types/game';

// ─── Module State (Singleton) ────────────────────────────────────────────────

let loseStreak = 0;
let lastPokRounds: number[] = []; // Round numbers where Pok was assisted
let lastSpecialHandRound = -99;   // รอบล่าสุดที่ได้มือพิเศษจาก assist
let startingChips = 10000;
let openingAssistActivatedThisRound = false;
let aiNerfedThisRound = false; // ป้องกัน nerf AI มากกว่า 1 คนต่อรอบ

// Win Rate Tracking
let winCount = 0;
let totalRounds = 0;
let currentRoundNumber = 0; // เก็บ round number ปัจจุบันสำหรับ cooldown

// ─── Initialization ──────────────────────────────────────────────────────────

export function initLuckState(chips: number): void {
    loseStreak = 0;
    lastPokRounds = [];
    lastSpecialHandRound = -99;
    startingChips = chips;
    openingAssistActivatedThisRound = false;
    aiNerfedThisRound = false;
    winCount = 0;
    totalRounds = 0;
    currentRoundNumber = 0;
}

// ─── Win Rate Cap (Strategy 5) ───────────────────────────────────────────────

/**
 * คำนวณตัวคูณลดโอกาสช่วยเมื่อชนะบ่อยเกินไป
 * ถ้า win rate > 60% → คูณ 0.5 (ลดโอกาสครึ่งหนึ่ง)
 * ถ้า win rate > 55% → คูณ 0.75
 * ปกติ → คูณ 1.0
 * ต้องเล่นอย่างน้อย 5 รอบก่อนจึงจะมีผล
 */
function getWinRateThrottle(): number {
    if (totalRounds < 5) return 1.0;
    const winRate = winCount / totalRounds;
    if (winRate > 0.60) return 0.5;
    if (winRate > 0.55) return 0.75;
    return 1.0;
}

// ─── Phase 1: Opening Hand Assist (Strategy 1 + 4) ──────────────────────────

/**
 * Calculate the Good Start Assist chance based on lose streak and chip ratio.
 * Base: 25%. Scales up with losses and low chips.
 */
export function getGoodStartChance(streak: number, chipRatio: number): number {
    let chance = 0.25; // เพิ่มจาก 0.18

    // Lose Streak Adaptation
    if (streak >= 5) chance = 0.50;       // เพิ่มจาก 0.35
    else if (streak >= 3) chance = 0.35;  // เพิ่มจาก 0.26

    // Low Chip Protection (+15% if below 30% of starting)
    if (chipRatio < 0.3) chance += 0.15;  // เพิ่มจาก 0.10

    return Math.min(chance, 0.60); // Hard cap 60% (เพิ่มจาก 0.50)
}

/**
 * Should we assist the human's opening hand this round?
 */
export function shouldAssistOpening(_roundNumber: number, currentChips: number): boolean {
    const chipRatio = startingChips > 0 ? currentChips / startingChips : 1;
    const chance = getGoodStartChance(loseStreak, chipRatio) * getWinRateThrottle();
    const roll = Math.random();

    if (roll >= chance) {
        openingAssistActivatedThisRound = false;
        return false;
    }

    openingAssistActivatedThisRound = true;
    return true;
}

/**
 * Pick a target score for the assisted opening hand.
 * Distribution inside the assist window:
 *   8% → Pok 9, 15% → Pok 8, 40% → Score 7, 37% → Score 6–8
 * With Pok cooldown: if Pok occurred in last 1 round, skip Pok targets.
 */
function pickTargetScore(roundNumber: number): number {
    const pokOnCooldown = lastPokRounds.some(r => roundNumber - r <= 1); // ลดจาก 2 เหลือ 1

    const roll = Math.random();

    if (!pokOnCooldown) {
        if (roll < 0.08) {       // เพิ่มจาก 0.05
            lastPokRounds.push(roundNumber);
            return 9; // Pok 9
        }
        if (roll < 0.23) {       // เพิ่มจาก 0.15 (0.08 + 0.15 = 0.23)
            lastPokRounds.push(roundNumber);
            return 8; // Pok 8
        }
    }

    // Non-Pok targets
    if (roll < 0.63) return 7; // 40% → score 7
    // Remaining 37% → score 6 or 8 (not Pok since it's 2-card score)
    return Math.random() < 0.5 ? 6 : 8;
}

/**
 * From a deck, find two cards that add up to the target score (mod 10).
 * Optionally prefer same-suit (35% chance for 2 Deng).
 * Returns null if no valid pair found (fallback to random).
 */
export function pickAssistedOpeningCards(
    deck: Card[],
    roundNumber: number,
): { cards: [Card, Card]; remainingDeck: Card[] } | null {
    const targetScore = pickTargetScore(roundNumber);
    const wantSameSuit = Math.random() < 0.35;

    // Build candidate pairs
    type Pair = [number, number];
    const candidates: Pair[] = [];
    const sameSuitCandidates: Pair[] = [];

    for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
            const score = (deck[i].value + deck[j].value) % 10;
            if (score === targetScore) {
                candidates.push([i, j]);
                if (deck[i].suit === deck[j].suit) {
                    sameSuitCandidates.push([i, j]);
                }
            }
        }
    }

    // Pick from same-suit if desired and available, else from all candidates
    let pool = (wantSameSuit && sameSuitCandidates.length > 0)
        ? sameSuitCandidates
        : candidates;

    if (pool.length === 0) {
        // Fallback: try any candidates
        pool = candidates;
    }
    if (pool.length === 0) {
        return null; // Very unlikely, but safety fallback
    }

    // Random pick from pool (don't always pick first match)
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const card1 = deck[pick[0]];
    const card2 = deck[pick[1]];

    // Remove from deck
    const remainingDeck = deck.filter((_, idx) => idx !== pick[0] && idx !== pick[1]);

    return { cards: [card1, card2], remainingDeck };
}

// ─── Phase 2: Third Card Assist (Strategy 1 + 4 + Special Hands) ────────────

/**
 * Should we assist the third card draw?
 * Only activates if opening assist did NOT fire this round.
 */
export function shouldAssistThirdCard(currentChips: number): boolean {
    if (openingAssistActivatedThisRound) return false;

    let chance = 0.40; // เพิ่มจาก 0.30

    // Low Chip Protection (+15%)
    const chipRatio = startingChips > 0 ? currentChips / startingChips : 1;
    if (chipRatio < 0.3) chance += 0.15; // เพิ่มจาก 0.10

    // Win Rate Cap
    chance *= getWinRateThrottle();

    return Math.random() < chance;
}

// ─── Special Hand Detection Helpers ──────────────────────────────────────────

const RANK_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

/**
 * ประเภทมือพิเศษที่ตรวจจับได้ พร้อมโอกาสเลือก (สมดุล)
 */
type SpecialType = 'tong' | 'straight_flush' | 'straight' | 'sam_leung' | 'same_suit';

const SPECIAL_CHANCES: Record<SpecialType, number> = {
    tong: 0.05,            // 5% — หายากมาก ตื่นเต้น
    straight_flush: 0.05,  // 5% — หายากมาก ตื่นเต้น
    straight: 0.15,        // 15% — เจอบ้าง
    sam_leung: 0.12,       // 12% — เจอบ้าง
    same_suit: 0.20,       // 20% — เจอบ่อยสุด เนียนที่สุด
};

/**
 * ตรวจจับว่าไพ่ 2 ใบ + ไพ่ที่กำลังพิจารณา จะทำให้เป็นมือพิเศษไหม
 */
function detectSpecial(cards: Card[], candidate: Card): SpecialType | null {
    const allCards = [...cards, candidate];
    if (allCards.length !== 3) return null;

    // ตอง — 3 ใบ rank เดียวกัน
    if (allCards[0].rank === allCards[1].rank && allCards[1].rank === allCards[2].rank) {
        return 'tong';
    }

    // เช็คเรียง (Straight)
    const indices = allCards.map(c => RANK_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
    let isStraight = false;

    // เรียงปกติ (ลำดับห่าง 1) แต่ไม่ใช่ A-2-3
    if (indices[2] - indices[1] === 1 && indices[1] - indices[0] === 1) {
        if (indices[0] !== 0) isStraight = true; // A-2-3 ไม่นับ
    }
    // Q-K-A (0, 11, 12)
    if (indices[0] === 0 && indices[1] === 11 && indices[2] === 12) {
        isStraight = true;
    }

    const allSameSuit = allCards[0].suit === allCards[1].suit && allCards[1].suit === allCards[2].suit;

    // สเตรทฟลัช = เรียง + สูทเดียวกัน
    if (isStraight && allSameSuit) return 'straight_flush';

    // เรียงอย่างเดียว
    if (isStraight) return 'straight';

    // เซียน (Sam Leung) — 3 ใบหน้า J/Q/K
    if (allCards.every(c => FACE_RANKS.includes(c.rank))) return 'sam_leung';

    // สามสูท
    if (allSameSuit) return 'same_suit';

    return null;
}

/**
 * Pick a third card that improves the hand.
 * 
 * ลำดับความสำคัญ:
 * 1. แต้มดี (6-8) + ได้มือพิเศษ  → ดีที่สุด ⭐
 * 2. แต้มดี (6-8) ไม่มีมือพิเศษ  → ดีปกติ (ระบบเดิม)
 * 3. มือพิเศษ แต่แต้มไม่ดี       → ใช้เฉพาะเมื่อไม่มีข้อ 1-2
 * 
 * Special Hand Cooldown: ได้มือพิเศษแล้วต้องรอ 3 รอบ
 */
export function pickAssistedThirdCard(
    currentCards: Card[],
    deck: Card[],
): { card: Card; remainingDeck: Card[] } | null {
    const currentTotal = currentCards.reduce((sum, c) => sum + c.value, 0);
    const targetScores = [7, 8, 6];

    // เช็ค Special Hand Cooldown
    const specialOnCooldown = (currentRoundNumber - lastSpecialHandRound) <= 3;

    // จัดกลุ่ม candidates
    interface Candidate {
        idx: number;
        scorePriority: number;   // 0=แต้ม7, 1=แต้ม8, 2=แต้ม6, -1=แต้มไม่ดี
        special: SpecialType | null;
    }

    const candidates: Candidate[] = [];

    for (let i = 0; i < deck.length; i++) {
        const finalScore = (currentTotal + deck[i].value) % 10;
        const scorePrio = targetScores.indexOf(finalScore);

        // ตรวจจับมือพิเศษ
        const special = specialOnCooldown ? null : detectSpecial(currentCards, deck[i]);

        // เก็บเฉพาะไพ่ที่แต้มดี หรือ มีมือพิเศษ
        if (scorePrio !== -1 || special !== null) {
            candidates.push({
                idx: i,
                scorePriority: scorePrio,
                special,
            });
        }
    }

    if (candidates.length === 0) return null;

    // ── แยก candidate เป็น 3 กลุ่มตามลำดับความสำคัญ ──

    // กลุ่ม 1: แต้มดี + มือพิเศษ (ดีที่สุด)
    const tier1 = candidates.filter(c => c.scorePriority !== -1 && c.special !== null);
    // กลุ่ม 2: แต้มดีอย่างเดียว
    const tier2 = candidates.filter(c => c.scorePriority !== -1 && c.special === null);
    // กลุ่ม 3: มือพิเศษอย่างเดียว (แต้มไม่ดี)
    const tier3 = candidates.filter(c => c.scorePriority === -1 && c.special !== null);

    let chosen: Candidate | null = null;

    // ── ลอง Tier 1 ก่อน (แต้มดี + มือพิเศษ) ──
    if (tier1.length > 0) {
        // สุ่มตาม special chance — ถ้า roll ผ่าน เลือกจาก tier1
        const candidate = tier1[Math.floor(Math.random() * tier1.length)];
        const specialChance = candidate.special ? SPECIAL_CHANCES[candidate.special] : 0;

        // โอกาสเลือก tier1 สูงกว่าปกติเพราะได้ทั้งแต้มดี + มือพิเศษ
        // ใช้ chance * 3 เพื่อเพิ่มโอกาส (แต่ cap ที่ 60%)
        if (Math.random() < Math.min(specialChance * 3, 0.60)) {
            chosen = candidate;
        }
    }

    // ── ถ้ายังไม่ได้เลือก → ระบบเดิม (Tier 2: แต้มดี) ──
    if (!chosen && tier2.length > 0) {
        // ใช้ logic เดิม: sort by score priority, randomize within tier
        tier2.sort((a, b) => {
            if (a.scorePriority !== b.scorePriority) return a.scorePriority - b.scorePriority;
            return Math.random() - 0.5;
        });

        if (Math.random() < 0.70) {
            const bestPrio = tier2[0].scorePriority;
            const topTier = tier2.filter(c => c.scorePriority === bestPrio);
            chosen = topTier[Math.floor(Math.random() * topTier.length)];
        } else {
            chosen = tier2[Math.floor(Math.random() * tier2.length)];
        }
    }

    // ── Fallback: Tier 1 ที่ยังไม่ได้เลือก (ลองอีกรอบ) ──
    if (!chosen && tier1.length > 0) {
        chosen = tier1[Math.floor(Math.random() * tier1.length)];
    }

    // ── Tier 3: มือพิเศษอย่างเดียว (ไม่ค่อยใช้ เพราะแต้มไม่ดี) ──
    if (!chosen && tier3.length > 0) {
        // ใช้ chance ต่ำมาก — เฉพาะมือ 5 เด้งที่คุ้มค่าแม้แต้มจะไม่ดี
        const highValue = tier3.filter(c => c.special === 'tong' || c.special === 'straight_flush');
        if (highValue.length > 0 && Math.random() < 0.03) { // 3% เท่านั้น
            chosen = highValue[Math.floor(Math.random() * highValue.length)];
        }
    }

    if (!chosen) return null;

    // บันทึก cooldown ถ้าได้มือพิเศษ
    if (chosen.special) {
        lastSpecialHandRound = currentRoundNumber;
    }

    const card = deck[chosen.idx];
    const remainingDeck = deck.filter((_, idx) => idx !== chosen!.idx);

    return { card, remainingDeck };
}

// ─── Strategy 2: AI Opening Nerf ─────────────────────────────────────────────

/**
 * ควร nerf ไพ่เปิดของ AI คนนี้หรือไม่?
 * โอกาส ~12% (เพิ่มเมื่อแพ้ streak) แต่ nerf ได้แค่ 1 คนต่อรอบ
 */
export function shouldNerfAiOpening(): boolean {
    if (aiNerfedThisRound) return false; // จำกัด 1 คนต่อรอบ

    let chance = 0.12;

    // เพิ่มโอกาส nerf เมื่อผู้เล่นแพ้ต่อเนื่อง
    if (loseStreak >= 5) chance = 0.25;
    else if (loseStreak >= 3) chance = 0.18;

    // Win Rate Cap
    chance *= getWinRateThrottle();

    if (Math.random() < chance) {
        aiNerfedThisRound = true;
        return true;
    }
    return false;
}

/**
 * เลือกคู่ไพ่ที่แต้มรวม 0–3 ให้ AI (ไพ่แย่)
 * Returns null if no suitable pair found (fallback to random).
 */
export function pickNerfedAiCards(
    deck: Card[],
): { cards: [Card, Card]; remainingDeck: Card[] } | null {
    const badScores = [0, 1, 2, 3]; // แต้มแย่

    type Pair = [number, number];
    const candidates: Pair[] = [];

    for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
            const score = (deck[i].value + deck[j].value) % 10;
            if (badScores.includes(score)) {
                candidates.push([i, j]);
            }
        }
    }

    if (candidates.length === 0) return null;

    // Random pick
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const card1 = deck[pick[0]];
    const card2 = deck[pick[1]];
    const remainingDeck = deck.filter((_, idx) => idx !== pick[0] && idx !== pick[1]);

    return { cards: [card1, card2], remainingDeck };
}

// ─── Strategy 3: AI Draw Nerf ────────────────────────────────────────────────

/**
 * ควรบังคับให้ AI จั่วเพิ่มทั้งที่แต้มดี (6-7) หรือไม่?
 * โอกาส ~15% — ทำให้ AI เสี่ยงแต้มลดลง
 */
export function shouldNerfAiDraw(): boolean {
    let chance = 0.15;

    // เพิ่มเมื่อผู้เล่นแพ้ต่อเนื่อง
    if (loseStreak >= 3) chance = 0.22;

    // Win Rate Cap
    chance *= getWinRateThrottle();

    return Math.random() < chance;
}


// ─── Streak & Tracking ───────────────────────────────────────────────────────

/**
 * Record the human player's round result.
 * Updates lose streak, win count, and cleans up old Pok cooldown entries.
 */
export function recordRoundResult(result: 'win' | 'lose' | 'draw', roundNumber: number): void {
    totalRounds++;
    currentRoundNumber = roundNumber;

    if (result === 'lose') {
        loseStreak++;
    } else if (result === 'win') {
        loseStreak = 0;
        winCount++;
    }
    // Draw doesn't change streak or win count

    // Clean up old Pok cooldown entries (keep only last 5 rounds)
    lastPokRounds = lastPokRounds.filter(r => roundNumber - r <= 5);
}

/**
 * Reset the round-specific flags at the start of each round.
 */
export function resetRoundState(): void {
    openingAssistActivatedThisRound = false;
    aiNerfedThisRound = false;
}

// ─── Debug (development only) ────────────────────────────────────────────────

export function _getDebugState() {
    const winRate = totalRounds > 0 ? (winCount / totalRounds * 100).toFixed(1) + '%' : 'N/A';
    const specialCooldownLeft = Math.max(0, 3 - (currentRoundNumber - lastSpecialHandRound));
    return {
        loseStreak,
        lastPokRounds,
        lastSpecialHandRound,
        specialCooldownLeft,
        startingChips,
        openingAssistActivatedThisRound,
        aiNerfedThisRound,
        winCount,
        totalRounds,
        winRate,
        throttle: getWinRateThrottle(),
    };
}
