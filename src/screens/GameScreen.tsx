import GameTable from '../components/GameTable';

export default function GameScreen() {
    return (
        <div className="w-full h-full relative overflow-hidden bg-theme-standard">
            <GameTable />
        </div>
    );
}
