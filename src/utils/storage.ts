import type { UserProfile, AvatarColor, PlayerStats, Mail } from '../types/game';

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

export type GraphicQuality = 'LOW' | 'STANDARD' | 'HIGH';

export interface GameSettings {
    soundEnabled: boolean;
    voiceEnabled: boolean;
    fullChipFormat: boolean;
    lastPlayerCount: number;
    lastHumanIsDealer: boolean;
    lastRoomId: string;
    graphicQuality: GraphicQuality;
}

const DEFAULT_SETTINGS: GameSettings = {
    soundEnabled: true,
    voiceEnabled: false,
    fullChipFormat: false,
    lastPlayerCount: 3,
    lastHumanIsDealer: false,
    lastRoomId: 'standard',
    graphicQuality: 'HIGH',
};

let cachedSettings: GameSettings | null = null;

export function loadSettings(): GameSettings {
    if (!cachedSettings) {
        const raw = getItem<any>(SETTINGS_KEY, DEFAULT_SETTINGS);
        
        let graphicQuality = raw.graphicQuality || 'HIGH';
        if (raw.lowSpecMode === true) graphicQuality = 'LOW';
        else if (raw.lowMemoryMode === true) graphicQuality = 'STANDARD';

        cachedSettings = { ...DEFAULT_SETTINGS, ...raw, graphicQuality };
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
    const baseRewards = [500, 1000, 2000, 3000, 5000, 10000];
    
    // Days 1-6: Escalating rewards with a small random bonus (0 - 1,000)
    for (let i = 0; i < 6; i++) {
        const bonus = Math.floor(Math.random() * 11) * 100;
        rewards.push(baseRewards[i] + bonus);
    }
    // Day 7: Jackpot 20,000 - 50,000
    rewards.push(20000 + Math.floor(Math.random() * 301) * 100);

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

// ── Mail System ──

const MAILS_KEY = 'pokdeng_mails';

export function loadMails(): Mail[] {
    return getItem<Mail[]>(MAILS_KEY, []);
}

export function saveMails(mails: Mail[]): void {
    setItem(MAILS_KEY, mails);
}

export function checkAndGenerateReliefMail(): void {
    const profile = loadProfile();
    // ถือว่าล้มละลายถ้าชิปน้อยกว่า 100 (ไม่พอเล่นห้องเริ่มต้น)
    if (!profile || profile.chips >= 100) return;

    const mails = loadMails();
    
    // Check if there is already an unclaimed relief mail
    const hasUnclaimedRelief = mails.some(m => m.type === 'relief' && !m.isClaimed);
    if (hasUnclaimedRelief) return;

    // Generate reasonable relief amount: 1,000 to 3,000 chips
    const randomChips = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
    
    const messages = [
        "ลูกหลานส่งเบี้ยยังชีพมาให้แล้วจ้า 👵👴 รับไปเล่นคลายเครียดนะคะ",
        "พักผ่อนหย่อนใจนะคะ 🍵 รับชิปไปเล่นต่อเพลินๆ ค่ะ",
        "บุญรักษา พระคุ้มครองนะคะ 🙏 ลูกหลานเอาทุนมาฝากให้เล่นต่อขำๆ ค่ะ",
        "ยิ้มแย้มแจ่มใสนะคะ 🌸 รับเงินขวัญถุงไปสนุกต่อได้เลยจ้า",
        "โชคลาภมาเยือนแล้วจ้า 💰 ไม่เป็นไรนะคะ เอาทุนไปเล่นสนุกๆ ต่อได้เลย",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const newMail: Mail = {
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        title: 'เงินทุนช่วยเหลือ',
        content: randomMessage,
        chipsReward: randomChips,
        isRead: false,
        isClaimed: false,
        createdAt: Date.now(),
        type: 'relief',
    };
    
    mails.unshift(newMail);
    saveMails(mails);
}

export function claimMailReward(mailId: string): boolean {
    const mails = loadMails();
    const mailIndex = mails.findIndex(m => m.id === mailId);
    
    if (mailIndex === -1) return false;
    
    const mail = mails[mailIndex];
    if (mail.isClaimed || mail.chipsReward <= 0) return false;
    
    // Remove the mail from the array entirely
    mails.splice(mailIndex, 1);
    saveMails(mails);
    
    return true;
}

export function markMailAsRead(mailId: string): void {
    const mails = loadMails();
    const mailIndex = mails.findIndex(m => m.id === mailId);
    
    if (mailIndex !== -1 && !mails[mailIndex].isRead) {
        mails[mailIndex].isRead = true;
        saveMails(mails);
    }
}
