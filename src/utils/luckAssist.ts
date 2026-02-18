/**
 * Luck Assist System — Subtle Player-Favoring Probability Engine
 * 
 * ระบบช่วยเหลือความโชคดีสำหรับผู้เล่นสูงอายุ
 * ออกแบบให้รู้สึกเป็นธรรมชาติ ไม่มีรูปแบบที่ตรวจจับได้
 * 
 * Applies ONLY to the human player. Never biases AI.
 */

import type { Card } from '../types/game';

// ─── Module State (Singleton) ────────────────────────────────────────────────

let loseStreak = 0;
let lastPokRounds: number[] = []; // Round numbers where Pok was assisted
let startingChips = 10000;
let openingAssistActivatedThisRound = false;

// ─── Initialization ──────────────────────────────────────────────────────────

export function initLuckState(chips: number): void {
    loseStreak = 0;
    lastPokRounds = [];
    startingChips = chips;
    openingAssistActivatedThisRound = false;
}

// ─── Phase 1: Opening Hand Assist ────────────────────────────────────────────

/**
 * Calculate the Good Start Assist chance based on lose streak and chip ratio.
 * Base: 18%. Scales up with losses and low chips.
 */
export function getGoodStartChance(streak: number, chipRatio: number): number {
    let chance = 0.18;

    // Phase 3: Lose Streak Adaptation
    if (streak >= 5) chance = 0.35;
    else if (streak >= 3) chance = 0.26;

    // Phase 4: Low Chip Protection (+10% if below 30% of starting)
    if (chipRatio < 0.3) chance += 0.10;

    return Math.min(chance, 0.50); // Hard cap at 50%
}

/**
 * Should we assist the human's opening hand this round?
 */
export function shouldAssistOpening(_roundNumber: number, currentChips: number): boolean {
    const chipRatio = startingChips > 0 ? currentChips / startingChips : 1;
    const chance = getGoodStartChance(loseStreak, chipRatio);
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
 *   5% → Pok 9, 10% → Pok 8, 45% → Score 7, 40% → Score 6–8
 * With Pok cooldown: if Pok occurred in last 2 rounds, skip Pok targets.
 */
function pickTargetScore(roundNumber: number): number {
    const pokOnCooldown = lastPokRounds.some(r => roundNumber - r <= 2);

    const roll = Math.random();

    if (!pokOnCooldown) {
        if (roll < 0.05) {
            lastPokRounds.push(roundNumber);
            return 9; // Pok 9
        }
        if (roll < 0.15) {
            lastPokRounds.push(roundNumber);
            return 8; // Pok 8
        }
    }

    // Non-Pok targets
    if (roll < 0.60) return 7; // 45% → score 7
    // Remaining 40% → score 6 or 8 (not Pok since it's 2-card score)
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

// ─── Phase 2: Third Card Assist ──────────────────────────────────────────────

/**
 * Should we assist the third card draw?
 * Only activates if opening assist did NOT fire this round.
 */
export function shouldAssistThirdCard(currentChips: number): boolean {
    if (openingAssistActivatedThisRound) return false;

    let chance = 0.30;

    // Phase 4: Low Chip Protection (+10%)
    const chipRatio = startingChips > 0 ? currentChips / startingChips : 1;
    if (chipRatio < 0.3) chance += 0.10;

    return Math.random() < chance;
}

/**
 * Pick a third card that improves the hand toward score 6, 7, or 8.
 * Returns null if no suitable card found (fallback to random).
 */
export function pickAssistedThirdCard(
    currentCards: Card[],
    deck: Card[],
): { card: Card; remainingDeck: Card[] } | null {
    const currentTotal = currentCards.reduce((sum, c) => sum + c.value, 0);

    // Target final scores (mod 10), in preference order
    const targetScores = [7, 8, 6];

    // For each target, find cards that would achieve it
    const scoredCandidates: { idx: number; priority: number }[] = [];

    for (let i = 0; i < deck.length; i++) {
        const finalScore = (currentTotal + deck[i].value) % 10;
        const prio = targetScores.indexOf(finalScore);
        if (prio !== -1) {
            scoredCandidates.push({ idx: i, priority: prio });
        }
    }

    if (scoredCandidates.length === 0) return null;

    // Sort by priority (lower = better), then randomize within same priority
    scoredCandidates.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return Math.random() - 0.5; // Shuffle within same tier
    });

    // Don't always pick the best — add slight randomness
    // 70% chance to pick from top priority, 30% chance to pick any candidate
    let pickIdx: number;
    if (Math.random() < 0.70) {
        // Pick from best priority tier
        const bestPrio = scoredCandidates[0].priority;
        const topTier = scoredCandidates.filter(c => c.priority === bestPrio);
        pickIdx = topTier[Math.floor(Math.random() * topTier.length)].idx;
    } else {
        // Pick any candidate
        pickIdx = scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)].idx;
    }

    const card = deck[pickIdx];
    const remainingDeck = deck.filter((_, idx) => idx !== pickIdx);

    return { card, remainingDeck };
}

// ─── Phase 3 & 5: Streak & Cooldown Tracking ────────────────────────────────

/**
 * Record the human player's round result.
 * Updates lose streak and cleans up old Pok cooldown entries.
 */
export function recordRoundResult(result: 'win' | 'lose' | 'draw', roundNumber: number): void {
    if (result === 'lose') {
        loseStreak++;
    } else if (result === 'win') {
        loseStreak = 0;
    }
    // Draw doesn't change streak

    // Clean up old Pok cooldown entries (keep only last 5 rounds)
    lastPokRounds = lastPokRounds.filter(r => roundNumber - r <= 5);
}

/**
 * Reset the opening assist flag at the start of each round.
 */
export function resetRoundState(): void {
    openingAssistActivatedThisRound = false;
}

// ─── Debug (development only) ────────────────────────────────────────────────

export function _getDebugState() {
    return { loseStreak, lastPokRounds, startingChips, openingAssistActivatedThisRound };
}
