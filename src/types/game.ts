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
    isSpectating?: boolean;
}

export interface PlayerStats {
    totalRounds: number;
    wins: number;
    losses: number;
    draws: number;
    maxChipsWon: number;       // biggest single-round win
    currentStreak: number;     // positive = win streak, negative = lose streak
    bestStreak: number;        // longest win streak ever
    chipHistory: number[];     // chip balance after each round (last 30)
}

export type Screen = 'SPLASH' | 'ONBOARDING' | 'MENU' | 'GAME_SETUP' | 'PLAYING' | 'ONLINE_PLAYING' | 'ONLINE_JOIN' | 'SETTINGS' | 'REWARD_CODE' | 'PROFILE';

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
    category: 'STANDARD' | 'HIGH_STAKES' | 'EXPERT' | 'LEGENDARY' | 'ULTIMATE';
}

export const ROOMS: RoomConfig[] = [
    // === 🟢 STANDARD — จุดเริ่มต้นของทุกคน ===
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
        id: 'regular',
        name: 'ขาประจำ',
        emoji: '☕',
        minBet: 50,
        maxBet: 500,
        chipPresets: [50, 100, 200, 500],
        dealerMinCapital: 2500,
        aiChips: 20000,
        color: '#16a34a',
        category: 'STANDARD',
    },
    {
        id: 'skilled',
        name: 'ชำนาญเกม',
        emoji: '🎯',
        minBet: 100,
        maxBet: 1000,
        chipPresets: [100, 200, 500, 1000],
        dealerMinCapital: 5000,
        aiChips: 10000,
        color: '#15803d',
        category: 'STANDARD',
    },
    {
        id: 'pro',
        name: 'มือโปร',
        emoji: '🕶️',
        minBet: 500,
        maxBet: 5000,
        chipPresets: [500, 1000, 2000, 5000],
        dealerMinCapital: 25000,
        aiChips: 50000,
        color: '#166534',
        category: 'STANDARD',
    },

    // === 🔵 HIGH_STAKES — เงินเริ่มแรง ความพลาดเริ่มเจ็บ ===
    {
        id: 'hs_funded',
        name: 'ทุนหนา',
        emoji: '💰',
        minBet: 1000,
        maxBet: 10000,
        chipPresets: [1000, 2000, 5000, 10000],
        dealerMinCapital: 50000,
        aiChips: 100000,
        color: '#3b82f6',
        category: 'HIGH_STAKES',
    },
    {
        id: 'hs_heavy',
        name: 'มือหนัก',
        emoji: '💸',
        minBet: 2000,
        maxBet: 20000,
        chipPresets: [2000, 5000, 10000, 20000],
        dealerMinCapital: 100000,
        aiChips: 200000,
        color: '#2563eb',
        category: 'HIGH_STAKES',
    },
    {
        id: 'hs_bigshot',
        name: 'ขาใหญ่',
        emoji: '🥊',
        minBet: 5000,
        maxBet: 50000,
        chipPresets: [5000, 10000, 20000, 50000],
        dealerMinCapital: 250000,
        aiChips: 500000,
        color: '#1d4ed8',
        category: 'HIGH_STAKES',
    },
    {
        id: 'hs_intense',
        name: 'สายเดือด',
        emoji: '🔥',
        minBet: 10000,
        maxBet: 100000,
        chipPresets: [10000, 20000, 50000, 100000],
        dealerMinCapital: 500000,
        aiChips: 1000000,
        color: '#1e40af',
        category: 'HIGH_STAKES',
    },

    // === 🟣 EXPERT — ไม่ใช่แค่ดวง ต้องอ่านเกมออก ===
    {
        id: 'exp_junior',
        name: 'เซียนขั้นต้น',
        emoji: '🔮',
        minBet: 20000,
        maxBet: 200000,
        chipPresets: [20000, 50000, 100000, 200000],
        dealerMinCapital: 1000000,
        aiChips: 2000000,
        color: '#a855f7',
        category: 'EXPERT',
    },
    {
        id: 'exp_senior',
        name: 'เซียนชั้นสูง',
        emoji: '🎩',
        minBet: 50000,
        maxBet: 500000,
        chipPresets: [50000, 100000, 200000, 500000],
        dealerMinCapital: 2500000,
        aiChips: 5000000,
        color: '#9333ea',
        category: 'EXPERT',
    },
    {
        id: 'exp_master',
        name: 'ปรมาจารย์',
        emoji: '🪄',
        minBet: 100000,
        maxBet: 1000000,
        chipPresets: [100000, 200000, 500000, 1000000],
        dealerMinCapital: 5000000,
        aiChips: 10000000,
        color: '#7e22ce',
        category: 'EXPERT',
    },
    {
        id: 'exp_dominator',
        name: 'ครองเกม',
        emoji: '♟️',
        minBet: 200000,
        maxBet: 2000000,
        chipPresets: [200000, 500000, 1000000, 2000000],
        dealerMinCapital: 10000000,
        aiChips: 20000000,
        color: '#6b21a8',
        category: 'EXPERT',
    },

    // === 🔴 LEGENDARY — คนระดับหัวแถวของระบบ ===
    {
        id: 'leg_rising',
        name: 'ตำนานหน้าใหม่',
        emoji: '🌟',
        minBet: 500000,
        maxBet: 5000000,
        chipPresets: [500000, 1000000, 2000000, 5000000],
        dealerMinCapital: 25000000,
        aiChips: 50000000,
        color: '#ef4444',
        category: 'LEGENDARY',
    },
    {
        id: 'leg_champion',
        name: 'ตำนานผู้ชนะ',
        emoji: '🏆',
        minBet: 1000000,
        maxBet: 10000000,
        chipPresets: [1000000, 2000000, 5000000, 10000000],
        dealerMinCapital: 50000000,
        aiChips: 100000000,
        color: '#dc2626',
        category: 'LEGENDARY',
    },
    {
        id: 'leg_supreme',
        name: 'เหนือชั้น',
        emoji: '⚡',
        minBet: 2000000,
        maxBet: 20000000,
        chipPresets: [2000000, 5000000, 10000000, 20000000],
        dealerMinCapital: 100000000,
        aiChips: 200000000,
        color: '#b91c1c',
        category: 'LEGENDARY',
    },
    {
        id: 'leg_conqueror',
        name: 'ผู้ครองอันดับ',
        emoji: '🔱',
        minBet: 5000000,
        maxBet: 50000000,
        chipPresets: [5000000, 10000000, 20000000, 50000000],
        dealerMinCapital: 250000000,
        aiChips: 500000000,
        color: '#991b1b',
        category: 'LEGENDARY',
    },

    // === ⚫ ULTIMATE — โซนสงวนสิทธิ์ เศรษฐีโลก ===
    {
        id: 'ult_undefeated',
        name: 'ไร้พ่าย',
        emoji: '🛡️',
        minBet: 10000000,
        maxBet: 100000000,
        chipPresets: [10000000, 20000000, 50000000, 100000000],
        dealerMinCapital: 500000000,
        aiChips: 1000000000,
        color: '#374151',
        category: 'ULTIMATE',
    },
    {
        id: 'ult_immortal',
        name: 'อมตะ',
        emoji: '♾️',
        minBet: 20000000,
        maxBet: 200000000,
        chipPresets: [20000000, 50000000, 100000000, 200000000],
        dealerMinCapital: 1000000000,
        aiChips: 2000000000,
        color: '#1f2937',
        category: 'ULTIMATE',
    },
    {
        id: 'ult_timeless',
        name: 'เหนือกาลเวลา',
        emoji: '⏳',
        minBet: 50000000,
        maxBet: 500000000,
        chipPresets: [50000000, 100000000, 200000000, 500000000],
        dealerMinCapital: 2500000000,
        aiChips: 5000000000,
        color: '#111827',
        category: 'ULTIMATE',
    },
    {
        id: 'ult_peak',
        name: 'จุดสูงสุด',
        emoji: '👑',
        minBet: 100000000,
        maxBet: 1000000000, // 1 Billion ceiling
        chipPresets: [100000000, 200000000, 500000000, 1000000000],
        dealerMinCapital: 5000000000,
        aiChips: 10000000000,
        color: '#000000',
        category: 'ULTIMATE',
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
    // 🐣 โค้ดสำหรับผู้เล่นใหม่ (Newbie)
    { code: 'NEWBIE', chips: 50000 },
    { code: 'START50K', chips: 50000 },
    { code: 'HELLO', chips: 10000 },

    // 💰 โค้ดสายมูเตลู/นำโชค (Lucky & Blessing)
    { code: 'สาธุ99', chips: 9999 },
    { code: 'รวย888', chips: 8888 },
    { code: 'เลขเด็ด', chips: 7777 },
    { code: 'เจ้าแม่ให้มา', chips: 10000 },
    { code: 'มูเตลู', chips: 5555 },

    // 🃏 โค้ดประจำเกมป๊อกเด้ง (PonkDeng Themed)
    { code: 'POKDENG', chips: 20000 },
    { code: 'ป๊อก9สองเด้ง', chips: 99000 },
    { code: 'ป๊อก8สองเด้ง', chips: 88000 },
    { code: 'สามเหลือง', chips: 33333 },
    { code: 'ตอง', chips: 111111 },
    { code: 'สเตรทฟลัช', chips: 500000 },
    { code: 'ผีพนันเข้าสิง', chips: 66666 },
    { code: 'วัดใจเจ้ามือ', chips: 44444 },

    // 💸 โค้ดปลอบใจ (Consolation/Broke)
    { code: 'หมดตูด', chips: 5000 },
    { code: 'ขอยืมก้อนสุดท้าย', chips: 3000 },
    { code: 'ขอกู้หน่อย', chips: 2000 },
    { code: 'ล้างซวย', chips: 1000 },

    // 💎 โค้ดลับพิเศษ (Secret/VIP) - แจกเยอะ
    { code: 'VIPMEMBER', chips: 1000000 },
    { code: 'JACKPOT', chips: 5000000 },
    { code: 'เศรษฐีดูไบ', chips: 10000000 },

    // 🛠️ โค้ดสำหรับ Developer (ทดสอบเกม)
    { code: 'DEVMODE', chips: 1000000000000 }, // 1 Trillion
    { code: 'TESTER', chips: 100000000 }
];

export const AI_NAMES = [
    // 💼 สายอาชีพ (สู้ชีวิตแต่ติดไพ่) 20 ชื่อ
    'มนุษย์เงินเดือน', 'แม่บ้านแอบผัวเล่น', 'ลุงยามปากซอย', 'พี่วินสายซิ่ง', 'เฮียร้านทอง',
    'ป้าขายแกง', 'เด็กหลังห้อง', 'หนุ่มโรงงาน', 'พนักงานออฟฟิศ', 'หัวหน้าโต๊ะ',
    'น้าช่างแอร์', 'ป้าล้างจาน', 'เสมียนพุงพลุ้ย', 'เซลส์ยอดร่วง', 'เอชอาร์โหด',
    'แกร็บสู้ชีวิต', 'ฟู้ดแพนด้าสายบิด', 'โชเฟอร์แท็กซี่', 'ลูกจ้างรายวัน', 'เจ้าของร้านชำ',

    // 😂 สายฮา (เน้นป่วนวงไพ่) 20 ชื่อ
    'ยืนงงในดงไพ่', 'วัยรุ่นสร้างตัว', 'ขอโค้งสุดท้าย', 'เล่นขำๆ', 'จริงจังเกมมิ่ง',
    'ไพ่ทำลายมิตรภาพ', 'ตาบอดสี', 'สับไพ่ไม่เป็น', 'เพิ่งหัดเล่น', 'สอนหน่อย',
    'ผีพนัน', 'มือสั่น', 'ตาสว่าง', 'เศรษฐีสิ้นเดือน', 'แกล้งจน',
    'โจรขโมยชิป', 'สายส่อง', 'ซุ่มยิง', 'นั่งกินลม', 'แวะมาแจม',

    // 🔮 สายมู (เน้นดวงล้วนๆ) 20 ชื่อ
    'สายมูเตลู', 'สวดมนต์ก่อนจั่ว', 'ใส่เสื้อสีมงคล', 'หมอดูแม่นๆ', 'คนดวงเกลือ',
    'เทพธิดาโชค', 'ดวงเฮง', 'รวยล้นฟ้า', 'บุญหล่นทับ', 'แมวเก้าชีวิต',
    'ลูกพระเจ้าตาก', 'ยันต์กันบอด', 'น้ำมนต์ศักดิ์สิทธิ์', 'สาธุ99', 'บนหลวงพ่อ',
    'คนดวงแข็ง', 'ผ้าขี้ริ้วห่อทอง', 'ป๊อกเด้งรวย', 'สามเด้งอร่อย', 'จั่วจนจุก',

    // 💸 สายเทหน้าตัก (หมดเป็นหมด) 20 ชื่อ
    'กระเป๋าพัง', 'กู้มารวย', 'เทหน้าตัก', 'ซ่อนเงินเมีย', 'ขอทุนคืน',
    'หนามยอกเอาไพ่บ่ง', 'หมดตัว', 'ยืมเพื่อนก่อน', 'แอบโอน', 'เงินเก็บก้อนสุดท้าย',
    'รูดบัตรเครดิต', 'ขออีกตา', 'ตานี้เอาจริง', 'ไม่รวยก็เละ', 'สางแค้น',
    'ใจสู้', 'ป๊อดทำไม', 'โดนเจ้ากินรวบ', 'เจ้ามือหนี', 'เศรษฐีใหม่',

    // 🃏 สายเซียนไพ่ (ตัวตึงประจำวง) 20 ชื่อ
    'เซียนไพ่', 'โคตรเซียน', 'นักปาด', 'ขาประจำ', 'หวังรวย',
    'สู้สุดใจ', 'อาเจ็ก', 'อาม่าสายเปย์', 'ขาใหญ่', 'ทรงเอ',
    'ตัวตึง', 'เจ๊ดัน', 'หวานเจี๊ยบ', 'มืดแปดด้าน', 'กินเรียบ',
    'สายซุ่ม', 'รอเสียบ', 'จัดหนัก', 'จัดเต็ม', 'พี่สั่งลุย'
];

export const AVATAR_COLORS: AvatarColor[] = ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];
