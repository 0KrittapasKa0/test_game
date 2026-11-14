import type { DealerVariant, RoomConfig } from '../types/game';

export type RoomCategory = RoomConfig['category'];
const roomImages: Record<RoomCategory, string> = {
    STANDARD: 'standard', HIGH_STAKES: 'high-stakes', EXPERT: 'expert',
    LEGENDARY: 'legendary', ULTIMATE: 'ultimate',
};
export function sceneAsset(name: string) {
    return `${import.meta.env.BASE_URL}art/${name}.webp`;
}
export function roomSceneAsset(category: RoomCategory) {
    return sceneAsset(roomImages[category]);
}

export function dealerSpriteAsset(variant: DealerVariant = 'male') {
    return sceneAsset(variant === 'female' ? 'dealer-female' : 'dealer');
}
