import { useEffect } from 'react';
import GameTable from '../components/GameTable';
import { BGM } from '../utils/sound';
import { useGameStore } from '../store/useGameStore';

export default function GameScreen() {
    const config = useGameStore(s => s.config);

    useEffect(() => {
        if (config?.room?.category) {
            BGM.play(config.room.category);
        }
        return () => {
            BGM.stop();
        };
    }, [config?.room?.category]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-theme-standard">
            <GameTable />
        </div>
    );
}
