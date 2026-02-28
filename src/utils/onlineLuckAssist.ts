/**
 * Online Luck Assist System — Shared Fair Probability Engine
 * 
 * ระบบช่วยเหลือความโชคดีสำหรับโหมดออนไลน์
 * แจกจ่ายโอกาสคอยช่วยไพ่เปิด+จั่วให้กับผู้เล่นทุกคนอย่างเท่าเทียม
 * โดยไม่มีการแบ่งแยกการ Nerf ใครทั้งสิ้น (Everyone gets the same algorithm rules)
 */

import type { Card, Rank } from '../types/game';

// ─── Module State (Multi-Player Map) ─────────────────────────────────────────

interface PlayerState {
    loseStreak: number;
    lastPokRounds: number[]; // Round numbers where Pok was assisted
    lastSpecialHandRound: number; // รอบล่าสุดที่ได้มือพิเศษจาก assist
    startingChips: number;
    winCount: number;
    openingAssistActivatedThisRound: boolean;
}

// Stores state per player ID.
const playerStates = new Map<string, PlayerState>();

let totalRounds = 0;
let currentRoundNumber = 0;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialize a player's luck state. Useful when a player joins or the match starts.
 */
export function initOnlinePlayerLuckState(playerId: string, startingChips: number): void {
    playerStates.set(playerId, {
        loseStreak: 0,
        lastPokRounds: [],
        lastSpecialHandRound: -99,
        startingChips,
        winCount: 0,
        openingAssistActivatedThisRound: false,
    });
}

/**
 * Reset specific elements of the round, typically called at round start.
 */
export function resetOnlineRoundState(roundNumber: number): void {
    currentRoundNumber = roundNumber;
    for (const [_, state] of playerStates.entries()) {
        state.openingAssistActivatedThisRound = false;
    }
}

// ─── Win Rate Cap (Strategy 5) ───────────────────────────────────────────────

/**
 * คำนวณตัวคูณลดโอกาสช่วยเมื่อชนะบ่อยเกินไปสำหรับบุคคล
 */
function getWinRateThrottle(state: PlayerState): number {
    if (totalRounds < 5) return 1.0;
    const winRate = state.winCount / totalRounds;
    if (winRate > 0.60) return 0.5;
    if (winRate > 0.55) return 0.75;
    return 1.0;
}

// ─── Phase 1: Opening Hand Assist (Strategy 1 + 4) ──────────────────────────

/**
 * Calculate the Good Start Assist chance based on lose streak and chip ratio.
 */
function getGoodStartChance(streak: number, chipRatio: number): number {
    let chance = 0.25;

    // Lose Streak Adaptation
    if (streak >= 5) chance = 0.50;
    else if (streak >= 3) chance = 0.35;

    // Low Chip Protection (+15% if below 30% of starting)
    if (chipRatio < 0.3) chance += 0.15;

    return Math.min(chance, 0.60); // Hard cap 60%
}

/**
 * Should we assist this player's opening hand this round?
 */
export function shouldAssistOnlineOpening(playerId: string, currentChips: number): boolean {
    const state = playerStates.get(playerId);
    if (!state) return false;

    const chipRatio = state.startingChips > 0 ? currentChips / state.startingChips : 1;
    const chance = getGoodStartChance(state.loseStreak, chipRatio) * getWinRateThrottle(state);
    const roll = Math.random();

    if (roll >= chance) {
        state.openingAssistActivatedThisRound = false;
        return false;
    }

    state.openingAssistActivatedThisRound = true;
    return true;
}

function pickTargetScore(state: PlayerState, roundNumber: number): number {
    const pokOnCooldown = state.lastPokRounds.some(r => roundNumber - r <= 1);
    const roll = Math.random();

    if (!pokOnCooldown) {
        if (roll < 0.08) {
            state.lastPokRounds.push(roundNumber);
            return 9; // Pok 9
        }
        if (roll < 0.23) {
            state.lastPokRounds.push(roundNumber);
            return 8; // Pok 8
        }
    }

    if (roll < 0.63) return 7;
    return Math.random() < 0.5 ? 6 : 8;
}

/**
 * From a deck, find two cards that add up to the target score (mod 10).
 * Optionally prefer same-suit (35% chance for 2 Deng).
 */
export function pickAssistedOnlineOpeningCards(
    playerId: string,
    deck: Card[],
    roundNumber: number,
): { cards: [Card, Card]; remainingDeck: Card[] } | null {
    const state = playerStates.get(playerId);
    if (!state) return null;

    const targetScore = pickTargetScore(state, roundNumber);
    const wantSameSuit = Math.random() < 0.35;

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

    let pool = (wantSameSuit && sameSuitCandidates.length > 0)
        ? sameSuitCandidates
        : candidates;

    if (pool.length === 0) pool = candidates;
    if (pool.length === 0) return null;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    const card1 = deck[pick[0]];
    const card2 = deck[pick[1]];
    const remainingDeck = deck.filter((_, idx) => idx !== pick[0] && idx !== pick[1]);

    return { cards: [card1, card2], remainingDeck };
}

// ─── Phase 2: Third Card Assist (Strategy 1 + 4 + Special Hands) ────────────

/**
 * Should we assist the third card draw?
 * Only activates if opening assist did NOT fire this round.
 */
export function shouldAssistOnlineThirdCard(playerId: string, currentChips: number): boolean {
    const state = playerStates.get(playerId);
    if (!state || state.openingAssistActivatedThisRound) return false;

    let chance = 0.40;

    const chipRatio = state.startingChips > 0 ? currentChips / state.startingChips : 1;
    if (chipRatio < 0.3) chance += 0.15;

    chance *= getWinRateThrottle(state);
    return Math.random() < chance;
}

// ─── Special Hand Detection Helpers ──────────────────────────────────────────

const RANK_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const FACE_RANKS: Rank[] = ['J', 'Q', 'K'];

type SpecialType = 'tong' | 'straight_flush' | 'straight' | 'sam_leung' | 'same_suit';

const SPECIAL_CHANCES: Record<SpecialType, number> = {
    tong: 0.05,
    straight_flush: 0.05,
    straight: 0.15,
    sam_leung: 0.12,
    same_suit: 0.20,
};

function detectSpecial(cards: Card[], candidate: Card): SpecialType | null {
    const allCards = [...cards, candidate];
    if (allCards.length !== 3) return null;

    if (allCards[0].rank === allCards[1].rank && allCards[1].rank === allCards[2].rank) {
        return 'tong';
    }

    const indices = allCards.map(c => RANK_ORDER.indexOf(c.rank)).sort((a, b) => a - b);
    let isStraight = false;

    if (indices[2] - indices[1] === 1 && indices[1] - indices[0] === 1) {
        if (indices[0] !== 0) isStraight = true;
    }
    if (indices[0] === 0 && indices[1] === 11 && indices[2] === 12) {
        isStraight = true;
    }

    const allSameSuit = allCards[0].suit === allCards[1].suit && allCards[1].suit === allCards[2].suit;

    if (isStraight && allSameSuit) return 'straight_flush';
    if (isStraight) return 'straight';
    if (allCards.every(c => FACE_RANKS.includes(c.rank))) return 'sam_leung';
    if (allSameSuit) return 'same_suit';

    return null;
}

/**
 * Pick a third card that improves the hand.
 */
export function pickAssistedOnlineThirdCard(
    playerId: string,
    currentCards: Card[],
    deck: Card[],
): { card: Card; remainingDeck: Card[] } | null {
    const state = playerStates.get(playerId);
    if (!state) return null;

    const currentTotal = currentCards.reduce((sum, c) => sum + c.value, 0);
    const targetScores = [7, 8, 6];

    const specialOnCooldown = (currentRoundNumber - state.lastSpecialHandRound) <= 3;

    interface Candidate {
        idx: number;
        scorePriority: number;
        special: SpecialType | null;
    }

    const candidates: Candidate[] = [];

    for (let i = 0; i < deck.length; i++) {
        const finalScore = (currentTotal + deck[i].value) % 10;
        const scorePrio = targetScores.indexOf(finalScore);
        const special = specialOnCooldown ? null : detectSpecial(currentCards, deck[i]);

        if (scorePrio !== -1 || special !== null) {
            candidates.push({
                idx: i,
                scorePriority: scorePrio,
                special,
            });
        }
    }

    if (candidates.length === 0) return null;

    const tier1 = candidates.filter(c => c.scorePriority !== -1 && c.special !== null);
    const tier2 = candidates.filter(c => c.scorePriority !== -1 && c.special === null);
    const tier3 = candidates.filter(c => c.scorePriority === -1 && c.special !== null);

    let chosen: Candidate | null = null;

    if (tier1.length > 0) {
        const candidate = tier1[Math.floor(Math.random() * tier1.length)];
        const specialChance = candidate.special ? SPECIAL_CHANCES[candidate.special] : 0;
        if (Math.random() < Math.min(specialChance * 3, 0.60)) chosen = candidate;
    }

    if (!chosen && tier2.length > 0) {
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

    if (!chosen && tier1.length > 0) chosen = tier1[Math.floor(Math.random() * tier1.length)];

    if (!chosen && tier3.length > 0) {
        const highValue = tier3.filter(c => c.special === 'tong' || c.special === 'straight_flush');
        if (highValue.length > 0 && Math.random() < 0.03) {
            chosen = highValue[Math.floor(Math.random() * highValue.length)];
        }
    }

    if (!chosen) return null;

    if (chosen.special) {
        state.lastSpecialHandRound = currentRoundNumber;
    }

    const card = deck[chosen.idx];
    const remainingDeck = deck.filter((_, idx) => idx !== chosen!.idx);

    return { card, remainingDeck };
}

// ─── Streak & Tracking ───────────────────────────────────────────────────────

/**
 * Record a player's round result.
 */
export function recordOnlineRoundResult(playerId: string, result: 'win' | 'lose' | 'draw', roundNumber: number): void {
    const state = playerStates.get(playerId);
    if (!state) return;

    if (result === 'lose') {
        state.loseStreak++;
    } else if (result === 'win') {
        state.loseStreak = 0;
        state.winCount++;
    }

    state.lastPokRounds = state.lastPokRounds.filter(r => roundNumber - r <= 5);
}

/**
 * Increment the global round number, usually executed once per round for the entire room.
 */
export function incrementOnlineTotalRounds(): void {
    totalRounds++;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Optional method to remove players that drop out. */
export function removeOnlinePlayerLuckState(playerId: string): void {
    playerStates.delete(playerId);
}
