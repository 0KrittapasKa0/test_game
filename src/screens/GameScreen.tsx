import { useEffect } from 'react';
import GameTable from '../components/GameTable';
import { BGM } from '../utils/sound';

export default function GameScreen() {
    useEffect(() => {
        BGM.play();
        return () => {
            BGM.stop();
        };
    }, []);

    return (
        <div className="w-full h-full relative overflow-hidden bg-theme-standard">
            <GameTable />
        </div>
    );
}
