import type { Card, Suit, Rank } from '../types/game';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getCardValue(rank: Rank): number {
    if (rank === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
    return parseInt(rank);
}

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit,
                rank,
                value: getCardValue(rank),
                id: `${rank}${suit}`,
            });
        }
    }
    return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function calculateScore(cards: Card[]): number {
    const total = cards.reduce((sum, card) => sum + card.value, 0);
    return total % 10;
}

// Check for Pok (only on first 2 cards)
export function checkPok(cards: Card[]): 'pok9' | 'pok8' | null {
    if (cards.length !== 2) return null;
    const score = calculateScore(cards);
    if (score === 9) return 'pok9';
    if (score === 8) return 'pok8';
    return null;
}

// Special hand checks (only on 3 cards)
export function isTong(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}

export function isStraightFlush(cards: Card[]): boolean {
    return isStraight(cards) && isSameSuit(cards);
}

export function isStraight(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const indices = cards.map(c => rankOrder.indexOf(c.rank)).sort((a, b) => a - b);

    // Check normal sequence (2-3-4 ... 10-J-Q)
    // Constraint: Rank 'A' is index 0. If indices includes 0, it can ONLY be Q-K-A (11,12,0).
    // So if 0 is present, we skip the normal +1 check unless it's the special case.

    // Actually simpler: if standard check passes (difference of 1), verify it's NOT involving A as low.
    // In our rankOrder: A=0, 2=1, 3=2...
    // If indices are [0, 1, 2], that is A-2-3. We want to return FALSE for this.
    if (indices[2] - indices[1] === 1 && indices[1] - indices[0] === 1) {
        // If the sequence starts with A (0), and it is 0-1-2 (A-2-3), REJECT it.
        // But 0 is only A. 
        if (indices[0] === 0) return false; // A-2-3 is NOT a straight
        return true;
    }

    // Check Q-K-A (special case: 12, 11, 0 -> sorted: 0, 11, 12)
    if (indices[0] === 0 && indices[1] === 11 && indices[2] === 12) return true;

    return false;
}

export function isSamLeung(cards: Card[]): boolean {
    if (cards.length !== 3) return false;
    const faceRanks: Rank[] = ['J', 'Q', 'K'];
    return cards.every(c => faceRanks.includes(c.rank));
}

export function isSameSuit(cards: Card[]): boolean {
    if (cards.length < 2) return false;
    return cards.every(c => c.suit === cards[0].suit);
}

export function isPair(cards: Card[]): boolean {
    if (cards.length !== 2) return false;
    return cards[0].rank === cards[1].rank;
}

// Hand type priority (lower number = higher priority)
export const HandType = {
    POK_9: 1,
    POK_8: 2,
    TONG: 3,
    STRAIGHT_FLUSH: 4,
    STRAIGHT: 5,
    SAM_LEUNG: 6,
    NORMAL: 7
} as const;

export type HandType = typeof HandType[keyof typeof HandType];

export interface HandResult {
    type: HandType;
    score: number;
    deng: number;
    name: string;
}

export function getDengMultiplier(cards: Card[]): number {
    // 3 Cards
    if (cards.length === 3) {
        if (isTong(cards)) return 5;
        if (isStraightFlush(cards)) return 5;
        if (isStraight(cards)) return 3;
        if (isSamLeung(cards)) return 3;
        // Normal 3 cards with same suit = 3 Deng (unless it's a special hand like straight flush which is caught above)
        if (isSameSuit(cards)) return 3;
    }

    // 2 Cards
    if (cards.length === 2) {
        // Normal Pok or Normal hand with 2 cards
        const pair = isPair(cards); // Pair on 2 cards = 2 Deng
        const sameSuit = isSameSuit(cards); // Same suit on 2 cards = 2 Deng

        // If it's a pair, it's 2 Deng.
        // If it's same suit, it's 2 Deng.
        // If both? (e.g. 2 decks? Not possible with 1 deck standard, but if implemented later).
        // Standard Pok Deng with 1 deck: Pair implies different suits. Same suit implies different ranks (unless cheating).
        // So they are mutually exclusive usually.

        if (pair) return 2;
        if (sameSuit) return 2;
    }

    return 1;
}

export function evaluateHand(cards: Card[]): HandResult {
    const calcScore = calculateScore(cards);
    const deng = getDengMultiplier(cards);

    // 1. Check Pok (only on first 2 cards)
    if (cards.length === 2) {
        const pok = checkPok(cards);

        if (pok === 'pok9') {
            return { type: HandType.POK_9, score: 9, deng, name: `ป๊อก 9` + (deng > 1 ? ` ${deng} เด้ง` : '') };
        }
        if (pok === 'pok8') {
            return { type: HandType.POK_8, score: 8, deng, name: `ป๊อก 8` + (deng > 1 ? ` ${deng} เด้ง` : '') };
        }
    }

    // 2. Check special hands (only on 3 cards)
    if (cards.length === 3) {
        if (isTong(cards)) {
            return { type: HandType.TONG, score: calcScore, deng: 5, name: 'ตอง (5 เด้ง)' };
        }
        if (isStraightFlush(cards)) {
            return { type: HandType.STRAIGHT_FLUSH, score: calcScore, deng: 5, name: 'สเตทฟลัช (5 เด้ง)' };
        }
        if (isStraight(cards)) {
            return { type: HandType.STRAIGHT, score: calcScore, deng: 3, name: 'เรียง (3 เด้ง)' };
        }
        if (isSamLeung(cards)) {
            return { type: HandType.SAM_LEUNG, score: calcScore, deng: 3, name: 'เซียน (3 เด้ง)' };
        }
    }

    // 3. Normal Hand
    // For 3 cards, if same suit, it's 3 deng (already calc in getDengMultiplier)
    // For 2 cards, if pair or same suit, it's 2 deng

    let suffix = '';
    if (deng > 1) suffix = ` ${deng} เด้ง`;

    const baseName = calcScore === 0 ? 'บอด' : `${calcScore} แต้ม`;
    return { type: HandType.NORMAL, score: calcScore, deng, name: `${baseName}${suffix}` };
}

export function compareHands(dealer: HandResult, player: HandResult): 'player' | 'dealer' | 'draw' {
    // 1. Check Hand Type Hierarchy (Pok > Tong > SF > Straight > Sam Leung > Normal)
    if (dealer.type !== player.type) {
        // Lower enum value means better hand
        return dealer.type < player.type ? 'dealer' : 'player';
    }

    // 2. If same type, check logic
    // Special hands usually compare rank/value, but in simplistic Pok Deng,
    // often if both have same special hand (e.g. both Straight), they Draw or compare max card.
    // For simplicity and common street rules:
    // - Pok vs Pok: Compare score (9 > 8). If same, Draw.
    // - Tong vs Tong: Compare rank (optional, but rare). Draw is acceptable for simplicity or implemented rank check if needed.
    //   Let's stick to simple "Same type = Draw" for Specials unless strict rank rules requested, 
    //   BUT for Normal, we MUST compare Score.

    if (dealer.type === HandType.NORMAL || dealer.type === HandType.POK_9 || dealer.type === HandType.POK_8) {
        if (dealer.score > player.score) return 'dealer';
        if (player.score > dealer.score) return 'player';
        return 'draw';
    }

    // For other specials (Tong, Straight, etc.), if both have it:
    // Standard rule: Draw (Kwam)
    return 'draw';
}

// Legacy functions for backward compatibility
export function getHandWeight(cards: Card[]): number {
    const result = evaluateHand(cards);
    // Rough weight for AI
    if (result.type <= HandType.POK_8) return 100 + result.score;
    if (result.type === HandType.TONG) return 90;
    if (result.type === HandType.STRAIGHT_FLUSH) return 85;
    if (result.type === HandType.STRAIGHT) return 80;
    if (result.type === HandType.SAM_LEUNG) return 75;
    return result.score;
}
