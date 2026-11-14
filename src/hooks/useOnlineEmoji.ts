import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useOnlineStore } from '../store/useOnlineStore';
import type { FloatingEmojiEvent } from '../components/FloatingEmoji';
import { tryBotEmoji, trySocialReaction, getContextualEmojiResponse, resetEmojiCooldowns, updateMood } from '../utils/aiEmojiLogic';
import type { EmojiContext } from '../utils/aiEmojiLogic';

export function useOnlineEmoji() {
    const players = useOnlineStore(s => s.players);
    const gamePhase = useOnlineStore(s => s.gamePhase);
    const activePlayerIndex = useOnlineStore(s => s.activePlayerIndex);
    const localPlayerId = useOnlineStore(s => s.localPlayerId);
    const sendEmoji = useOnlineStore(s => s.sendEmoji);
    const onEmojiReceived = useOnlineStore(s => s.onEmojiReceived);
    const offEmojiReceived = useOnlineStore(s => s.offEmojiReceived);
    const latestAiEvents = useOnlineStore(s => s.latestAiEvents);
    const activePlayers = useMemo(() => players.filter(p => !p.isSpectating), [players]);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiEvents, setEmojiEvents] = useState<FloatingEmojiEvent[]>([]);
    const timeoutsRef = useRef<Set<number>>(new Set());

    const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
        const id = window.setTimeout(() => {
            timeoutsRef.current.delete(id);
            fn();
        }, ms);
        timeoutsRef.current.add(id);
        return id;
    }, []);

    useEffect(() => {
        const timeouts = timeoutsRef.current;
        return () => {
            timeouts.forEach(id => window.clearTimeout(id));
            timeouts.clear();
        };
    }, []);

    const handleSendEmoji = useCallback((emoji: string) => {
        if (!localPlayerId) return;

        const newEvent: FloatingEmojiEvent = {
            id: `emoji-${Date.now()}`,
            playerId: localPlayerId,
            emoji,
            timestamp: Date.now()
        };

        setEmojiEvents(prev => [...prev, newEvent]);
        scheduleTimeout(() => {
            setEmojiEvents(prev => prev.filter(e => e.id !== newEvent.id));
        }, 2000);

        // Broadcast to other players via PeerJS
        sendEmoji(emoji);

        // Simulated bots replying if any bots present
        const aiPlayers = activePlayers.filter(p => !p.isHuman);
        if (aiPlayers.length > 0) {
            aiPlayers.forEach((ai) => {
                const delay = 600 + Math.random() * 2500;
                scheduleTimeout(() => {
                    const aiEmoji = getContextualEmojiResponse(emoji, ai.id);
                    if (aiEmoji) {
                        const aiEvent: FloatingEmojiEvent = {
                            id: `emoji-ai-${Date.now()}-${ai.id}`,
                            playerId: ai.id,
                            emoji: aiEmoji,
                            timestamp: Date.now()
                        };
                        setEmojiEvents(prev => [...prev, aiEvent]);
                        scheduleTimeout(() => {
                            setEmojiEvents(prev => prev.filter(e => e.id !== aiEvent.id));
                        }, 2000);
                    }
                }, delay);
            });
        }

    }, [localPlayerId, activePlayers, sendEmoji, scheduleTimeout]);

    // --- Listen for emojis from other players over the network ---
    useEffect(() => {
        const handleRemoteEmoji = (playerId: string, emoji: string, eventId: string) => {
            if (playerId === localPlayerId) return;

            const event: FloatingEmojiEvent = {
                id: eventId,
                playerId,
                emoji,
                timestamp: Date.now()
            };
            setEmojiEvents(prev => [...prev, event]);
            scheduleTimeout(() => {
                setEmojiEvents(prev => prev.filter(e => e.id !== eventId));
            }, 2500);
        };
        onEmojiReceived(handleRemoteEmoji);
        return () => offEmojiReceived(handleRemoteEmoji);
    }, [localPlayerId, onEmojiReceived, offEmojiReceived, scheduleTimeout]);

    // --- Listen to Join/Leave Events ---
    useEffect(() => {
        if (!latestAiEvents || latestAiEvents.length === 0) return;

        latestAiEvents.forEach(event => {
            const delay = 400 + Math.random() * 800; // Quick reaction

            scheduleTimeout(() => {
                let context: EmojiContext | null = null;
                if (event.type === 'join') {
                    context = 'join_room';
                } else if (event.type === 'leave') {
                    if (event.player.result === 'win' || event.player.result === 'draw') {
                        context = 'leave_win';
                    } else {
                        context = 'leave_lose';
                    }
                }

                if (context) {
                    const emoji = tryBotEmoji(event.player.id, context);
                    if (emoji) {
                        const newEvent: FloatingEmojiEvent = {
                            id: `ai-event-${Date.now()}-${event.player.id}`,
                            playerId: event.player.id,
                            emoji,
                            timestamp: Date.now()
                        };
                        setEmojiEvents(prev => [...prev, newEvent]);
                        scheduleTimeout(() => {
                            setEmojiEvents(prev => prev.filter(e => e.id !== newEvent.id));
                        }, 2500);
                    }
                }
            }, delay);
        });
    }, [latestAiEvents, scheduleTimeout]);

    // --- Autonomous AI Emojis (Organic Engine v2) ---
    useEffect(() => {
        const currentPlayers = useOnlineStore.getState().players.filter(p => !p.isSpectating);
        const aiPlayers = currentPlayers.filter(p => !p.isHuman);
        if (aiPlayers.length === 0) return;

        if (gamePhase === 'BETTING') {
            resetEmojiCooldowns();
        }

        const schedule = (playerId: string, emoji: string, delayMs: number) => {
            scheduleTimeout(() => {
                const event: FloatingEmojiEvent = {
                    id: `ai-${Date.now()}-${Math.random()}`,
                    playerId,
                    emoji,
                    timestamp: Date.now()
                };
                setEmojiEvents(prev => [...prev, event]);
                scheduleTimeout(() => {
                    setEmojiEvents(prev => prev.filter(e => e.id !== event.id));
                }, 2500);
            }, delayMs);
        };

        if (gamePhase === 'BETTING') {
            const bot = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
            const emoji = tryBotEmoji(bot.id, 'waiting');
            if (emoji) schedule(bot.id, emoji, 1500 + Math.random() * 3000);
        } else if (gamePhase === 'PLAYER_ACTION') {
            aiPlayers.forEach(bot => {
                if (bot.hasActed) return;
                let ctx: EmojiContext;
                if (bot.hasPok) ctx = 'my_pok';
                else if (bot.score < 4) ctx = 'my_bad_hand';
                else if (bot.score <= 7) ctx = 'my_ok_hand';
                else ctx = 'staying';
                const emoji = tryBotEmoji(bot.id, ctx);
                if (emoji) schedule(bot.id, emoji, 300 + Math.random() * 1000);
            });

            // Social: react to someone else's Pok
            const pokPlayers = currentPlayers.filter(p => p.hasPok);
            if (pokPlayers.length > 0) {
                aiPlayers.forEach(bot => {
                    if (bot.hasPok) return;
                    const emoji = trySocialReaction(bot.id, 'see_pok');
                    if (emoji) schedule(bot.id, emoji, 800 + Math.random() * 1500);
                });
            }

            const currentBot = currentPlayers[activePlayerIndex];
            if (currentBot && !currentBot.isHuman && !currentBot.hasActed) {
                const ctx: EmojiContext = currentBot.score <= 5 ? 'drawing' : 'staying';
                const emoji = tryBotEmoji(currentBot.id, ctx);
                if (emoji) schedule(currentBot.id, emoji, 400 + Math.random() * 600);
            }
        } else if (gamePhase === 'ROUND_END') {
            aiPlayers.forEach(bot => {
                const result = bot.result === 'win' ? 'win' : bot.result === 'lose' ? 'lose' : 'draw';
                updateMood(bot.id, result as 'win' | 'lose' | 'draw');

                const delay = 1000 + Math.random() * 2500;
                let ctx: EmojiContext;
                if (bot.result === 'win') ctx = 'round_win';
                else if (bot.result === 'lose') ctx = 'round_loss';
                else ctx = 'round_ok';
                const emoji = tryBotEmoji(bot.id, ctx);
                if (emoji) schedule(bot.id, emoji, delay);
            });
        }
    }, [gamePhase, activePlayerIndex, scheduleTimeout]);

    return { emojiEvents, showEmojiPicker, setShowEmojiPicker, handleSendEmoji };
}
