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
    const profile = getItem<UserProfile | null>(PROFILE_KEY, null);
    
    if (profile) {
        let changed = false;
        // 1Q = 1,000,000,000,000,000
        const ONE_Q = 1_000_000_000_000_000;
        
        if (profile.chips >= ONE_Q) {
            // Balance the game by reducing excessive chips (divide by 10,000)
            while (profile.chips >= ONE_Q) {
                profile.chips = Math.floor(profile.chips / 10000);
            }
            changed = true;
        }

        if (changed) {
            setItem(PROFILE_KEY, profile);
        }
    }
    
    return profile;
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
    fullChipFormat: boolean;
    lastPlayerCount: number;
    lastHumanIsDealer: boolean;
    lastRoomId: string;
    lowMemoryMode: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
    soundEnabled: true,
    voiceEnabled: false,
    fullChipFormat: false,
    lastPlayerCount: 3,
    lastHumanIsDealer: false,
    lastRoomId: 'standard',
    lowMemoryMode: false,
};

let cachedSettings: GameSettings | null = null;

export function loadSettings(): GameSettings {
    if (!cachedSettings) {
        const raw = getItem<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
        cachedSettings = { ...DEFAULT_SETTINGS, ...raw };
    }
    return cachedSettings;
}

export function saveSettings(settings: Partial<GameSettings>): void {
    const current = loadSettings();
    cachedSettings = { ...current, ...settings };
    setItem(SETTINGS_KEY, cachedSettings);
    
    // Dispatch event to force re-render components if needed
    window.dispatchEvent(new Event('settings_changed'));
}

export function createDefaultProfile(name: string, avatarColor: AvatarColor, avatarUrl?: string): UserProfile {
    return {
        name,
        avatarColor,
        ...(avatarUrl ? { avatarUrl } : {}),
        chips: 5000,
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

// ── Account Transfer ──

export function exportGameData(): string {
    try {
        const data: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pokdeng_')) {
                data[key] = localStorage.getItem(key) || '';
            }
        }
        return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch {
        return '';
    }
}

export function importGameData(encodedData: string): boolean {
    try {
        if (!encodedData || encodedData.trim() === '') return false;
        const jsonString = decodeURIComponent(atob(encodedData.trim()));
        const data = JSON.parse(jsonString);

        // Basic validation
        if (typeof data !== 'object' || !data) return false;
        if (!data['pokdeng_profile']) return false; // Must have at least a profile

        // Save to local storage
        Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith('pokdeng_') && typeof value === 'string') {
                localStorage.setItem(key, value);
            }
        });

        return true;
    } catch (e) {
        console.error('Import failed', e);
        return false;
    }
}
