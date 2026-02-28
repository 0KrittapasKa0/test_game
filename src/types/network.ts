import type { Player, GameConfig, GamePhase } from './game';

export type NetworkRole = 'HOST' | 'CLIENT';

// Allowed messages sent over the PeerJS connection
export type NetworkMessage =
    | { type: 'ROOM_INFO'; payload: { config: GameConfig; hostName: string; hasDealer: boolean; currentPlayersCount: number } }
    | { type: 'JOIN_REQUEST'; payload: { player: Player; requestedRole: 'dealer' | 'player' } }
    | { type: 'JOIN_RESPONSE'; payload: { accepted: boolean; reason?: string } }
    | {
        type: 'GAME_STATE_UPDATE';
        payload: {
            players: Player[];
            gamePhase: GamePhase | 'WAITING';
            isDealing?: boolean;
            showCards?: boolean;
            activePlayerIndex?: number;
            dealerIndex?: number;
        };
    }
    | { type: 'PLAYER_ACTION'; payload: { action: 'draw' | 'stay'; playerId: string } }
    | { type: 'GAME_START'; payload: {} }
    | { type: 'PLAYER_LEFT'; payload: { playerId: string } };

