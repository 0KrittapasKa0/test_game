// ============================================================
// Organic AI Emoji Engine v2 — Final Comprehensive System
// ============================================================
// Design principles:
// 1. Import emojis FROM EmojiPicker → single source of truth
// 2. Each bot has "favorite emojis" they use more (like real people)
// 3. Round budget: max 2 emojis per round per bot (anti-spam)
// 4. Mood memory: win/loss streaks shift reactions
// 5. Cooldown between emojis (5-15 seconds per bot)
// 6. Weighted pools with mood jitter → no predictable patterns
// 7. Social reactions: bots react to OTHER players' events too
// ============================================================

import { EMOJI_CATEGORIES } from '../components/EmojiPicker';

// --- Build emoji groups from EmojiPicker (single source of truth) ---
const CATEGORY_MAP: Record<string, string> = {
    greetings: 'greeting',
    happy: 'celebrate',
    suspense: 'suspense',
    sad: 'sad',
    angry: 'angry',
    teasing: 'tease',
};

function getEmojiGroups(): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const cat of EMOJI_CATEGORIES) {
        const key = CATEGORY_MAP[cat.id] ?? cat.id;
        groups[key] = [...cat.emojis];
    }
    return groups;
}

// Flatten all available emojis
function getAllEmojis(): string[] {
    return EMOJI_CATEGORIES.flatMap(c => c.emojis);
}

// --- Bot Traits (5 continuous values, 0-1) ---
export interface BotTraits {
    chattiness: number;    // how often they react overall
    emotionality: number;  // how dramatic (amplifies sad/celebrate/suspense)
    trollLevel: number;    // sarcasm level (amplifies tease/angry)
    reactivity: number;    // chance to react to OTHER players' events
    patience: number;      // affects cooldown length (higher = longer waits)
}

// Hash a string to a 0-1 float
function hashFloat(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
        h = str.charCodeAt(i) + ((h << 5) - h);
        h = h & h;
    }
    return (Math.abs(h) % 10000) / 10000;
}

export function getBotTraits(botId: string): BotTraits {
    return {
        chattiness: 0.12 + hashFloat(botId, 1) * 0.23,  // 0.12 - 0.35
        emotionality: 0.1 + hashFloat(botId, 2) * 0.8,   // 0.1 - 0.9
        trollLevel: hashFloat(botId, 3) * 0.5,             // 0 - 0.5
        reactivity: 0.05 + hashFloat(botId, 4) * 0.2,      // 0.05 - 0.25
        patience: 0.3 + hashFloat(botId, 5) * 0.7,         // 0.3 - 1.0
    };
}

// --- Favorite Emojis (each bot has 3 go-to emojis they use more) ---
function getBotFavorites(botId: string): string[] {
    const all = getAllEmojis();
    const favs: string[] = [];
    for (let i = 0; i < 3; i++) {
        const idx = Math.floor(hashFloat(botId, 10 + i) * all.length);
        if (!favs.includes(all[idx])) {
            favs.push(all[idx]);
        }
    }
    return favs;
}

// --- Round Budget Tracking ---
// Key: botId, Value: emoji count used this round
const roundBudget: Map<string, number> = new Map();
const MAX_EMOJIS_PER_ROUND = 2;

function canUseEmoji(botId: string): boolean {
    const used = roundBudget.get(botId) ?? 0;
    return used < MAX_EMOJIS_PER_ROUND;
}

function incrementBudget(botId: string): void {
    const used = roundBudget.get(botId) ?? 0;
    roundBudget.set(botId, used + 1);
}

// --- Cooldown System ---
const lastEmojiTime: Map<string, number> = new Map();
let lastGlobalEmojiTime = 0; // Prevent multiple bots from firing at the exact same millisecond

function getCooldownMs(botId: string): number {
    const t = getBotTraits(botId);
    // Base cooldown increased to 8-18 seconds to prevent spam
    const base = 8000 + t.patience * 10000;
    // Add random variance ±3s
    return base + (Math.random() - 0.5) * 6000;
}

function isOnCooldown(botId: string): boolean {
    const now = Date.now();
    // Global cooldown: no bot can speak within 2 seconds of another bot
    if (now - lastGlobalEmojiTime < 2000) return true;

    const last = lastEmojiTime.get(botId);
    if (!last) return false;
    return (now - last) < getCooldownMs(botId);
}

function markUsed(botId: string): void {
    const now = Date.now();
    lastEmojiTime.set(botId, now);
    lastGlobalEmojiTime = now;
    incrementBudget(botId);
}

// --- Mood Memory (tracks win/loss streaks) ---
const moodState: Map<string, number> = new Map();  // -1.0 (tilted) to +1.0 (hot streak)

export function updateMood(botId: string, result: 'win' | 'lose' | 'draw'): void {
    const current = moodState.get(botId) ?? 0;
    let delta = 0;
    if (result === 'win') delta = 0.25;
    else if (result === 'lose') delta = -0.3;
    // Clamp to [-1, 1] and decay slightly toward 0
    const newMood = Math.max(-1, Math.min(1, current * 0.8 + delta));
    moodState.set(botId, newMood);
}

export function getMood(botId: string): number {
    return moodState.get(botId) ?? 0;
}

// --- Weighted Pool Builder ---
interface WeightedEmoji {
    emoji: string;
    weight: number;
}

// Map the Category names used in aiEmojiLogic to the actual emojis from EmojiPicker
const EXACT_EMOJIS: Record<string, string[]> = {
    greeting: ['👋', '🙏', '🤝', '💖', '💯'],
    celebrate: ['😄', '🎉', '👏', '🤩', '🤑'], // Maps to 'happy'
    suspense: ['🫣', '🥶', '😱', '🤞', '🥺'],
    sad: ['😭', '💔', '😓', '😵', '💸'],
    angry: ['😡', '🤬', '😤', '🙄', '😠'],
    tease: ['😏', '😝', '🤫', '🥱', '😎']     // Maps to 'teasing'
};

function buildPool(
    baseWeights: Record<string, number>,
    botId: string,
): WeightedEmoji[] {
    const pool: WeightedEmoji[] = [];
    const traits = getBotTraits(botId);
    const favorites = getBotFavorites(botId);
    const mood = getMood(botId);

    for (const [groupName, baseWeight] of Object.entries(baseWeights)) {
        if (baseWeight <= 0) continue;

        const emojis = EXACT_EMOJIS[groupName] || [];

        for (const emoji of emojis) {
            let w = baseWeight;

            // --- Trait modifiers ---
            // Troll bots love teasing, angry, and suspense
            if (groupName === 'tease' || groupName === 'angry' || groupName === 'suspense') {
                w *= (0.5 + traits.trollLevel * 2.0); // Up to 2.5x base weight
            }
            // Emotional bots lean heavily into sad, celebrate, angry
            if (groupName === 'sad' || groupName === 'celebrate' || groupName === 'angry') {
                w *= (0.4 + traits.emotionality * 1.5);
            }
            // Chill bots (low troll, low emotionality) use greetings more
            if (groupName === 'greeting') {
                w *= (1.5 - traits.trollLevel - traits.emotionality);
            }

            // --- Mood modifiers ---
            // Tilted bots (negative mood) lean toward sad/angry/tease
            if (mood < -0.3 && (groupName === 'sad' || groupName === 'angry' || groupName === 'tease')) {
                w *= (1.0 + Math.abs(mood) * 1.2);
            }
            // Hot streak bots (positive mood) lean toward celebrate/tease
            if (mood > 0.3 && (groupName === 'celebrate' || groupName === 'tease')) {
                w *= (1.0 + mood * 1.2);
            }

            // --- Favorite emoji bonus (2.5x more likely) ---
            if (favorites.includes(emoji)) {
                w *= 2.5;
            }

            // --- Specific Emoji Nuances (making them extra smart!) ---
            // Money emojis when winning/losing
            if ((emoji === '🤑' || emoji === '💸') && mood !== 0) {
                w *= 1.5;
            }
            // Troll face heavily boosted for high troll bots
            if ((emoji === '😝' || emoji === '😎') && traits.trollLevel > 0.4) {
                w *= 1.8;
            }
            // Pleading/Crossing fingers for high suspense/drawing
            if ((emoji === '🥺' || emoji === '🤞') && groupName === 'suspense') {
                w *= 1.3;
            }

            // --- Mood jitter: ±35% random noise ---
            w *= (0.65 + Math.random() * 0.7);

            if (w > 0.05) {
                pool.push({ emoji, weight: w });
            }
        }
    }

    return pool;
}

function pickFromPool(pool: WeightedEmoji[]): string | null {
    if (pool.length === 0) return null;
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) return entry.emoji;
    }
    return pool[pool.length - 1].emoji;
}

// --- Context & Weight Definitions ---
export type EmojiContext =
    | 'waiting'       // betting phase, waiting for game to start
    | 'dealing'       // cards being dealt
    | 'my_pok'        // bot got Pok (8/9)
    | 'my_bad_hand'   // bot got terrible cards (<4)
    | 'my_ok_hand'    // bot got a decent hand (4-7)
    | 'drawing'       // bot decides to draw 3rd card
    | 'staying'       // bot decides to stay
    | 'see_pok'       // someone ELSE got Pok (social reaction)
    | 'dealer_strong' // dealer has a strong hand
    | 'dealer_weak'   // dealer has a weak hand
    | 'round_win'     // bot won the round
    | 'round_loss'    // bot lost the round
    | 'round_ok'      // neutral result
    | 'react_human'   // responding to something the human did
    | 'react_bot'     // responding to another bot (herd mentality)
    | 'join_room'     // bot just joined the table
    | 'leave_win'     // bot leaves the room with profit
    | 'leave_lose';   // bot leaves the room bankrupt

function getBaseWeights(context: EmojiContext): Record<string, number> {
    switch (context) {
        // --- Pre-Game & Dealing ---
        case 'waiting':
            return { greeting: 7, tease: 2, suspense: 1 };
        case 'dealing':
            return { suspense: 8, tease: 1, greeting: 1 };

        // --- During the Round (Hand Evaluation) ---
        case 'my_pok':
            return { celebrate: 6, tease: 3, greeting: 1 }; // 🎉🤩😎
        case 'my_bad_hand':
            return { sad: 5, angry: 3, suspense: 2 }; // 😭😓😡🫣
        case 'my_ok_hand':
            return { suspense: 5, tease: 3, greeting: 2 }; // 🤞😏💯
        case 'drawing':
            return { suspense: 7, sad: 2, angry: 1 }; // 🥺🥶
        case 'staying':
            return { tease: 5, celebrate: 3, suspense: 2 }; // 😎😏

        // --- Social/Round End ---
        case 'see_pok':
            return { suspense: 4, sad: 4, angry: 2 }; // 😱😵🤬
        case 'round_win':
            return { celebrate: 6, tease: 3, greeting: 1 }; // 🤑🎉😝
        case 'round_loss':
            return { sad: 6, angry: 3, tease: 1 }; // 💸😭😤
        case 'round_ok':
            return { greeting: 6, suspense: 3, tease: 1 }; // 🙏🤝

        // --- Default / Fallbacks ---
        case 'dealer_strong':
            return { sad: 4, suspense: 4, angry: 2 };
        case 'dealer_weak':
            return { celebrate: 5, tease: 4, suspense: 1 };
        case 'react_human':
            return { greeting: 3, tease: 3, celebrate: 2, suspense: 1, angry: 1 };
        case 'react_bot':
            return { tease: 3, celebrate: 2, angry: 2, sad: 1, suspense: 1 };

        // --- Room Events ---
        case 'join_room':
            return { greeting: 8, tease: 1, celebrate: 1 }; // 👋🙏
        case 'leave_win':
            return { celebrate: 5, tease: 4, greeting: 1 }; // 🤑😎👋
        case 'leave_lose':
            return { sad: 6, angry: 3, suspense: 1 };       // 😭🤬💸

        default:
            return { greeting: 1 };
    }
}

// ==============================================================
// PUBLIC API
// ==============================================================

/**
 * Main entry point. Returns emoji or null.
 * Handles: round budget, cooldown, chattiness gate, weighted selection.
 */
export function tryBotEmoji(botId: string, context: EmojiContext): string | null {
    // 1) Round budget check
    if (!canUseEmoji(botId)) return null;

    // 2) Cooldown check
    if (isOnCooldown(botId)) return null;

    // 3) Chattiness gate
    const traits = getBotTraits(botId);
    if (Math.random() > traits.chattiness) return null;

    // 4) Build weighted pool & pick
    const weights = getBaseWeights(context);
    const pool = buildPool(weights, botId);
    const emoji = pickFromPool(pool);
    if (!emoji) return null;

    // 5) Record usage
    markUsed(botId);
    return emoji;
}

/**
 * Social reaction — a bot reacting to ANOTHER player's event.
 * Lower chance than self-reactions (uses reactivity trait).
 */
export function trySocialReaction(botId: string, context: EmojiContext): string | null {
    if (!canUseEmoji(botId)) return null;
    if (isOnCooldown(botId)) return null;

    const traits = getBotTraits(botId);
    // Use reactivity trait (lower than chattiness)
    if (Math.random() > traits.reactivity) return null;

    const weights = getBaseWeights(context);
    const pool = buildPool(weights, botId);
    const emoji = pickFromPool(pool);
    if (!emoji) return null;

    markUsed(botId);
    return emoji;
}

/**
 * Response when a human sends an emoji directly.
 * Slightly higher chance to reply than autonomous reactions.
 */
export function getContextualEmojiResponse(receivedEmoji: string, botId: string): string | null {
    if (!canUseEmoji(botId)) return null;
    if (isOnCooldown(botId)) return null;

    const traits = getBotTraits(botId);
    // Higher threshold: chattiness + 0.12 bonus
    if (Math.random() > (traits.chattiness + 0.12)) return null;

    // Map received emoji to a response context
    const groups = getEmojiGroups();

    let context: EmojiContext = 'react_human';
    for (const [groupName, emojis] of Object.entries(groups)) {
        if (emojis.includes(receivedEmoji)) {
            if (groupName === 'greeting') context = 'waiting';
            else if (groupName === 'celebrate') context = traits.trollLevel > 0.25 ? 'round_loss' : 'round_win';
            else if (groupName === 'sad') context = traits.trollLevel > 0.25 ? 'staying' : 'my_bad_hand';
            else if (groupName === 'angry') context = traits.emotionality > 0.4 ? 'my_bad_hand' : 'staying';
            else if (groupName === 'tease') context = traits.emotionality > 0.5 ? 'my_bad_hand' : 'staying';
            else if (groupName === 'suspense') context = 'dealing';
            break;
        }
    }

    const weights = getBaseWeights(context);
    const pool = buildPool(weights, botId);
    const emoji = pickFromPool(pool);

    if (emoji) markUsed(botId);
    return emoji;
}

/**
 * Reset round budgets and cooldowns at the start of each new round.
 */
export function resetEmojiCooldowns(): void {
    lastEmojiTime.clear();
    roundBudget.clear();
}
