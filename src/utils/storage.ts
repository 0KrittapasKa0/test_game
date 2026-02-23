import type { UserProfile, AvatarColor, PlayerStats } from '../types/game';

const PROFILE_KEY = 'pokdeng_profile';
const USED_CODES_KEY = 'pokdeng_used_codes';
const SETTINGS_KEY = 'pokdeng_settings';

export function getItem<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function setItem<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        console.warn('localStorage write failed');
    }
}

export function loadProfile(): UserProfile | null {
    return getItem<UserProfile | null>(PROFILE_KEY, null);
}

export function saveProfile(profile: UserProfile): void {
    setItem(PROFILE_KEY, profile);
}

export function updateChips(chips: number): void {
    const profile = loadProfile();
    if (profile) {
        profile.chips = chips;
        saveProfile(profile);
    }
}

export function loadUsedCodes(): string[] {
    return getItem<string[]>(USED_CODES_KEY, []);
}

export function saveUsedCode(code: string): void {
    const codes = loadUsedCodes();
    if (!codes.includes(code)) {
        codes.push(code);
        setItem(USED_CODES_KEY, codes);
    }
}

export interface GameSettings {
    soundEnabled: boolean;
    voiceEnabled: boolean;
    lastPlayerCount: number;
    lastHumanIsDealer: boolean;
    lastRoomId: string;
}

const DEFAULT_SETTINGS: GameSettings = {
    soundEnabled: true,
    voiceEnabled: true,
    lastPlayerCount: 3,
    lastHumanIsDealer: false,
    lastRoomId: 'standard',
};

export function loadSettings(): GameSettings {
    return getItem<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Partial<GameSettings>): void {
    const current = loadSettings();
    setItem(SETTINGS_KEY, { ...current, ...settings });
}

export function createDefaultProfile(name: string, avatarColor: AvatarColor, avatarUrl?: string): UserProfile {
    return {
        name,
        avatarColor,
        ...(avatarUrl ? { avatarUrl } : {}),
        chips: 1000000,
        createdAt: Date.now(),
    };
}

// ── Player Stats ──

const STATS_KEY = 'pokdeng_stats';

const DEFAULT_STATS: PlayerStats = {
    totalRounds: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    maxChipsWon: 0,
    pokCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    chipHistory: [],
};

export function loadStats(): PlayerStats {
    return getItem<PlayerStats>(STATS_KEY, DEFAULT_STATS);
}

export function saveStats(stats: PlayerStats): void {
    setItem(STATS_KEY, stats);
}

export function recordGameResult(
    result: 'win' | 'lose' | 'draw',
    chipsAfter: number,
    roundProfit: number,
    hadPok: boolean,
): void {
    const stats = loadStats();

    stats.totalRounds++;

    if (result === 'win') {
        stats.wins++;
        stats.currentStreak = Math.max(0, stats.currentStreak) + 1;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
    } else if (result === 'lose') {
        stats.losses++;
        stats.currentStreak = Math.min(0, stats.currentStreak) - 1;
    } else {
        stats.draws++;
        // Draw doesn't reset streak
    }

    if (roundProfit > stats.maxChipsWon) {
        stats.maxChipsWon = roundProfit;
    }

    if (hadPok) {
        stats.pokCount++;
    }

    // Keep last 30 chip snapshots
    stats.chipHistory.push(chipsAfter);
    if (stats.chipHistory.length > 30) {
        stats.chipHistory = stats.chipHistory.slice(-30);
    }

    saveStats(stats);
}

// ── Daily Rewards ──

const DAILY_REWARD_KEY = 'pokdeng_daily_reward';

export interface DailyRewardState {
    lastClaimDate: string; // YYYY-MM-DD
    currentDay: number;    // 0-6
    rewards: number[];     // 7 values for current cycle
}

export function loadDailyState(): DailyRewardState {
    const raw = getItem<DailyRewardState | null>(DAILY_REWARD_KEY, null);
    if (!raw) {
        return generateNewDailyCycle();
    }
    return raw;
}

export function saveDailyState(state: DailyRewardState): void {
    setItem(DAILY_REWARD_KEY, state);
}

function generateNewDailyCycle(): DailyRewardState {
    const rewards: number[] = [];
    // Days 1-6: 25,000 - 50,000
    for (let i = 0; i < 6; i++) {
        rewards.push(25000 + Math.floor(Math.random() * 251) * 100);
    }
    // Day 7: 100,000 - 300,000
    rewards.push(100000 + Math.floor(Math.random() * 2001) * 100);

    const newState: DailyRewardState = {
        lastClaimDate: '',
        currentDay: 0,
        rewards,
    };
    saveDailyState(newState);
    return newState;
}

export function claimDailyReward(): { success: boolean; reward: number; dayIndex: number } {
    const state = loadDailyState();
    const today = new Date().toISOString().split('T')[0];

    if (state.lastClaimDate === today) {
        return { success: false, reward: 0, dayIndex: state.currentDay };
    }

    const reward = state.rewards[state.currentDay];
    const claimDayIndex = state.currentDay;

    // Update state
    state.lastClaimDate = today;

    // Advance day
    if (state.currentDay >= 6) {
        // Completed cycle! Reset for next time
        const nextCycle = generateNewDailyCycle();
        state.currentDay = 0;
        state.rewards = nextCycle.rewards;
        state.lastClaimDate = today;
    } else {
        state.currentDay++;
    }


    saveDailyState(state);
    return { success: true, reward, dayIndex: claimDayIndex };
}

// ── Math Game State ──

const MATH_GAME_KEY = 'pokdeng_math_game';

export interface MathGameStats {
    nextFreePlayTime: number; // Timestamp
}

export function loadMathGameState(): MathGameStats {
    return getItem<MathGameStats>(MATH_GAME_KEY, { nextFreePlayTime: 0 });
}

export function saveMathGameState(state: MathGameStats): void {
    setItem(MATH_GAME_KEY, state);
}
