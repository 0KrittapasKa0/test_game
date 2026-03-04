import { create } from 'zustand';
import Peer, { DataConnection } from 'peerjs';
import type { Player, GameConfig, GamePhase } from '../types/game';
import type { NetworkMessage } from '../types/network';
import { loadProfile, saveProfile, recordGameResult } from '../utils/storage';
import {
    initOnlinePlayerLuckState,
    removeOnlinePlayerLuckState,
    shouldAssistOnlineOpening,
    pickAssistedOnlineOpeningCards,
    shouldAssistOnlineThirdCard,
    pickAssistedOnlineThirdCard,
    recordOnlineRoundResult,
    incrementOnlineTotalRounds,
    resetOnlineRoundState
} from '../utils/onlineLuckAssist';
import { createDeck, shuffleDeck, evaluateHand, HandType, compareHands } from '../utils/deck';
import { SFX } from '../utils/sound';

interface OnlineGameState {
    // Game Data
    config: GameConfig | null;
    players: Player[];
    isHost: boolean;
    roomId: string | null;
    localPlayerId: string | null;
    hostRoomInfo: { config: GameConfig; hostName: string; hasDealer: boolean; currentPlayersCount: number } | null;
    gamePhase: GamePhase | 'WAITING';

    // Animation and Runtime States
    isDealing: boolean;
    showCards: boolean;
    isSpectating: boolean;
    activePlayerIndex: number;
    dealerIndex: number;
    humanBetConfirmed: boolean;

    // Networking Data
    peer: Peer | null;
    connections: DataConnection[]; // For host to keep track of clients
    hostConnection: DataConnection | null; // For client to talk to host
    connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
    pingInterval: ReturnType<typeof setInterval> | null;

    // Actions
    createRoom: (config: GameConfig) => void;
    searchRoom: (roomId: string) => Promise<boolean>;
    joinRoom: (role: 'dealer' | 'player' | 'spectator') => Promise<boolean>;
    leaveRoom: () => void;

    // Host only actions
    startGame: () => void;
    dealCards: () => void;
    processNextTurn: () => void;
    showdown: () => void;
    nextRound: () => void;
    roundNumber: number;

    // Both
    playerAction: (action: 'draw' | 'stay') => void;
    placeBet: (amount: number) => void;
    confirmBet: () => void;
}

// ─── Timeout Tracking System ──────────────────────────────────────────────────
// Prevents memory leaks and race conditions if game is reset mid-round
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];

function setGameTimeout(handler: () => void, timeout?: number) {
    const id = setTimeout(() => {
        activeTimeouts = activeTimeouts.filter(t => t !== id);
        handler();
    }, timeout);
    activeTimeouts.push(id);
    return id;
}

function clearAllGameTimeouts() {
    activeTimeouts.forEach(clearTimeout);
    activeTimeouts = [];
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getTurnOrder(players: Player[], dealerIndex: number): number[] {
    const order: number[] = [];
    // Start from player to the right of dealer (index - 1)
    // Go counter-clockwise down to 0, then from max to dealerIndex + 1
    for (let i = dealerIndex - 1; i >= 0; i--) {
        if (players[i] && !players[i].isSpectating) {
            order.push(i);
        }
    }
    for (let i = players.length - 1; i > dealerIndex; i--) {
        if (players[i] && !players[i].isSpectating) {
            order.push(i);
        }
    }
    return order;
}

export const useOnlineStore = create<OnlineGameState>((set, get) => ({
    config: null,
    players: [],
    isHost: false,
    roomId: null,
    localPlayerId: null,
    hostRoomInfo: null,
    gamePhase: 'WAITING',
    isDealing: false,
    showCards: false,
    isSpectating: false,
    activePlayerIndex: -1,
    dealerIndex: -1,
    roundNumber: 1,
    humanBetConfirmed: false,
    peer: null,
    connections: [],
    hostConnection: null,
    connectionStatus: 'DISCONNECTED',
    pingInterval: null,

    createRoom: (config: GameConfig) => {
        const profile = loadProfile()!;

        // Dealer gets seat 0; non-dealer player usually takes center bottom.
        const seatIndex = config.humanIsDealer ? 0 : Math.floor(config.playerCount / 2);

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
            seatIndex: seatIndex,
        };

        // Initialize fair luck assist state for this specific user
        initOnlinePlayerLuckState(humanPlayer.id, humanPlayer.chips);

        const id = generateRoomId();

        // 1. Initialize Peer as Host
        const peer = new Peer(id);

        peer.on('open', (id) => {
            console.log('Room created with ID: ', id);
            set({ connectionStatus: 'CONNECTED', dealerIndex: config.humanIsDealer ? 0 : -1 });
        });

        // 2. Handle incoming connections
        peer.on('connection', (conn) => {
            conn.on('open', () => {
                const { config: currentConfig, players: currentPlayers } = get();
                if (currentConfig) {
                    const hasDealer = currentPlayers.some(p => p.isDealer);
                    conn.send({
                        type: 'ROOM_INFO',
                        payload: { config: currentConfig, hostName: currentPlayers[0].name, hasDealer, currentPlayersCount: currentPlayers.filter(p => !p.isSpectating).length }
                    } as NetworkMessage);
                }
            });

            conn.on('data', (data: any) => {
                const message = data as NetworkMessage;
                // Currently, we just acknowledge and sync back the info.
                // In a real flow, host checks if room is full or if role is available
                if (message.type === 'JOIN_REQUEST') {
                    const { player: joiningPlayer } = message.payload;
                    const { players: currentPlayers, config: currentConfig } = get();

                    // Exclude spectators from room full check
                    const activePlayersCount = currentPlayers.filter(p => !p.isSpectating).length;

                    // If room is full, only allow spectators
                    if (!currentConfig || (activePlayersCount >= currentConfig.playerCount && !joiningPlayer.isSpectating)) {
                        conn.send({ type: 'JOIN_RESPONSE', payload: { accepted: false, reason: 'Room is full' } } as NetworkMessage);
                        return;
                    }

                    // Assign a unique seat index
                    let assignedSeat = joiningPlayer.isDealer ? 0 : 1;
                    if (joiningPlayer.isSpectating) {
                        assignedSeat = -1;
                    } else if (!joiningPlayer.isDealer) {
                        const usedSeats = new Set(currentPlayers.filter(p => !p.isSpectating).map(p => p.seatIndex));
                        for (let i = 1; i < currentConfig.playerCount; i++) {
                            if (!usedSeats.has(i)) {
                                assignedSeat = i;
                                break;
                            }
                        }
                    }
                    joiningPlayer.seatIndex = assignedSeat;

                    // Accept participant
                    const newPlayers = [...currentPlayers, joiningPlayer];
                    initOnlinePlayerLuckState(joiningPlayer.id, joiningPlayer.chips);
                    set({ players: newPlayers, connections: [...get().connections, conn] });

                    // Tell client they are accepted
                    conn.send({ type: 'JOIN_RESPONSE', payload: { accepted: true } } as NetworkMessage);

                    // Broadcast new state to all clients
                    get().connections.forEach(clientConn => {
                        clientConn.send({ type: 'GAME_STATE_UPDATE', payload: { players: newPlayers, gamePhase: get().gamePhase } } as NetworkMessage);
                    });
                } else if (message.type === 'PLAYER_ACTION') {
                    // In simple version, we assume valid action for current active player
                    const { action, playerId } = message.payload;
                    const state = get();
                    if (state.gamePhase === 'PLAYER_ACTION' && state.players[state.activePlayerIndex]?.id === playerId) {
                        state.playerAction(action);
                    }
                } else if ((message as any).type === 'PLAYER_BET') {
                    // Update the specific player's bet on the host
                    const { playerId, bet } = (message as any).payload;
                    const newPlayers = get().players.map(p => {
                        if (p.id === playerId) {
                            const maxBet = p.chips + p.bet;
                            const validBet = Math.max(0, Math.min(bet, maxBet));
                            if (validBet > p.bet) { SFX.chipStack(); } // Play sound locally on host
                            return { ...p, bet: validBet, chips: p.chips + p.bet - validBet };
                        }
                        return p;
                    });
                    set({ players: newPlayers });
                    // Broadcast the updated bets back to everyone so they see the change
                    get().connections.forEach(clientConn => {
                        clientConn.send({ type: 'GAME_STATE_UPDATE', payload: { players: newPlayers, gamePhase: get().gamePhase, isDealing: get().isDealing, showCards: get().showCards, activePlayerIndex: get().activePlayerIndex, dealerIndex: get().dealerIndex } } as NetworkMessage);
                    });
                } else if ((message as any).type === 'PLAYER_READY') {
                    const { playerId } = (message as any).payload;
                    const newPlayers = get().players.map(p => p.id === playerId ? { ...p, hasActed: true } : p);
                    set({ players: newPlayers });
                    // Broadcast updated hasActed state
                    get().connections.forEach(clientConn => {
                        clientConn.send({ type: 'GAME_STATE_UPDATE', payload: { players: newPlayers, gamePhase: get().gamePhase, isDealing: get().isDealing, showCards: get().showCards, activePlayerIndex: get().activePlayerIndex, dealerIndex: get().dealerIndex } } as NetworkMessage);
                    });

                    const dealerPlayer = newPlayers.find(p => p.isDealer);
                    if (dealerPlayer && dealerPlayer.id === playerId) {
                        get().dealCards();
                    }
                }
            });

            conn.on('close', () => {
                const disconnectedPeerId = conn.peer;
                const { players, connections } = get();

                // Remove player
                const newPlayers = players.filter(p => p.id !== disconnectedPeerId);
                const newConnections = connections.filter(c => c.connectionId !== conn.connectionId);

                // Check if game can continue
                const hasDealer = newPlayers.some(p => p.isDealer);
                const hasEnoughPlayers = newPlayers.length >= 2;
                const shouldResetToWaiting = !hasDealer || !hasEnoughPlayers;
                const newPhase = shouldResetToWaiting ? 'WAITING' : get().gamePhase;

                if (shouldResetToWaiting && get().gamePhase !== 'WAITING') {
                    console.log("Not enough players or no dealer. Resetting to WAITING phase.");
                    // Reset players' hands and bet when forcing waiting phase
                    newPlayers.forEach(p => {
                        p.cards = [];
                        p.bet = p.isDealer ? 0 : (p.isHuman ? 0 : get().config?.room.minBet || 10);
                        p.hasActed = false;
                        p.result = 'pending';
                        p.score = 0;
                        p.hasPok = false;
                    });
                }

                set({
                    players: newPlayers,
                    connections: newConnections,
                    gamePhase: newPhase,
                    isDealing: shouldResetToWaiting ? false : get().isDealing,
                    showCards: shouldResetToWaiting ? false : get().showCards
                });

                // Notify others
                newConnections.forEach(clientConn => {
                    clientConn.send({ type: 'PLAYER_LEFT', payload: { playerId: disconnectedPeerId } } as NetworkMessage);
                    // Also send full state update just in case
                    clientConn.send({
                        type: 'GAME_STATE_UPDATE',
                        payload: { players: newPlayers, gamePhase: newPhase, isDealing: get().isDealing, showCards: get().showCards, activePlayerIndex: get().activePlayerIndex, dealerIndex: get().dealerIndex }
                    } as NetworkMessage);
                });

                // Cleanup luck state
                removeOnlinePlayerLuckState(disconnectedPeerId);
            });
        });

        const interval = setInterval(() => {
            const { connections: currentConns, players: currentPlayers } = get();
            if (!currentConns.length) return;

            const deadConnIds = new Set<string>();
            currentConns.forEach(c => {
                const pcState = (c as any).peerConnection?.connectionState;
                if (!c.open || pcState === 'disconnected' || pcState === 'failed' || pcState === 'closed') {
                    deadConnIds.add(c.connectionId);
                }
            });

            if (deadConnIds.size > 0) {
                const aliveConnections = currentConns.filter(c => !deadConnIds.has(c.connectionId));
                let newPlayers = [...currentPlayers];
                const disconnectedPeerIds = currentConns.filter(c => deadConnIds.has(c.connectionId)).map(c => c.peer);

                disconnectedPeerIds.forEach(peerId => {
                    console.log("Heartbeat detected disconnected player:", peerId);
                    newPlayers = newPlayers.filter(p => p.id !== peerId);
                    removeOnlinePlayerLuckState(peerId);
                });

                // Check if game can continue
                const hasDealer = newPlayers.some(p => p.isDealer);
                const hasEnoughPlayers = newPlayers.length >= 2;
                const shouldResetToWaiting = !hasDealer || !hasEnoughPlayers;
                const newPhase = shouldResetToWaiting ? 'WAITING' : get().gamePhase;

                if (shouldResetToWaiting && get().gamePhase !== 'WAITING') {
                    console.log("Not enough players or no dealer due to heartbeat disconnect. Resetting to WAITING phase.");
                    // Reset players' hands and bet when forcing waiting phase
                    newPlayers.forEach(p => {
                        p.cards = [];
                        p.bet = p.isDealer ? 0 : (p.isHuman ? 0 : get().config?.room.minBet || 10);
                        p.hasActed = false;
                        p.result = 'pending';
                        p.score = 0;
                        p.hasPok = false;
                    });
                }

                set({
                    players: newPlayers,
                    connections: aliveConnections,
                    gamePhase: newPhase,
                    isDealing: shouldResetToWaiting ? false : get().isDealing,
                    showCards: shouldResetToWaiting ? false : get().showCards
                });

                // Notify others
                aliveConnections.forEach(clientConn => {
                    disconnectedPeerIds.forEach(peerId => {
                        clientConn.send({ type: 'PLAYER_LEFT', payload: { playerId: peerId } } as NetworkMessage);
                    });
                    clientConn.send({
                        type: 'GAME_STATE_UPDATE',
                        payload: { players: newPlayers, gamePhase: newPhase, isDealing: get().isDealing, showCards: get().showCards, activePlayerIndex: get().activePlayerIndex, dealerIndex: get().dealerIndex }
                    } as NetworkMessage);
                });
            }
        }, 2000);

        set({
            config,
            players: [humanPlayer],
            isHost: true,
            roomId: id,
            localPlayerId: humanPlayer.id,
            peer,
            connectionStatus: 'CONNECTING',
            gamePhase: 'WAITING',
            pingInterval: interval,
        });
    },

    searchRoom: async (targetRoomId: string): Promise<boolean> => {
        // Disconnect any existing sessions just in case
        get().leaveRoom();

        return new Promise((resolve) => {
            const peer = new Peer();
            set({ connectionStatus: 'CONNECTING', peer });

            let resolved = false;

            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (get().peer === peer) {
                        get().leaveRoom();
                    }
                    resolve(false);
                }
            }, 6000); // 6 seconds to cover both peer open and connection

            peer.on('open', () => {
                const conn = peer.connect(targetRoomId.toUpperCase());

                conn.on('open', () => {
                    // Send a ping message or just establish connection
                    // Wait for ROOM_INFO from host to resolve
                });

                conn.on('data', (data: any) => {
                    const message = data as NetworkMessage;
                    if (message.type === 'ROOM_INFO' && !resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        set({
                            hostConnection: conn,
                            connectionStatus: 'CONNECTED',
                            roomId: targetRoomId.toUpperCase(),
                            hostRoomInfo: message.payload
                        });
                        resolve(true);
                    }
                });
            });

            peer.on('error', (err) => {
                console.error("PeerJS Error:", err);
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    if (get().peer === peer) {
                        get().leaveRoom();
                    }
                    resolve(false);
                } else {
                    if (get().peer === peer) {
                        get().leaveRoom();
                    }
                }
            });
        });
    },

    joinRoom: async (role: 'dealer' | 'player' | 'spectator'): Promise<boolean> => {
        const { peer, hostConnection } = get();
        if (!peer || !hostConnection) return false;

        const profile = loadProfile()!;

        // Let's assume the host calculates seatIndex
        const humanPlayer: Player = {
            id: peer.id, // Using peer ID as network ID
            name: profile.name,
            avatarColor: profile.avatarColor,
            avatarUrl: profile.avatarUrl,
            isHuman: true,
            isDealer: role === 'dealer',
            isSpectating: role === 'spectator',
            cards: [],
            bet: 0,
            chips: profile.chips,
            score: 0,
            hasPok: false,
            dengMultiplier: 1,
            hasActed: false,
            result: 'pending',
            seatIndex: role === 'dealer' ? 0 : 4, // Host would correctly recalculate this later
        };

        return new Promise((resolve) => {
            let resolved = false;

            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    // If host doesn't respond in time, reject join attempt
                    resolve(false);
                }
            }, 6000); // 6 second timeout to join

            // Listen for acceptance
            const tempListener = (data: any) => {
                const message = data as NetworkMessage;
                if (message.type === 'JOIN_RESPONSE' && !resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    hostConnection.off('data', tempListener); // clear listener

                    if (message.payload.accepted) {
                        // We are in. Now we listen for game state updates.
                        hostConnection.on('data', (updateData: any) => {
                            const updateMsg = updateData as NetworkMessage;
                            if (updateMsg.type === 'GAME_STATE_UPDATE') {
                                const currentState = get();
                                const currentPhase = currentState.gamePhase;
                                const oldPlayers = currentState.players;
                                const newPlayers = updateMsg.payload.players;

                                // Check if someone else placed a bet to play sound
                                if (oldPlayers.length > 0 && newPlayers) {
                                    newPlayers.forEach((np: any) => {
                                        const op = oldPlayers.find(p => p.id === np.id);
                                        // If someone else's bet increased
                                        if (op && np.bet > op.bet && np.id !== currentState.localPlayerId) {
                                            SFX.chipStack();
                                        }
                                    });
                                }

                                const myPlayerLocal = newPlayers.find((p: any) => p.id === currentState.localPlayerId);

                                set({
                                    players: newPlayers,
                                    gamePhase: updateMsg.payload.gamePhase,
                                    isDealing: updateMsg.payload.isDealing ?? false,
                                    showCards: updateMsg.payload.showCards ?? false,
                                    activePlayerIndex: updateMsg.payload.activePlayerIndex ?? -1,
                                    dealerIndex: updateMsg.payload.dealerIndex ?? -1,
                                    isSpectating: myPlayerLocal ? myPlayerLocal.isSpectating : currentState.isSpectating,
                                });
                                // If game phase went back to BETTING or WAITING from another phase, reset confirmation constraint
                                if (currentPhase !== updateMsg.payload.gamePhase) {
                                    if (updateMsg.payload.gamePhase === 'BETTING' || updateMsg.payload.gamePhase === 'WAITING') {
                                        set({ humanBetConfirmed: false });
                                    }
                                    // Client-side spectator detection: if we're broke when BETTING starts, enter spectator mode
                                    if (updateMsg.payload.gamePhase === 'BETTING' && newPlayers) {
                                        const myPlayer = newPlayers.find((p: any) => p.id === currentState.localPlayerId);
                                        const myConfig = currentState.config;
                                        if (myPlayer && myConfig && myPlayer.chips < myConfig.room.minBet && !myPlayer.isDealer) {
                                            set({ isSpectating: true });
                                        }
                                    }
                                    // Client-side stats tracking and profile persistence when round ends
                                    if (updateMsg.payload.gamePhase === 'ROUND_END' && newPlayers) {
                                        const myPlayer = newPlayers.find((p: any) => p.id === currentState.localPlayerId);
                                        if (myPlayer && !currentState.isSpectating) {
                                            const profile = loadProfile();
                                            if (profile) {
                                                profile.chips = myPlayer.chips;
                                                saveProfile(profile);

                                                recordGameResult(
                                                    myPlayer.result as 'win' | 'lose' | 'draw',
                                                    myPlayer.chips,
                                                    myPlayer.roundProfit ?? 0
                                                );
                                            }
                                        }
                                    }
                                }
                            } else if (updateMsg.type === 'PLAYER_LEFT') {
                                // For good measure, we can just log or show a toast, but GAME_STATE_UPDATE usually handles the UI
                                const { playerId } = updateMsg.payload;
                                console.log(`Player ${playerId} left the room`);
                            }
                        });

                        // Handle host disconnecting
                        hostConnection.on('close', () => {
                            if (get().hostConnection === hostConnection) {
                                console.log("Host disconnected");
                                get().leaveRoom();
                            }
                            // In a real app, you might want to show a toast/alert saying "Host left the game" here
                        });

                        // Use the real config received during searchRoom
                        const realConfig = get().hostRoomInfo?.config || {
                            playerCount: 5,
                            humanIsDealer: false,
                            room: {
                                id: 'net_room', name: 'ห้องออนไลน์', emoji: '🌐', minBet: 10, maxBet: 100, chipPresets: [10, 20, 50, 100], dealerMinCapital: 500, aiChips: 0, color: '#3b82f6', category: 'STANDARD'
                            }
                        };

                        set({
                            isHost: false,
                            localPlayerId: peer.id,
                            config: realConfig,
                            players: [humanPlayer], // Host will overwrite this with GAME_STATE_UPDATE
                            isSpectating: role === 'spectator'
                        });
                        resolve(true);
                    } else {
                        get().leaveRoom();
                        resolve(false);
                    }
                }
            };

            hostConnection.on('data', tempListener);

            // Send request
            hostConnection.send({ type: 'JOIN_REQUEST', payload: { player: humanPlayer, requestedRole: role } } as NetworkMessage);
        });
    },

    leaveRoom: () => {
        const { players, peer, connections, hostConnection, localPlayerId, pingInterval } = get();
        // Cleanup luck states
        players.forEach(p => removeOnlinePlayerLuckState(p.id));

        if (pingInterval) clearInterval(pingInterval);
        clearAllGameTimeouts();

        // Save current chips for the local player before leaving
        const humanPlayer = players.find(p => p.id === localPlayerId);
        if (humanPlayer) {
            const profile = loadProfile();
            if (profile) {
                profile.chips = humanPlayer.chips;
                saveProfile(profile);
            }
        }

        // Network cleanup
        if (hostConnection) hostConnection.close();
        connections.forEach(c => c.close());
        if (peer) peer.destroy();

        set({
            config: null,
            players: [],
            isHost: false,
            roomId: null,
            hostRoomInfo: null,
            gamePhase: 'WAITING',
            isDealing: false,
            showCards: false,
            isSpectating: false,
            activePlayerIndex: -1,
            dealerIndex: -1,
            peer: null,
            connections: [],
            hostConnection: null,
            connectionStatus: 'DISCONNECTED',
            pingInterval: null,
        });
    },

    startGame: () => {
        const { isHost, connections, players, config } = get();
        if (!isHost || !config) return;

        SFX.roundStart();

        // Ensure dealerIndex is correctly mapped
        const dealerIdx = players.findIndex(p => p.isDealer);

        // Reset state for new round
        const resetPlayers = players.map((p) => ({
            ...p,
            cards: [],
            hasActed: !p.isHuman, // AI players auto-confirm their bet to not block the host
            result: 'pending' as const,
            score: 0,
            hasPok: false,
            dengMultiplier: 1,
            bet: 0, // no more auto-bet, let UI handle it
            previousChips: p.chips,
        }));

        set({
            players: resetPlayers,
            gamePhase: 'BETTING',
            isDealing: false,
            showCards: false,
            activePlayerIndex: -1,
            dealerIndex: dealerIdx,
            humanBetConfirmed: false,
        });

        // Broadcast GAME_STATE_UPDATE
        const postState = get();
        connections.forEach(conn => {
            conn.send({
                type: 'GAME_STATE_UPDATE',
                payload: {
                    players: postState.players,
                    gamePhase: 'BETTING',
                    isDealing: false,
                    showCards: false,
                    activePlayerIndex: -1,
                    dealerIndex: dealerIdx
                }
            } as NetworkMessage);
        });
    },

    dealCards: () => {
        const { isHost, players, connections, dealerIndex } = get();
        if (!isHost) return;

        set({ gamePhase: 'DEALING', isDealing: true });

        let deck = shuffleDeck(createDeck());

        // --- Online Luck Assist: Opening Hand ---
        // Need to run shouldAssistOnlineOpening for every player, and if true,
        // pre-pick their 2 cards so they don't just get random ones.
        // We'll store what they should get, and replace cards during dealing loop.
        const assistedCardsMap = new Map<string, [import('../types/game').Card, import('../types/game').Card]>();

        const { roundNumber } = get();
        resetOnlineRoundState(roundNumber); // Reset flags for the new round

        players.forEach(p => {
            if (p.isSpectating) return; // Skip spectators
            const totalChipsBeforeBet = p.chips + p.bet; // Because chips were already deducted
            if (shouldAssistOnlineOpening(p.id, totalChipsBeforeBet)) {
                const assisted = pickAssistedOnlineOpeningCards(p.id, deck, roundNumber);
                if (assisted) {
                    assistedCardsMap.set(p.id, assisted.cards);
                    deck = assisted.remainingDeck;
                }
            }
        });

        hostDeckRef.current = deck;

        connections.forEach(conn => {
            conn.send({
                type: 'GAME_STATE_UPDATE',
                payload: {
                    players: get().players,
                    gamePhase: 'DEALING',
                    isDealing: true,
                    showCards: false,
                    activePlayerIndex: -1,
                    dealerIndex: dealerIndex
                }
            } as NetworkMessage);
        });

        let totalCardsToDeal = 0;
        let dealSequence: { pIndex: number, card: import('../types/game').Card }[] = [];

        // 2 passes of dealing 1 card
        for (let round = 0; round < 2; round++) {
            for (let i = 0; i < players.length; i++) {
                // Determine order starting left of dealer
                let pIndex = (dealerIndex + 1 + i) % players.length;
                const p = players[pIndex];

                if (p.isSpectating) continue; // Skip dealing to spectators

                // Do they have assisted cards?
                const assistedCards = assistedCardsMap.get(p.id);
                if (assistedCards) {
                    dealSequence.push({ pIndex, card: assistedCards[round] });
                    totalCardsToDeal++;
                } else if (hostDeckRef.current && hostDeckRef.current.length > 0) {
                    dealSequence.push({ pIndex, card: hostDeckRef.current.shift()! });
                    totalCardsToDeal++;
                }
            }
        }

        dealSequence.forEach((dealAction, index) => {
            setGameTimeout(() => {
                SFX.cardDeal(); // Play card deal sound
                const currentPlayers = get().players;
                const updatedPlayers = currentPlayers.map((p, idx) => {
                    if (idx === dealAction.pIndex) {
                        return { ...p, cards: [...p.cards, dealAction.card] };
                    }
                    return p;
                });

                set({ players: updatedPlayers });

                // Broadcast the updated state
                const { gamePhase, isDealing, showCards, activePlayerIndex, dealerIndex: dIndex } = get();
                connections.forEach(conn => {
                    conn.send({
                        type: 'GAME_STATE_UPDATE',
                        payload: { players: updatedPlayers, gamePhase, isDealing, showCards, activePlayerIndex, dealerIndex: dIndex }
                    } as NetworkMessage);
                });

                // On last card dealt
                if (index === dealSequence.length - 1) {
                    setGameTimeout(() => {
                        const { players: currentP, dealerIndex: dIdx } = get();
                        let evaluatedPlayers = currentP.map(p => {
                            const hand = evaluateHand(p.cards);
                            if (hand.type <= HandType.POK_8) {
                                // Do NOT set hasActed here, let processNextTurn show the skip animation
                                return { ...p, hasPok: true, score: hand.score, dengMultiplier: hand.deng };
                            }
                            // Crucial: reset hasActed here so they get a chance to draw 3rd card!
                            return { ...p, hasPok: false, hasActed: false };
                        });

                        const dealer = dIdx >= 0 ? evaluatedPlayers[dIdx] : null;

                        if (dealer && dealer.hasPok) {
                            // If dealer has Pok, everyone must be forced to end round (no 3rd card possible)
                            SFX.pokReveal();
                            setGameTimeout(() => SFX.countdownTick(), 600);
                            setGameTimeout(() => SFX.countdownTick(), 1200);

                            evaluatedPlayers = evaluatedPlayers.map(p => ({ ...p, hasActed: true }));

                            set({ players: evaluatedPlayers, gamePhase: 'SHOWDOWN', isDealing: false, showCards: true });
                            connections.forEach(conn => {
                                conn.send({
                                    type: 'GAME_STATE_UPDATE',
                                    payload: { players: evaluatedPlayers, gamePhase: 'SHOWDOWN', isDealing: false, showCards: true, activePlayerIndex: -1, dealerIndex: dIdx }
                                } as NetworkMessage);
                            });
                            setGameTimeout(() => get().showdown(), 1600);
                        } else {
                            // Anyone who got Pok gets a sound effect
                            const anyPok = evaluatedPlayers.some((p, i) => i !== dIdx && p.hasPok);
                            if (anyPok) SFX.pok();

                            // Check if all active non-dealer opponents have Pok
                            // If they do, there is no reason for the dealer to play a turn because Pok always wins
                            const activeOpponents = evaluatedPlayers.filter((p, i) => !p.isSpectating && i !== dIdx);
                            const allOpponentsPok = activeOpponents.length > 0 && activeOpponents.every(p => p.hasPok);

                            if (allOpponentsPok) {
                                // Mark dealer as acted to skip to showdown
                                if (dIdx >= 0) {
                                    evaluatedPlayers[dIdx] = { ...evaluatedPlayers[dIdx], hasActed: true };
                                }

                                set({ players: evaluatedPlayers, gamePhase: 'SHOWDOWN', isDealing: false, showCards: true });

                                connections.forEach(conn => {
                                    conn.send({
                                        type: 'GAME_STATE_UPDATE',
                                        payload: { players: evaluatedPlayers, gamePhase: 'SHOWDOWN', isDealing: false, showCards: true, activePlayerIndex: -1, dealerIndex: dIdx }
                                    } as NetworkMessage);
                                });

                                setGameTimeout(() => get().showdown(), 1600);
                            } else {
                                set({ players: evaluatedPlayers, gamePhase: 'PLAYER_ACTION', isDealing: false });

                                // Delay before first action to match offline but faster
                                setGameTimeout(() => {
                                    get().processNextTurn();
                                }, 400);
                            }
                        }
                    }, 1000);
                }
            }, index * 350 + 400); // Stagger deal by 350ms, initial delay 400ms to match offline
        });
    },

    processNextTurn: () => {
        const { players, dealerIndex, connections } = get();

        const turnOrder = getTurnOrder(players, dealerIndex);

        let nextPlayerIdx = -1;
        for (const idx of turnOrder) {
            if (!players[idx].hasActed) {
                nextPlayerIdx = idx;
                break;
            }
        }

        // If all players have acted, it's dealer's turn
        if (nextPlayerIdx === -1) {
            nextPlayerIdx = dealerIndex;
        }

        // Check if dealer has acted - if so, round ends
        const dealer = players[dealerIndex];
        if (nextPlayerIdx === dealerIndex && dealer && dealer.hasActed) {
            SFX.showdownReveal();
            set({ gamePhase: 'SHOWDOWN', showCards: true, activePlayerIndex: -1 });
            const showState = get();
            connections.forEach(conn => {
                conn.send({
                    type: 'GAME_STATE_UPDATE',
                    payload: { players: showState.players, gamePhase: 'SHOWDOWN', isDealing: false, showCards: true, activePlayerIndex: -1, dealerIndex }
                } as NetworkMessage);
            });
            setGameTimeout(() => get().showdown(), 1500);
            return;
        }

        const nextPlayer = players[nextPlayerIdx];

        // Match offline Pok skipping animation
        if (nextPlayer && nextPlayer.hasPok && nextPlayerIdx !== dealerIndex) {
            const updated = [...players];
            updated[nextPlayerIdx] = { ...updated[nextPlayerIdx], hasActed: true };

            set({ players: updated, activePlayerIndex: nextPlayerIdx });

            const skipState = get();
            connections.forEach(conn => {
                conn.send({
                    type: 'GAME_STATE_UPDATE',
                    payload: { players: skipState.players, gamePhase: skipState.gamePhase, isDealing: false, showCards: false, activePlayerIndex: nextPlayerIdx, dealerIndex }
                } as NetworkMessage);
            });

            // Wait 350ms to show their turn visually, then process the next one (faster than offline 500ms)
            setGameTimeout(() => get().processNextTurn(), 350);
            return;
        }

        SFX.yourTurn();
        set({ activePlayerIndex: nextPlayerIdx });

        const postState = get();
        connections.forEach(conn => {
            conn.send({
                type: 'GAME_STATE_UPDATE',
                payload: {
                    players: postState.players,
                    gamePhase: postState.gamePhase,
                    isDealing: false,
                    showCards: false,
                    activePlayerIndex: postState.activePlayerIndex,
                    dealerIndex: postState.dealerIndex
                }
            } as NetworkMessage);
        });
    },

    playerAction: (action: 'draw' | 'stay') => {
        const { isHost, hostConnection, players, activePlayerIndex, localPlayerId } = get();

        const myPlayer = players.find(p => p.id === localPlayerId);
        if (!myPlayer) return;

        // If client, send action to host (spam-protected)
        if (!isHost) {
            const clientTarget = players[activePlayerIndex];
            if (!clientTarget || clientTarget.id !== localPlayerId || clientTarget.hasActed) return;
            if (action === 'draw' && clientTarget.cards.length >= 3) return;

            if (hostConnection) {
                hostConnection.send({ type: 'PLAYER_ACTION', payload: { action, playerId: myPlayer.id } } as NetworkMessage);
            }
            return;
        }

        // If Host, process the action directly (spam-protected)
        const targetPlayer = players[activePlayerIndex];
        if (!targetPlayer || targetPlayer.hasActed) return;
        if (action === 'draw' && targetPlayer.cards.length >= 3) return;

        let updatedPlayers = [...players];

        if (action === 'draw') {
            let deck = hostDeckRef.current;
            if (deck && deck.length > 0) {
                let card: import('../types/game').Card;

                // --- Online Luck Assist: Third Card ---
                const totalChipsBeforeBet = targetPlayer.chips + targetPlayer.bet;
                if (shouldAssistOnlineThirdCard(targetPlayer.id, totalChipsBeforeBet)) {
                    const assisted = pickAssistedOnlineThirdCard(targetPlayer.id, targetPlayer.cards, deck);
                    if (assisted) {
                        card = assisted.card;
                        deck = assisted.remainingDeck;
                        hostDeckRef.current = deck;
                    } else {
                        card = deck.shift()!;
                    }
                } else {
                    card = deck.shift()!;
                }

                updatedPlayers[activePlayerIndex] = { ...targetPlayer, cards: [...targetPlayer.cards, card], hasActed: true };
            }
        } else {
            updatedPlayers[activePlayerIndex] = { ...targetPlayer, hasActed: true };
        }

        set({ players: updatedPlayers });

        // Small delay to allow clients to render the draw if it happened (faster than offline 800/500ms)
        if (action === 'draw') SFX.cardSlide();
        setGameTimeout(() => {
            get().processNextTurn();
        }, action === 'draw' ? 600 : 150);
    },

    showdown: () => {
        const { players, dealerIndex, connections } = get();
        const dealer = players[dealerIndex];
        if (!dealer) return;

        // Calculate Results
        const results = players.map((p, i) => {
            if (i === dealerIndex) return { ...p, result: 'pending' as const };

            const playerResult = evaluateHand(p.cards);
            const dealerResult = evaluateHand(dealer.cards);
            const outcome = compareHands(dealerResult, playerResult);

            let result: 'win' | 'lose' | 'draw' = 'draw';
            let finalChips = p.chips;

            if (outcome === 'player') {
                // Player won: Return bet + (bet * playerDeng)
                result = 'win';
                const winnings = p.bet * playerResult.deng;
                finalChips = p.chips + p.bet + winnings;
            } else if (outcome === 'dealer') {
                // Player lost
                result = 'lose';
                const extraLoss = p.bet * (dealerResult.deng - 1);
                finalChips = Math.max(0, p.chips - extraLoss);
            } else {
                // Draw: return bet only
                result = 'draw';
                finalChips = p.chips + p.bet;
            }

            const startChips = p.previousChips ?? p.chips;
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

        // Dealer Calc
        let dealerTotalWin = 0;
        let dealerTotalLoss = 0;

        results.forEach((p, i) => {
            if (i === dealerIndex) return;
            const playerResult = evaluateHand(p.cards);
            const dealerResult = evaluateHand(dealer.cards);

            if (p.result === 'win') {
                dealerTotalLoss += p.bet * playerResult.deng;
            } else if (p.result === 'lose') {
                dealerTotalWin += p.bet * dealerResult.deng;
            }
        });

        const dealerNet = dealerTotalWin - dealerTotalLoss;
        const dealerResultData = evaluateHand(dealer.cards);

        results[dealerIndex] = {
            ...dealer,
            result: dealerNet >= 0 ? 'win' : 'lose',
            chips: Math.max(0, dealer.chips + dealerNet),
            score: dealerResultData.score,
            hasPok: dealerResultData.type <= HandType.POK_8,
            dengMultiplier: dealerResultData.deng,
            roundProfit: dealerNet,
        };

        // --- Stats Tracking & AI Record ---
        const { isSpectating, localPlayerId, roundNumber } = get();
        const profile = loadProfile();

        // Track the round globally
        incrementOnlineTotalRounds();

        results.forEach(p => {
            // Record in Luck Assist tracking
            recordOnlineRoundResult(p.id, p.result as 'win' | 'lose' | 'draw', roundNumber);

            // Save actual profile storage for the local player
            if (p.id === localPlayerId && !isSpectating && profile) {
                profile.chips = p.chips;
                saveProfile(profile);

                // Add to overall stats
                recordGameResult(
                    p.result as 'win' | 'lose' | 'draw',
                    p.chips,
                    p.roundProfit ?? 0
                );
            }
        });



        set({ players: results, gamePhase: 'ROUND_END', activePlayerIndex: -1 });

        // Play local showdown sound
        const myResult = results.find(p => p.id === localPlayerId);
        if (myResult && !isSpectating) {
            if (myResult.result === 'win') {
                if (myResult.dengMultiplier >= 2) SFX.bigWin();
                else SFX.win();
                setGameTimeout(() => SFX.chipCollect(), 400);
            } else if (myResult.result === 'lose') {
                SFX.lose();
            } else {
                SFX.draw();
            }
        } else {
            // Spectators hear general game over
            SFX.gameOver();
        }

        // Broadcast ROUND_END
        connections.forEach(conn => {
            conn.send({
                type: 'GAME_STATE_UPDATE',
                payload: { players: results, gamePhase: 'ROUND_END', isDealing: false, showCards: true }
            } as NetworkMessage);
        });
    },

    nextRound: () => {
        const { isHost, connections, players, config, localPlayerId } = get();
        if (!isHost || !config) return;

        // ── Check if local player (host) should enter spectator mode ──
        const localPlayer = players.find(p => p.id === localPlayerId);
        if (localPlayer && localPlayer.chips < config.room.minBet && !localPlayer.isDealer) {
            set({ isSpectating: true });
        }

        // ── Check if dealer is broke → kick to spectator and reset to WAITING ──
        const currentDealer = players.find(p => p.isDealer);
        if (currentDealer && currentDealer.chips < config.room.minBet) {
            // Dealer is broke, set them to spectating. 
            // In online mode, we don't automatically assign a new dealer, so we reset to WAITING.

            // Note: We use the local `isSpectating` for the host's perspective
            if (currentDealer.id === localPlayerId) {
                set({ isSpectating: true });
            }

            // No automatic dealer assignment in online mode -> reset to WAITING
            const resetPlayers = players.map(p => ({
                ...p,
                isDealer: false, // Clear dealer status
                isSpectating: p.id === currentDealer.id ? true : p.isSpectating,
                cards: [],
                bet: 0,
                hasActed: false,
                result: 'pending' as const,
                score: 0,
                hasPok: false,
            }));

            set({
                players: resetPlayers,
                gamePhase: 'WAITING',
                isDealing: false,
                showCards: false,
                dealerIndex: -1,
            });
            connections.forEach(conn => {
                conn.send({
                    type: 'GAME_STATE_UPDATE',
                    payload: { players: resetPlayers, gamePhase: 'WAITING', isDealing: false, showCards: false, activePlayerIndex: -1, dealerIndex: -1 }
                } as NetworkMessage);
            });
            return;
        }

        // ── Check if any non-dealer player is broke → mark them not participating ──
        // (They stay in the room but won't bet this round)

        const currentPlayers = get().players;
        const dealerIdx = currentPlayers.findIndex(p => p.isDealer);

        // Reset state for new round except chips
        const resetPlayers = currentPlayers.map((p) => {
            const isBroke = p.chips < config.room.minBet;

            // If they are already spectating, or just went broke this round
            const spectating = p.isSpectating || isBroke;

            return {
                ...p,
                isSpectating: p.isDealer ? false : spectating,
                cards: [],
                hasActed: p.isDealer ? false : (spectating ? true : false), // Spectators auto-act
                result: 'pending' as const,
                score: 0,
                hasPok: false,
                dengMultiplier: 1,
                bet: 0, // no more auto-bet, let UI handle it
                previousChips: p.chips,
            };
        });

        // ── Check if there are any active players left to challenge the dealer ──
        const activeChallengers = resetPlayers.filter(p => !p.isDealer && !p.isSpectating);
        if (activeChallengers.length === 0) {
            // No one left to play against the dealer, reset to WAITING
            const waitingPlayers = resetPlayers.map(p => ({
                ...p,
                isDealer: false, // Clear dealer status since game is essentially over
                hasActed: false,
            }));

            // If the host is the dealer, or there are no other active players, the host technically spectates the waiting room
            if (activeChallengers.length === 0 && localPlayerId === currentPlayers[dealerIdx]?.id) {
                // Keep the host in the room but not as dealer
            }

            set({
                players: waitingPlayers,
                gamePhase: 'WAITING',
                isDealing: false,
                showCards: false,
                dealerIndex: -1,
            });
            connections.forEach(conn => {
                conn.send({
                    type: 'GAME_STATE_UPDATE',
                    payload: { players: waitingPlayers, gamePhase: 'WAITING', isDealing: false, showCards: false, activePlayerIndex: -1, dealerIndex: -1 }
                } as NetworkMessage);
            });
            return;
        }

        set({
            players: resetPlayers,
            gamePhase: 'BETTING',
            isDealing: false,
            showCards: false,
            activePlayerIndex: -1,
            dealerIndex: dealerIdx,
            humanBetConfirmed: false,
            roundNumber: get().roundNumber + 1,
        });

        // Broadcast GAME_STATE_UPDATE
        const postState = get();
        connections.forEach(conn => {
            conn.send({
                type: 'GAME_STATE_UPDATE',
                payload: {
                    players: postState.players,
                    gamePhase: 'BETTING',
                    isDealing: false,
                    showCards: false,
                    activePlayerIndex: -1,
                    dealerIndex: dealerIdx
                }
            } as NetworkMessage);
        });
    },

    placeBet: (amount: number) => {
        const { players, config, localPlayerId, isHost, hostConnection } = get();
        if (!config || !localPlayerId) return;

        SFX.chipPlace();

        const updated = players.map(p => {
            if (p.id !== localPlayerId) return p;
            if (p.isDealer) return p;

            const maxBet = p.chips + p.bet;
            const validBet = Math.max(0, Math.min(amount, maxBet));
            const prevBet = p.bet;
            return {
                ...p,
                bet: validBet,
                chips: p.chips + prevBet - validBet
            };
        });

        // Optimistically set local state
        set({ players: updated });

        // If client, we need to send this to the host so they know we changed our bet
        if (!isHost && hostConnection) {
            hostConnection.send({
                type: 'PLAYER_BET',
                payload: { playerId: localPlayerId, bet: amount }
            } as any); // We will need to add this type later, but for MVP we cast to any
        } else if (isHost) {
            // Broadcast the host's new bet to all clients
            const state = get();
            state.connections.forEach(clientConn => {
                clientConn.send({ type: 'GAME_STATE_UPDATE', payload: { players: state.players, gamePhase: state.gamePhase, isDealing: state.isDealing, showCards: state.showCards, activePlayerIndex: state.activePlayerIndex, dealerIndex: state.dealerIndex } } as NetworkMessage);
            });
        }
    },

    confirmBet: () => {
        const { isHost, hostConnection, localPlayerId, players } = get();

        // For local player (human)
        set({ humanBetConfirmed: true });

        if (isHost) {
            // Also set hasActed for the host so UI knows
            const newPlayers = players.map(p => p.id === localPlayerId ? { ...p, hasActed: true, lastBet: p.bet } : p);
            set({ players: newPlayers });

            const dealerPlayer = newPlayers.find(p => p.isDealer);
            if (dealerPlayer && dealerPlayer.id === localPlayerId) {
                // Host is Dealer and clicked "Deal Cards"
                get().dealCards();
            } else {
                // Host is just a player confirming bet. Broadcast state so clients see Host is ready.
                const state = get();
                state.connections.forEach(clientConn => {
                    clientConn.send({ type: 'GAME_STATE_UPDATE', payload: { players: state.players, gamePhase: state.gamePhase, isDealing: state.isDealing, showCards: state.showCards, activePlayerIndex: state.activePlayerIndex, dealerIndex: state.dealerIndex } } as NetworkMessage);
                });
            }
        } else {
            // Notify host we are ready
            if (hostConnection) {
                hostConnection.send({
                    type: 'PLAYER_READY',
                    payload: { playerId: localPlayerId }
                } as any);
            }
            // Need to set local player to acted nicely on UI before update
            set({ players: players.map(p => p.id === localPlayerId ? { ...p, hasActed: true, lastBet: p.bet } : p) });
        }
    },
}));

// Local host ref to keep deck without putting it in sync state
const hostDeckRef: { current: import('../types/game').Card[] | null } = { current: null };
