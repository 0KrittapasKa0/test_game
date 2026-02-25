import { create } from 'zustand';
import type { Player, Screen, GamePhase, Card, GameConfig } from '../types/game';
import { AI_NAMES, AVATAR_COLORS } from '../types/game';
import { createDeck, shuffleDeck, compareHands, evaluateHand, HandType } from '../utils/deck';

import { loadProfile, saveProfile, saveSettings, recordGameResult } from '../utils/storage';
import { aiShouldDraw, aiSelectBet } from '../utils/ai';
import { SFX } from '../utils/sound';
import {
    initLuckState, resetRoundState,
    shouldAssistOpening, pickAssistedOpeningCards,
    shouldAssistThirdCard, pickAssistedThirdCard,
    recordRoundResult,
    shouldNerfAiOpening, pickNerfedAiCards
} from '../utils/luckAssist';
import { getAiLeavers } from '../utils/aiLeave';

interface GameState {
    screen: Screen;
    gamePhase: GamePhase;
    players: Player[];
    deck: Card[];
    dealerIndex: number;
    currentPlayerIndex: number;
    activePlayerIndex: number;
    config: GameConfig | null;
    roundNumber: number;
    resultMessage: string;
    isDealing: boolean;
    showCards: boolean;
    dealingPlayerIndex: number;
    dealingRound: number;
    pendingAssistedCards: Card[] | null;
    aiBettingInProgress: boolean;
    aiBettingQueue: number[];
    humanBetConfirmed: boolean;
    isSpectating: boolean;
    maxSeats: number;

    setScreen: (screen: Screen) => void;
    completeSplash: () => void;
    initGame: (config: GameConfig) => Promise<void>;
    startRound: () => void;
    placeBet: (amount: number) => void;
    confirmBet: () => void;
    startAiBetting: () => void;
    processNextAiBet: () => void;
    dealCards: () => void;
    dealNextCard: () => void;
    afterDealingComplete: () => void;
    startActionPhase: () => void;
    advanceToNextPlayer: () => void;
    playerDraw: () => void;
    playerStay: () => void;
    processCurrentAi: () => void;
    showdown: () => void;
    nextRound: () => void;
    resetGame: () => void;
    addChips: (amount: number) => void;
}

// ─── Random User API ─────────────────────────────────────────────────────────

interface RandomUserResult {
    name: string;
    avatarUrl: string;
}

async function fetchRandomUsers(count: number): Promise<RandomUserResult[]> {
    try {
        const res = await fetch(`https://randomuser.me/api/?results=${count}&nat=us,gb,fr,de&noinfo`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        return data.results.map((u: any) => ({
            name: `${u.name.first}`,
            avatarUrl: u.picture.medium,
        }));
    } catch {
        return []; // Fallback: empty → use AI_NAMES
    }
}

let aiIdCounter = 0;

/**
 * Weighted random AI chip amount — creates variety at the table
 * 50% normal, 25% moderate, 15% low/broke, 8% rich, 2% mega-rich
 */
function randomizeAiChips(baseChips: number, minBet: number): number {
    const roll = Math.random();
    let multiplier: number;

    if (roll < 0.02) {
        // 2% — มหาเศรษฐี (5–10x)
        multiplier = 5 + Math.random() * 5;
    } else if (roll < 0.10) {
        // 8% — รวย (2–4x)
        multiplier = 2 + Math.random() * 2;
    } else if (roll < 0.35) {
        // 25% — ปานกลาง (0.6–1x)
        multiplier = 0.6 + Math.random() * 0.4;
    } else if (roll < 0.50) {
        // 15% — ใกล้หมดตัว (0.1–0.4x)
        multiplier = 0.1 + Math.random() * 0.3;
    } else {
        // 50% — ปกติ (0.8–1.4x)
        multiplier = 0.8 + Math.random() * 0.6;
    }

    const chips = Math.round(baseChips * multiplier);
    // Ensure at least 2x minBet so they can play at least a couple rounds
    return Math.max(minBet * 2, chips);
}

function createAiPlayers(
    count: number,
    aiChips: number,
    startIndex: number,
    randomUsers: RandomUserResult[] = [],
    seatStartIndex: number = 1,
    minBet: number = 10,
): Player[] {
    const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
    const shuffledColors = [...AVATAR_COLORS].sort(() => Math.random() - 0.5);

    return Array.from({ length: count }, (_, i) => {
        const chips = randomizeAiChips(aiChips, minBet);
        return {
            id: `ai-${aiIdCounter++}`,
            name: randomUsers[i]?.name || shuffledNames[i % shuffledNames.length],
            avatarColor: shuffledColors[(startIndex + i + 1) % shuffledColors.length],
            avatarUrl: randomUsers[i]?.avatarUrl || undefined,
            isHuman: false,
            isDealer: false,
            cards: [],
            bet: 0,
            chips,
            score: 0,
            hasPok: false,
            dengMultiplier: 1,
            hasActed: false,
            result: 'pending' as const,
            seatIndex: seatStartIndex + i,
            roundsPlayed: 0,
            consecutiveLosses: 0,
            peakChips: chips,
        };
    });
}

async function createSingleAi(aiChips: number, seatIndex: number, minBet: number = 10): Promise<Player> {
    const randomUsers = await fetchRandomUsers(1);
    const shuffledNames = [...AI_NAMES].sort(() => Math.random() - 0.5);
    const shuffledColors = [...AVATAR_COLORS].sort(() => Math.random() - 0.5);
    const chips = randomizeAiChips(aiChips, minBet);
    return {
        id: `ai-${aiIdCounter++}`,
        name: randomUsers[0]?.name || shuffledNames[0],
        avatarColor: shuffledColors[Math.floor(Math.random() * shuffledColors.length)],
        avatarUrl: randomUsers[0]?.avatarUrl || undefined,
        isHuman: false,
        isDealer: false,
        cards: [],
        bet: 0,
        chips,
        score: 0,
        hasPok: false,
        dengMultiplier: 1,
        hasActed: false,
        result: 'pending' as const,
        seatIndex,
        roundsPlayed: 0,
        consecutiveLosses: 0,
        peakChips: chips,
    };
}

function getTurnOrder(players: Player[], dealerIndex: number): number[] {
    const order: number[] = [];
    for (let i = 0; i < players.length; i++) {
        if (i !== dealerIndex) order.push(i);
    }
    order.push(dealerIndex);
    return order;
}

export const useGameStore = create<GameState>((set, get) => ({
    screen: 'SPLASH',
    gamePhase: 'BETTING',
    players: [],
    deck: [],
    dealerIndex: 0,
    currentPlayerIndex: 0,
    activePlayerIndex: -1,
    config: null,
    roundNumber: 0,
    resultMessage: '',
    isDealing: false,
    showCards: false,
    dealingPlayerIndex: 0,
    dealingRound: 0,
    pendingAssistedCards: null,
    aiBettingInProgress: false,
    aiBettingQueue: [],
    humanBetConfirmed: false,
    isSpectating: false,
    maxSeats: 0,

    setScreen: (screen) => set({ screen }),

    completeSplash: () => {
        const profile = loadProfile();
        set({ screen: profile ? 'MENU' : 'ONBOARDING' });
    },

    initGame: async (config) => {
        const profile = loadProfile()!;
        aiIdCounter = 0;
        saveSettings({
            lastPlayerCount: config.playerCount,
            lastHumanIsDealer: config.humanIsDealer,
        });

        const humanPlayer: Player = {
            id: 'human',
            name: profile.name,
            avatarColor: profile.avatarColor,
            avatarUrl: profile.avatarUrl,
            isHuman: true,
            isDealer: config.humanIsDealer,
            cards: [],
            bet: 0,
            chips: profile.chips,
            score: 0,
            hasPok: false,
            dengMultiplier: 1,
            hasActed: false,
            result: 'pending',
            seatIndex: 0,
        };

        const aiCount = config.playerCount - 1;

        // Fetch random user data (with fallback to AI_NAMES)
        const randomUsers = await fetchRandomUsers(aiCount);
        const aiPlayers = createAiPlayers(aiCount, config.room.aiChips, 0, randomUsers, 1, config.room.minBet);

        const allPlayers = [humanPlayer, ...aiPlayers];
        const dealerIndex = config.humanIsDealer ? 0 : 1;

        allPlayers[dealerIndex].isDealer = true;

        // Initialize Luck Assist with player's starting chips
        initLuckState(profile.chips);

        set({
            players: allPlayers,
            config,
            dealerIndex,
            maxSeats: config.playerCount,
            deck: shuffleDeck(createDeck()),
            screen: 'PLAYING',
            gamePhase: 'BETTING',
            roundNumber: 1,
            resultMessage: '',
            showCards: false,
            activePlayerIndex: -1,
            dealingPlayerIndex: 0,
            dealingRound: 0,
            aiBettingInProgress: true,
            aiBettingQueue: [],
            isSpectating: false,
        });

        // Start AI betting sequence
        setTimeout(() => get().startAiBetting(), 800);
    },

    startRound: () => {
        const { players, config, isSpectating } = get();
        if (!config) return;

        const resetPlayers = players.map(p => ({
            ...p,
            cards: [],
            lastBet: p.bet > 0 ? p.bet : p.lastBet,
            previousChips: p.chips,
            bet: 0,
            score: 0,
            hasPok: false,
            dengMultiplier: 1,
            hasActed: false,
            result: 'pending' as const,
        }));

        resetRoundState();

        set({
            players: resetPlayers,
            deck: shuffleDeck(createDeck()),
            gamePhase: 'BETTING',
            resultMessage: '',
            showCards: false,
            activePlayerIndex: -1,
            dealingPlayerIndex: 0,
            dealingRound: 0,
            pendingAssistedCards: null,
            aiBettingInProgress: true,
            aiBettingQueue: [],
            humanBetConfirmed: false,
        });

        // Start sequential AI betting after a short delay
        setTimeout(() => get().startAiBetting(), isSpectating ? 300 : 600);
    },

    startAiBetting: () => {
        const { players, dealerIndex, config, isSpectating } = get();
        if (!config) return;

        // Find all AI players that need to bet (non-human, non-dealer)
        const aiBettors = players
            .map((p, i) => ({ p, i }))
            .filter(({ p, i }) => !p.isHuman && i !== dealerIndex && p.chips >= config.room.minBet);

        if (aiBettors.length === 0) {
            set({ aiBettingInProgress: false });
            // Auto-deal when spectating or human already confirmed
            if (isSpectating || get().humanBetConfirmed) {
                setTimeout(() => get().dealCards(), 500);
            }
            return;
        }

        // Schedule each AI bet with a random delay
        const speedMult = isSpectating ? 0.5 : 1; // Faster when spectating
        let maxDelay = 0;
        for (const { p: _p, i } of aiBettors) {
            const delay = (1500 + Math.random() * 2000) * speedMult;
            if (delay > maxDelay) maxDelay = delay;

            setTimeout(() => {
                const { players: currentPlayers, config: currentConfig } = get();
                if (!currentConfig) return;

                const ai = currentPlayers[i];
                if (!ai || ai.bet > 0) return; // Already bet or removed

                // Pass full chip count — aiSelectBet decides if it raise beyond room maxBet
                const bet = aiSelectBet(ai.chips, currentConfig.room);
                const validBet = Math.max(currentConfig.room.minBet, Math.min(bet, ai.chips));

                // Play dramatic allIn sound if AI bets everything
                if (validBet >= ai.chips) {
                    SFX.allIn();
                } else {
                    SFX.chipPlace();
                }
                const updated = currentPlayers.map((pp, idx) => {
                    if (idx !== i) return pp;
                    return { ...pp, bet: validBet, chips: pp.chips - validBet };
                });
                set({ players: updated });
            }, delay);
        }

        // Mark betting complete after all AI have placed
        setTimeout(() => {
            set({ aiBettingInProgress: false });
            // Auto-deal when spectating or human already confirmed
            if (isSpectating || get().humanBetConfirmed) {
                setTimeout(() => get().dealCards(), 500);
            }
        }, maxDelay + 300);
    },

    processNextAiBet: () => {
        // No longer used — AI bets are parallel now
    },

    placeBet: (amount) => {
        SFX.chipPlace();
        const { players, config } = get();
        if (!config) return;

        const updated = players.map(p => {
            if (!p.isHuman) return p;
            if (p.isDealer) return p;

            // Validate bet amount — allow up to total chips (raise/all-in)
            const maxBet = p.chips + p.bet; // total available = current chips + already-bet chips
            const validBet = Math.max(0, Math.min(amount, maxBet));

            const prevBet = p.bet;
            return {
                ...p,
                bet: validBet,
                chips: p.chips + prevBet - validBet
            };
        });
        set({ players: updated });
    },

    confirmBet: () => {
        const { aiBettingInProgress } = get();
        const humanPlayer = get().players.find(p => p.isHuman);
        if (!humanPlayer) return;
        // Dealer doesn't bet, but can still confirm to deal
        if (!humanPlayer.isDealer && humanPlayer.bet <= 0) return;

        set({ humanBetConfirmed: true });

        // If AI already done, deal immediately
        if (!aiBettingInProgress) {
            setTimeout(() => get().dealCards(), 300);
        }
        // Otherwise, startAiBetting will trigger deal when it finishes
    },

    dealCards: () => {
        SFX.dealStart();
        set({
            gamePhase: 'DEALING',
            isDealing: true,
            dealingPlayerIndex: 0,
            dealingRound: 0,
        });
        setTimeout(() => get().dealNextCard(), 400);
    },

    dealNextCard: () => {
        const { deck, players, dealingPlayerIndex, dealingRound, roundNumber, pendingAssistedCards } = get();

        if (dealingRound >= 2) {
            get().afterDealingComplete();
            return;
        }

        let deckCopy = [...deck];
        const playerIdx = dealingPlayerIndex;
        const targetPlayer = players[playerIdx];

        let card: Card;

        // ── Luck Assist: Opening Hand for Human ──
        if (targetPlayer.isHuman && dealingRound === 0 && targetPlayer.cards.length === 0) {
            // First card to human: check if we should assist
            const humanChips = targetPlayer.chips + targetPlayer.bet; // total chips before bet deduction
            if (shouldAssistOpening(roundNumber, humanChips)) {
                const assisted = pickAssistedOpeningCards(deckCopy, roundNumber);
                if (assisted) {
                    // Store second card for next deal round, use first card now
                    card = assisted.cards[0];
                    deckCopy = assisted.remainingDeck;
                    set({ pendingAssistedCards: [assisted.cards[1]] });
                } else {
                    card = deckCopy.pop()!;
                }
            } else {
                card = deckCopy.pop()!;
            }
        } else if (targetPlayer.isHuman && dealingRound === 1 && pendingAssistedCards && pendingAssistedCards.length > 0) {
            // Second card to human: use pre-selected assisted card
            card = pendingAssistedCards[0];
            set({ pendingAssistedCards: null });
            // Card was already removed from deck in round 0
        } else if (!targetPlayer.isHuman && dealingRound === 0 && targetPlayer.cards.length === 0) {
            // ── AI Opening Nerf: ให้ AI ได้ไพ่แย่ (Strategy 2) ──
            if (shouldNerfAiOpening()) {
                const nerfed = pickNerfedAiCards(deckCopy);
                if (nerfed) {
                    card = nerfed.cards[0];
                    deckCopy = nerfed.remainingDeck;
                    // ใส่ไพ่ใบที่ 2 กลับในตำแหน่งสุ่ม (ไม่ใช่ท้าย deck)
                    // เพื่อไม่ให้ไปโดน AI คนถัดไปโดยไม่ตั้งใจ
                    const insertAt = Math.floor(Math.random() * deckCopy.length);
                    deckCopy.splice(insertAt, 0, nerfed.cards[1]);
                } else {
                    card = deckCopy.pop()!;
                }
            } else {
                card = deckCopy.pop()!;
            }
        } else {
            // Normal random deal (AI players or non-assisted human)
            card = deckCopy.pop()!;
        }

        const updatedPlayers = players.map((p, i) => {
            if (i !== playerIdx) return p;
            const newCards = [...p.cards, card];
            const result = evaluateHand(newCards);
            return {
                ...p,
                cards: newCards,
                score: result.score,
                hasPok: result.type <= HandType.POK_8,
                dengMultiplier: result.deng,
            };
        });

        let nextPlayer = dealingPlayerIndex + 1;
        let nextRound = dealingRound;

        if (nextPlayer >= players.length) {
            nextPlayer = 0;
            nextRound = dealingRound + 1;
        }

        SFX.cardDeal();
        set({
            players: updatedPlayers,
            deck: deckCopy,
            dealingPlayerIndex: nextPlayer,
            dealingRound: nextRound,
            activePlayerIndex: playerIdx,
        });

        const delay = 350;
        setTimeout(() => get().dealNextCard(), delay);
    },

    afterDealingComplete: () => {
        const { players, dealerIndex } = get();
        const dealer = players[dealerIndex];

        if (dealer.hasPok) {
            // กรณี 1: เจ้ามือป๊อก → จบทันที ไม่มีใครจั่วใบที่ 3
            // mark ทุกคน hasActed เพราะไม่มีสิทธิ์จั่ว
            SFX.pokReveal();
            // Countdown ticks before showdown
            setTimeout(() => SFX.countdownTick(), 600);
            setTimeout(() => SFX.countdownTick(), 1200);
            const updatedPlayers = players.map(p => ({ ...p, hasActed: true }));
            set({
                players: updatedPlayers,
                isDealing: false,
                showCards: true,
                gamePhase: 'SHOWDOWN',
                activePlayerIndex: -1,
            });
            setTimeout(() => get().showdown(), 2000);
        } else {
            // กรณี 2: เจ้ามือไม่ป๊อก
            // ผู้เล่นที่ป๊อก → ชนะทันที, mark hasActed
            // ผู้เล่นที่ไม่ป๊อก → ยังเล่นต่อตามปกติ
            // Play pok sound for any player who got Pok
            const anyPok = players.some((p, i) => i !== dealerIndex && p.hasPok);
            if (anyPok) SFX.pok();
            const updatedPlayers = players.map((p, i) => {
                if (i === dealerIndex) return p; // เจ้ามือยังไม่ act
                if (p.hasPok) return { ...p, hasActed: true }; // ป๊อก → จบ
                return p;
            });
            set({ isDealing: false, players: updatedPlayers, activePlayerIndex: -1 });
            setTimeout(() => get().startActionPhase(), 600);
        }
    },

    startActionPhase: () => {
        const { players, dealerIndex, isSpectating } = get();
        const turnOrder = getTurnOrder(players, dealerIndex);
        const firstIdx = turnOrder[0];
        const firstPlayer = players[firstIdx];

        if (firstPlayer.hasPok) {
            set({ activePlayerIndex: firstIdx });
            const updated = [...players];
            updated[firstIdx] = { ...updated[firstIdx], hasActed: true };
            set({ players: updated });
            setTimeout(() => get().advanceToNextPlayer(), 500);
            return;
        }

        // Skip human when spectating
        if (firstPlayer.isHuman && isSpectating) {
            set({ activePlayerIndex: firstIdx });
            const updated = [...players];
            updated[firstIdx] = { ...updated[firstIdx], hasActed: true };
            set({ players: updated });
            setTimeout(() => get().advanceToNextPlayer(), 100);
            return;
        }

        if (firstPlayer.isHuman) {
            SFX.yourTurn();
            set({
                gamePhase: 'PLAYER_ACTION',
                activePlayerIndex: firstIdx,
                currentPlayerIndex: firstIdx,
            });
        } else {
            set({
                gamePhase: 'AI_ACTION',
                activePlayerIndex: firstIdx,
            });
            setTimeout(() => get().processCurrentAi(), 1200);
        }
    },

    advanceToNextPlayer: () => {
        const { players, dealerIndex, activePlayerIndex, isSpectating } = get();
        const turnOrder = getTurnOrder(players, dealerIndex);

        const currentOrderIdx = turnOrder.indexOf(activePlayerIndex);
        const nextOrderIdx = currentOrderIdx + 1;

        if (nextOrderIdx >= turnOrder.length) {
            SFX.showdownReveal();
            set({ gamePhase: 'SHOWDOWN', showCards: true, activePlayerIndex: -1 });
            setTimeout(() => get().showdown(), 1800);
            return;
        }

        const nextIdx = turnOrder[nextOrderIdx];
        const nextPlayer = players[nextIdx];

        if (nextPlayer.hasPok) {
            const updated = [...players];
            updated[nextIdx] = { ...updated[nextIdx], hasActed: true };
            set({ players: updated, activePlayerIndex: nextIdx });
            setTimeout(() => get().advanceToNextPlayer(), 500);
            return;
        }

        // Skip human when spectating
        if (nextPlayer.isHuman && isSpectating) {
            const updated = [...players];
            updated[nextIdx] = { ...updated[nextIdx], hasActed: true };
            set({ players: updated, activePlayerIndex: nextIdx });
            setTimeout(() => get().advanceToNextPlayer(), 100);
            return;
        }

        if (nextPlayer.isHuman) {
            SFX.yourTurn();
            set({
                gamePhase: 'PLAYER_ACTION',
                activePlayerIndex: nextIdx,
                currentPlayerIndex: nextIdx,
            });
        } else {
            set({
                gamePhase: 'AI_ACTION',
                activePlayerIndex: nextIdx,
            });
            setTimeout(() => get().processCurrentAi(), 1200);
        }
    },

    playerDraw: () => {
        SFX.cardDeal();
        const { players, deck, activePlayerIndex } = get();
        let deckCopy = [...deck];
        let card: Card;

        // ── Luck Assist: Third Card for Human ──
        const drawingPlayer = players[activePlayerIndex];
        if (drawingPlayer && drawingPlayer.isHuman) {
            const humanChips = drawingPlayer.chips + drawingPlayer.bet;
            if (shouldAssistThirdCard(humanChips)) {
                const assisted = pickAssistedThirdCard(drawingPlayer.cards, deckCopy);
                if (assisted) {
                    card = assisted.card;
                    deckCopy = assisted.remainingDeck;
                } else {
                    card = deckCopy.pop()!;
                }
            } else {
                card = deckCopy.pop()!;
            }
        } else {
            card = deckCopy.pop()!;
        }

        const updated = players.map((p, i) => {
            if (i !== activePlayerIndex) return p;
            const newCards = [...p.cards, card];
            const result = evaluateHand(newCards);
            return {
                ...p,
                cards: newCards,
                score: result.score,
                dengMultiplier: result.deng,
                hasActed: true,
            };
        });

        set({ players: updated, deck: deckCopy });
        setTimeout(() => get().advanceToNextPlayer(), 800);
    },

    playerStay: () => {
        SFX.cardSlide();
        const { players, activePlayerIndex } = get();
        const updated = players.map((p, i) => {
            if (i !== activePlayerIndex) return p;
            return { ...p, hasActed: true };
        });
        set({ players: updated });
        setTimeout(() => get().advanceToNextPlayer(), 500);
    },

    processCurrentAi: () => {
        const { players, deck, activePlayerIndex } = get();
        const ai = players[activePlayerIndex];
        if (!ai) return;

        const deckCopy = [...deck];

        if (aiShouldDraw(ai.cards)) {
            SFX.aiDraw();
            const card = deckCopy.pop()!;
            const newCards = [...ai.cards, card];
            const updated = players.map((p, i) => {
                if (i !== activePlayerIndex) return p;
                const result = evaluateHand(newCards);
                return {
                    ...p,
                    cards: newCards,
                    score: result.score,
                    dengMultiplier: result.deng,
                    hasActed: true,
                };
            });
            set({ players: updated, deck: deckCopy });
        } else {
            const updated = players.map((p, i) => {
                if (i !== activePlayerIndex) return p;
                return { ...p, hasActed: true };
            });
            set({ players: updated });
        }

        setTimeout(() => get().advanceToNextPlayer(), 800);
    },

    showdown: () => {
        const { players, dealerIndex } = get();
        const dealer = players[dealerIndex];

        // คำนวณผลแต่ละผู้เล่น vs เจ้ามือ
        const results = players.map((p, i) => {
            if (i === dealerIndex) return { ...p, result: 'pending' as const };

            const playerResult = evaluateHand(p.cards);
            const dealerResult = evaluateHand(dealer.cards);
            const outcome = compareHands(dealerResult, playerResult);

            // Deng Logic:
            // Winner takes their Deng multiplier.
            // If Dealer wins, Dealer gets Dealer's Deng.
            // If Player wins, Player gets Player's Deng.

            let result: 'win' | 'lose' | 'draw' = 'draw';
            let finalChips = p.chips;

            if (outcome === 'player') {
                // Return bet + (bet * playerDeng)
                result = 'win';
                const winnings = p.bet * playerResult.deng;
                finalChips = p.chips + p.bet + winnings;
                // Player lost
                result = 'lose';
                const extraLoss = p.bet * (dealerResult.deng - 1);
                finalChips = Math.max(0, p.chips - extraLoss);
                result = 'draw';
                finalChips = p.chips + p.bet;
            }

            // Calculate Net Profit
            // previousChips is set at start of round. If missing, estimate via chips + bet.
            const startChips = p.previousChips ?? (p.chips + p.bet);
            const roundProfit = finalChips - startChips;

            return {
                ...p,
                result,
                chips: finalChips,
                score: playerResult.score,
                hasPok: playerResult.type <= HandType.POK_8,
                dengMultiplier: playerResult.deng,
                roundProfit,
            };
        });

        // Dealer Calculation
        let dealerTotalWin = 0;
        let dealerTotalLoss = 0;

        // Re-calculate delta from Dealer perspective based on Final Player Results
        // This is safer than accumulation to ensure consistency
        results.forEach((p, i) => {
            if (i === dealerIndex) return;

            const playerResult = evaluateHand(p.cards);
            const dealerResult = evaluateHand(dealer.cards);
            // outcome is already determined in p.result

            if (p.result === 'win') {
                // Player won. Dealer lost (Bet * PlayerDeng)
                const loss = p.bet * playerResult.deng;
                dealerTotalLoss += loss;
            } else if (p.result === 'lose') {
                // Player lost. Dealer won (Bet * DealerDeng)
                const win = p.bet * dealerResult.deng;
                dealerTotalWin += win;
            }
        });

        const dealerNet = dealerTotalWin - dealerTotalLoss;
        const dealerResultData = evaluateHand(dealer.cards);

        results[dealerIndex] = {
            ...results[dealerIndex],
            chips: Math.max(0, results[dealerIndex].chips + dealerNet),
            result: dealerNet > 0 ? 'win' : dealerNet < 0 ? 'lose' : 'draw',
            score: dealerResultData.score,
            hasPok: dealerResultData.type <= HandType.POK_8,
            dengMultiplier: dealerResultData.deng,
            roundProfit: dealerNet,
        };

        const humanPlayer = results.find(p => p.isHuman);
        const { isSpectating } = get();

        // ── Luck Assist: Track round result for streak adaptation ──
        if (humanPlayer && !isSpectating) {
            recordRoundResult(humanPlayer.result as 'win' | 'lose' | 'draw', get().roundNumber);
        }

        const profile = loadProfile();
        if (profile && humanPlayer) {
            profile.chips = humanPlayer.chips;
            saveProfile(profile);

            // Record stats for profile page
            if (!isSpectating) {
                recordGameResult(
                    humanPlayer.result as 'win' | 'lose' | 'draw',
                    humanPlayer.chips,
                    humanPlayer.roundProfit ?? 0,
                );
            }
        }

        let msg = '';
        if (isSpectating) {
            msg = '👀 กำลังดูเกม...';
        } else if (humanPlayer && humanPlayer.isDealer) {
            const net = dealerNet;
            const icon = net > 0 ? '🎉' : net < 0 ? '💸' : '🤝';
            msg = `${icon} สรุปเจ้ามือ:\nได้รับ +${dealerTotalWin.toLocaleString()} | เสีย -${dealerTotalLoss.toLocaleString()}\nสุทธิ ${net > 0 ? '+' : ''}${net.toLocaleString()}`;
        } else if (humanPlayer) {
            const humanOriginal = players.find(p => p.isHuman)!;
            const oldChips = humanOriginal.chips + humanOriginal.bet;
            const newChips = humanPlayer.chips;
            const net = newChips - oldChips;

            if (humanPlayer.result === 'win') {
                msg = `🎉 คุณชนะ +${net.toLocaleString()}`;
                if (humanPlayer.dengMultiplier >= 2) { SFX.bigWin(); } else { SFX.win(); }
                setTimeout(() => SFX.chipCollect(), 400);
            }
            else if (humanPlayer.result === 'lose') { msg = `😔 คุณแพ้ ${net.toLocaleString()}`; SFX.lose(); }
            else { msg = '🤝 เสมอ (ไม่เสียเงิน)'; SFX.draw(); }
        }

        // ── Update AI behavioral tracking ──
        const trackedResults = results.map(p => {
            if (p.isHuman) return p;
            const roundsPlayed = (p.roundsPlayed ?? 0) + 1;
            const consecutiveLosses = p.result === 'lose'
                ? (p.consecutiveLosses ?? 0) + 1
                : 0; // Reset on win or draw
            const peakChips = Math.max(p.peakChips ?? p.chips, p.chips);
            return { ...p, roundsPlayed, consecutiveLosses, peakChips };
        });

        set({
            players: trackedResults,
            gamePhase: 'ROUND_END',
            resultMessage: msg,
            activePlayerIndex: -1,
        });
    },

    nextRound: async () => {
        SFX.roundStart();
        const { roundNumber, players, config, maxSeats, isSpectating } = get();
        if (!config) return;

        // ── Check if human should enter spectator mode ──
        const humanPlayer = players.find(p => p.isHuman);
        let enterSpectating = isSpectating;
        if (humanPlayer && !isSpectating && humanPlayer.chips < config.room.minBet && !humanPlayer.isDealer) {
            enterSpectating = true;
            set({ isSpectating: true });
            SFX.gameOver();
        }

        // ── Step 1: Rotate dealer FIRST if current dealer is broke ──
        let updatedPlayers = [...players];
        const currentDealer = updatedPlayers.find(p => p.isDealer);

        if (currentDealer && currentDealer.chips < config.room.minBet) {
            // Find eligible AI to become new dealer (not human, has enough chips)
            const candidates = updatedPlayers.filter(
                p => !p.isHuman && !p.isDealer && p.chips >= config.room.minBet
            );

            if (candidates.length > 0) {
                // Pick a random candidate to avoid always the same player
                const newDealer = candidates[Math.floor(Math.random() * candidates.length)];
                updatedPlayers = updatedPlayers.map(p => ({
                    ...p,
                    isDealer: p.id === newDealer.id,
                }));
            } else {
                // No valid dealer candidate → game over
                set({ screen: 'MENU', gamePhase: 'BETTING', isSpectating: false });
                return;
            }
        }

        // ── Step 2: Remove AI using realistic leave system ──
        const leavers = getAiLeavers(updatedPlayers, config.room.minBet);
        const leaverIds = new Set(leavers.map(l => l.player.id));
        updatedPlayers = updatedPlayers.filter(p => {
            if (p.isHuman) return true; // Always keep human (for spectating)
            if (p.isDealer) return true; // Always keep the (new) dealer
            return !leaverIds.has(p.id);
        });

        // ── Spawn new AI into empty seats (~30% chance per empty seat) ──
        const occupiedSeats = new Set(updatedPlayers.map(p => p.seatIndex));
        const emptySeats: number[] = [];
        for (let i = 0; i < maxSeats; i++) {
            if (!occupiedSeats.has(i)) emptySeats.push(i);
        }
        // Remove human seat (0) from empty seats if human is spectating
        const availableSeats = emptySeats.filter(s => s !== 0);

        for (const seatIdx of availableSeats) {
            if (Math.random() < 0.3) {
                try {
                    const newAi = await createSingleAi(config.room.aiChips, seatIdx, config.room.minBet);
                    updatedPlayers.push(newAi);
                } catch {
                    // Silently fail if API unavailable
                }
            }
        }

        // Sort players by seatIndex for consistent ordering
        updatedPlayers.sort((a, b) => a.seatIndex - b.seatIndex);

        // Update dealerIndex after sort
        const newDealerIndex = updatedPlayers.findIndex(p => p.isDealer);

        // ── Check if enough players remain ──
        const activePlayers = updatedPlayers.filter(p => !p.isHuman && p.chips >= config.room.minBet);
        if (activePlayers.length < 2 && enterSpectating) {
            set({ screen: 'MENU', gamePhase: 'BETTING', isSpectating: false });
            return;
        }
        if (updatedPlayers.filter(p => p.chips > 0 || p.isDealer).length < 2) {
            set({ screen: 'MENU', gamePhase: 'BETTING', isSpectating: false });
            return;
        }

        set({
            players: updatedPlayers,
            dealerIndex: newDealerIndex >= 0 ? newDealerIndex : 0,
            roundNumber: roundNumber + 1,
        });
        get().startRound();
    },

    resetGame: () => {
        set({
            screen: 'MENU',
            gamePhase: 'BETTING',
            players: [],
            deck: [],
            roundNumber: 0,
            resultMessage: '',
            config: null,
            activePlayerIndex: -1,
            isSpectating: false,
            maxSeats: 0,
        });
    },

    addChips: (amount) => {
        const profile = loadProfile();
        if (profile) {
            profile.chips += amount;
            saveProfile(profile);
        }
        const { players } = get();
        if (players.length > 0) {
            const updated = players.map(p => {
                if (p.isHuman) return { ...p, chips: p.chips + amount };
                return p;
            });
            set({ players: updated });
        }
    },
}));
