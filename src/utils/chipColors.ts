/**
 * Casino-standard chip color hierarchy
 * 
 * ⚪ White   = Common (lowest)
 * 🔴 Red     = Standard
 * 🟢 Green   = Medium
 * ⚫ Black   = High
 * 🟣 Purple  = Very High
 * 🟡 Gold    = VIP/Max
 * 💎 Diamond = Mythical/Ultimate
 */

export interface ChipColorStyle {
    fromTo: string;
    border: string;
    textColor: string;
}

const CHIP_TIERS: ChipColorStyle[] = [
    // 0: ⚪ White (Common)
    { fromTo: 'from-gray-100 to-gray-300', border: 'border-gray-400', textColor: 'text-gray-800' },
    // 1: 🔴 Red (Standard)
    { fromTo: 'from-red-500 to-red-700', border: 'border-red-900', textColor: 'text-white' },
    // 2: 🟢 Green (Medium)
    { fromTo: 'from-emerald-500 to-emerald-700', border: 'border-emerald-900', textColor: 'text-white' },
    // 3: ⚫ Black (High)
    { fromTo: 'from-gray-700 to-gray-900', border: 'border-gray-950', textColor: 'text-white' },
    // 4: 🟣 Purple (Very High)
    { fromTo: 'from-purple-500 to-purple-700', border: 'border-purple-900', textColor: 'text-white' },
    // 5: 🟡 Gold (VIP/Max)
    { fromTo: 'from-yellow-400 to-amber-600', border: 'border-amber-800', textColor: 'text-black' },
    // 6: 💎 Diamond (Mythical/Ultimate)
    { fromTo: 'from-cyan-300 via-blue-400 to-indigo-500', border: 'border-indigo-700', textColor: 'text-white' },
];

const CATEGORY_OFFSET: Record<string, number> = {
    'STANDARD': 0,     // White, Red, Green, Black
    'HIGH_STAKES': 1,  // Red, Green, Black, Purple
    'EXPERT': 2,       // Green, Black, Purple, Gold
    'LEGENDARY': 3,    // Black, Purple, Gold, Diamond
    'ULTIMATE': 3,     // Black, Purple, Gold, Diamond (same top tier)
};

/**
 * Get chip color style based on its position (0-3) in the room's presets
 * and the room category. Higher categories shift to more premium colors.
 */
export function getChipStyle(position: number, category: string): ChipColorStyle {
    const offset = CATEGORY_OFFSET[category] ?? 0;
    const tierIndex = Math.min(offset + position, CHIP_TIERS.length - 1);
    return CHIP_TIERS[tierIndex];
}

/**
 * Get chip color for a specific chip value within a room's preset array.
 * Falls back to the highest tier color if value isn't in presets.
 */
export function getChipStyleByValue(value: number, chipPresets: number[], category: string): ChipColorStyle {
    const position = chipPresets.indexOf(value);
    if (position !== -1) {
        return getChipStyle(position, category);
    }
    // For decomposed chips, find the closest preset
    const sorted = [...chipPresets].sort((a, b) => a - b);
    for (let i = sorted.length - 1; i >= 0; i--) {
        if (value <= sorted[i]) {
            return getChipStyle(i, category);
        }
    }
    return getChipStyle(0, category);
}
