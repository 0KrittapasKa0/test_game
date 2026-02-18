import { calculateScore } from './deck';
import type { Card, RoomConfig } from '../types/game';

export function aiShouldDraw(cards: Card[]): boolean {
    const score = calculateScore(cards);

    if (score <= 3) return true;

    if (score >= 4 && score <= 5) {
        return Math.random() < 0.65;
    }

    if (score === 6) {
        return Math.random() < 0.3;
    }

    return false;
}

export function aiSelectBet(chips: number, room: RoomConfig): number {
    // If AI can't afford minimum bet, bet all chips
    if (chips < room.minBet) return chips;
    
    const maxBet = Math.min(chips, room.maxBet);
    const options = room.chipPresets.filter(b => b >= room.minBet && b <= maxBet);
    
    // If no valid options, use minimum bet or all chips
    if (options.length === 0) return Math.min(chips, room.minBet);

    // More realistic betting weights based on chip count
    let weights: number[];
    if (chips <= 100) {
        // Low chips: prefer lower bets
        weights = [50, 30, 15, 5];
    } else if (chips <= 500) {
        // Medium chips: balanced
        weights = [30, 35, 25, 10];
    } else {
        // High chips: more aggressive
        weights = [20, 30, 35, 15];
    }
    
    const validWeights = weights.slice(0, options.length);
    const totalWeight = validWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < options.length; i++) {
        random -= validWeights[i];
        if (random <= 0) return options[i];
    }

    return options[0];
}
