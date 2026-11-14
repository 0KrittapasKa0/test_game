import type { DealerVariant, Player } from '../types/game';

export function randomDealerVariant(): DealerVariant {
    return Math.random() < 0.5 ? 'female' : 'male';
}

export type DealerAction = 'idle' | 'shuffle' | 'deal' | 'reveal' | 'win' | 'lose';

export function getDealerAction(phase: string, cardsDealt: number, result: Player['result']): DealerAction {
    if (phase === 'DEALING') return cardsDealt === 0 ? 'shuffle' : 'deal';
    if (phase === 'ROUND_END') return result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'idle';
    if (phase === 'SHOWDOWN') return 'reveal';
    return 'idle';
}
