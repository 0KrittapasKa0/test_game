export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    suit: Suit;
    rank: Rank;
    value: number;
    id: string;
}

export type AvatarColor = '#ef4444' | '#3b82f6' | '#22c55e' | '#a855f7' | '#f97316' | '#06b6d4' | '#ec4899' | '#84cc16';

export interface UserProfile {
    name: string;
    avatarColor: AvatarColor;
    avatarUrl?: string; // base64 compressed photo
    chips: number;
    createdAt: number;
}

export interface Player {
    id: string;
    name: string;
    avatarColor: string;
    avatarUrl?: string; // From randomuser.me API
    isHuman: boolean;
    isDealer: boolean;
    cards: Card[];
    bet: number;
    lastBet?: number;
    previousChips?: number;
    chips: number;
    score: number;
    hasPok: boolean;
    dengMultiplier: number;
    hasActed: boolean;
    result: 'win' | 'lose' | 'draw' | 'pending';
    roundProfit?: number;
    seatIndex: number; // Fixed seat position at the table
    // AI behavioral tracking (for realistic leave decisions)
    roundsPlayed?: number;
    consecutiveLosses?: number;
    peakChips?: number;
}

export interface PlayerStats {
    totalRounds: number;
    wins: number;
    losses: number;
    draws: number;
    maxChipsWon: number;       // biggest single-round win
    pokCount: number;          // number of times got Pok
    currentStreak: number;     // positive = win streak, negative = lose streak
    bestStreak: number;        // longest win streak ever
    chipHistory: number[];     // chip balance after each round (last 30)
}

export type Screen = 'ONBOARDING' | 'MENU' | 'GAME_SETUP' | 'PLAYING' | 'SETTINGS' | 'REWARD_CODE' | 'PROFILE';

export type GamePhase = 'BETTING' | 'DEALING' | 'PLAYER_ACTION' | 'AI_ACTION' | 'SHOWDOWN' | 'ROUND_END';

export interface RoomConfig {
    id: string;
    name: string;
    emoji: string;
    minBet: number;
    maxBet: number;
    chipPresets: number[];
    dealerMinCapital: number;
    aiChips: number;
    color: string;
    category: 'STANDARD' | 'VIP' | 'LEGENDARY' | 'MYTHICAL';
}

export const ROOMS: RoomConfig[] = [
    // === STANDARD ===
    {
        id: 'beginner',
        name: 'มือใหม่ฝึกหัด',
        emoji: '🌱',
        minBet: 10,
        maxBet: 100,
        chipPresets: [10, 20, 50, 100],
        dealerMinCapital: 500,
        aiChips: 10000,
        color: '#22c55e',
        category: 'STANDARD',
    },
    {
        id: 'standard',
        name: 'ห้องทั่วไป',
        emoji: '🏠',
        minBet: 50,
        maxBet: 500,
        chipPresets: [50, 100, 200, 500],
        dealerMinCapital: 2500,
        aiChips: 15000,
        color: '#3b82f6',
        category: 'STANDARD',
    },
    {
        id: 'advanced',
        name: 'ห้องเซียน',
        emoji: '⭐',
        minBet: 200,
        maxBet: 2000,
        chipPresets: [200, 500, 1000, 2000],
        dealerMinCapital: 10000,
        aiChips: 30000,
        color: '#8b5cf6',
        category: 'STANDARD',
    },
    {
        id: 'expert',
        name: 'ห้องมือโปร',
        emoji: '🏅',
        minBet: 1000,
        maxBet: 10000,
        chipPresets: [1000, 2000, 5000, 10000],
        dealerMinCapital: 50000,
        aiChips: 80000,
        color: '#f97316',
        category: 'STANDARD',
    },

    // === VIP ===
    {
        id: 'vip_bronze',
        name: 'VIP ทองแดง',
        emoji: '🥉',
        minBet: 5000,
        maxBet: 50000,
        chipPresets: [5000, 10000, 20000, 50000],
        dealerMinCapital: 250000,
        aiChips: 400000,
        color: '#b45309',
        category: 'VIP',
    },
    {
        id: 'vip_silver',
        name: 'VIP เงิน',
        emoji: '🥈',
        minBet: 20000,
        maxBet: 200000,
        chipPresets: [20000, 50000, 100000, 200000],
        dealerMinCapital: 1000000,
        aiChips: 2000000,
        color: '#94a3b8',
        category: 'VIP',
    },
    {
        id: 'vip_gold',
        name: 'VIP ทอง',
        emoji: '🥇',
        minBet: 100000,
        maxBet: 1000000,
        chipPresets: [100000, 200000, 500000, 1000000],
        dealerMinCapital: 5000000,
        aiChips: 10000000,
        color: '#eab308',
        category: 'VIP',
    },
    {
        id: 'vip_god',
        name: 'ห้องพระเจ้า',
        emoji: '👑',
        minBet: 500000,
        maxBet: 5000000,
        chipPresets: [500000, 1000000, 2000000, 5000000],
        dealerMinCapital: 25000000,
        aiChips: 50000000,
        color: '#f43f5e',
        category: 'VIP',
    },

    // === LEGENDARY ===
    {
        id: 'legend_dragon',
        name: 'มังกรทอง',
        emoji: '🐉',
        minBet: 2000000,
        maxBet: 20000000,
        chipPresets: [2000000, 5000000, 10000000, 20000000],
        dealerMinCapital: 100000000,
        aiChips: 200000000,
        color: '#dc2626',
        category: 'LEGENDARY',
    },
    {
        id: 'legend_phoenix',
        name: 'ห้องฟีนิกซ์',
        emoji: '🔥',
        minBet: 10000000,
        maxBet: 100000000,
        chipPresets: [10000000, 20000000, 50000000, 100000000],
        dealerMinCapital: 500000000,
        aiChips: 800000000,
        color: '#ea580c',
        category: 'LEGENDARY',
    },
    {
        id: 'legend_titan',
        name: 'ไททัน',
        emoji: '⚡',
        minBet: 50000000,
        maxBet: 500000000,
        chipPresets: [50000000, 100000000, 200000000, 500000000],
        dealerMinCapital: 2500000000,
        aiChips: 5000000000,
        color: '#7c3aed',
        category: 'LEGENDARY',
    },

    // === MYTHICAL ===
    {
        id: 'myth_celestial',
        name: 'สวรรค์ชั้นฟ้า',
        emoji: '🌟',
        minBet: 200000000,
        maxBet: 2000000000,
        chipPresets: [200000000, 500000000, 1000000000, 2000000000],
        dealerMinCapital: 10000000000,
        aiChips: 20000000000,
        color: '#0ea5e9',
        category: 'MYTHICAL',
    },
    {
        id: 'myth_eternal',
        name: 'นิรันดร์',
        emoji: '♾️',
        minBet: 1000000000,
        maxBet: 10000000000,
        chipPresets: [1000000000, 2000000000, 5000000000, 10000000000],
        dealerMinCapital: 50000000000,
        aiChips: 100000000000,
        color: '#e11d48',
        category: 'MYTHICAL',
    },
    {
        id: 'myth_omega',
        name: 'จุดสิ้นสุดจักรวาล',
        emoji: '🌌',
        minBet: 5000000000,
        maxBet: 100000000000,
        chipPresets: [5000000000, 10000000000, 50000000000, 100000000000],
        dealerMinCapital: 500000000000,
        aiChips: 999999999999,
        color: '#000000',
        category: 'MYTHICAL',
    },
];

export interface GameConfig {
    playerCount: number;
    humanIsDealer: boolean;
    room: RoomConfig;
}

export interface RewardCode {
    code: string;
    chips: number;
}

export const VALID_REWARD_CODES: RewardCode[] = [
    { code: 'สาธุ999', chips: 9999 },
    { code: 'รวย888', chips: 888 },
    { code: 'โชคดี777', chips: 777 },
    { code: 'ป๊อกเด้ง', chips: 1000 },
    { code: 'เฮงเฮง', chips: 300 },
    { code: 'test13', chips: 100000000 },
];

export const AI_NAMES = ['สมชาย', 'สมหญิง', 'สมศรี', 'สมศักดิ์', 'สมปอง', 'สมใจ'];

export const AVATAR_COLORS: AvatarColor[] = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];
