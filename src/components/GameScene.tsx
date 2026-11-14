import { memo } from 'react';
import { sceneAsset, roomSceneAsset, type RoomCategory } from '../utils/gameArt';
import './GameScene.css';

export const GameScene = memo(function GameScene({ category, lobby = false }: { category?: RoomCategory; lobby?: boolean }) {
    return (
        <div className={`game-scene ${lobby ? 'game-scene--lobby' : ''}`} aria-hidden="true">
            <img src={lobby || !category ? sceneAsset('lobby') : roomSceneAsset(category)} alt="" draggable={false} />
            <div className="game-scene__shade" />
        </div>
    );
});

export const TableArtwork = memo(function TableArtwork({ category = 'STANDARD' }: { category?: RoomCategory }) {
    return (
        <div className={`table-artwork table-artwork--${category.toLowerCase()}`} aria-hidden="true">
            <img src={sceneAsset('table')} alt="" draggable={false} />
            <div className="table-artwork__felt-tint" />
        </div>
    );
});
