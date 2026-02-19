import { formatChips } from '../utils/formatChips';

interface PlayerAvatarProps {
    name: string;
    color: string;
    avatarUrl?: string;
    chips: number;
    isDealer?: boolean;
    isActive?: boolean;
    result?: 'win' | 'lose' | 'draw' | 'pending';
    size?: 'sm' | 'md' | 'lg' | number;
    hideInfo?: boolean;
}

export default function PlayerAvatar({
    name,
    color,
    avatarUrl,
    chips,
    isDealer = false,
    isActive = false,
    result = 'pending',
    size = 'md',
    hideInfo = false,
}: PlayerAvatarProps) {
    const sizeMap = {
        sm: { circle: 'w-9 h-9 text-xs', font: 'text-[10px]', chipFont: 'text-[10px]' },
        md: { circle: 'w-12 h-12 text-sm', font: 'text-xs', chipFont: 'text-xs' },
        lg: { circle: 'w-14 h-14 text-base', font: 'text-sm', chipFont: 'text-sm' },
    };

    const isCustomSize = typeof size === 'number';
    const s = isCustomSize
        ? {
            circle: 'flex items-center justify-center font-bold text-white',
            font: size > 50 ? 'text-sm' : 'text-xs',
            chipFont: size > 50 ? 'text-xs' : 'text-[10px]'
        }
        : sizeMap[size as 'sm' | 'md' | 'lg'];

    const ringStyle =
        result === 'win' ? { boxShadow: `0 0 0 2.5px #34d399, 0 0 12px rgba(52,211,153,0.4)` }
            : result === 'lose' ? { boxShadow: `0 0 0 2.5px #f87171, 0 0 12px rgba(248,113,113,0.4)` }
                : result === 'draw' ? { boxShadow: `0 0 0 2.5px #fbbf24, 0 0 12px rgba(251,191,36,0.4)` }
                    : isActive ? { boxShadow: `0 0 0 2.5px #fde047, 0 0 16px rgba(253,224,71,0.5)` }
                        : { boxShadow: '0 2px 8px rgba(0,0,0,0.3)' };

    const pixelSize = isCustomSize ? size as number : undefined;

    return (
        // Use CSS animation class instead of framer-motion infinite loop — offloads to GPU directly
        <div
            className={`flex flex-col items-center gap-0.5 gpu-layer ${isActive ? 'animate-active-pulse' : ''}`}
        >
            <div className="relative">
                {avatarUrl ? (
                    /* API avatar: photo image */
                    <div
                        className={`${s.circle} rounded-full transition-all duration-300 overflow-hidden`}
                        style={{
                            width: pixelSize ?? undefined,
                            height: pixelSize ?? undefined,
                            ...ringStyle,
                        }}
                    >
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="w-full h-full object-cover rounded-full"
                            draggable={false}
                        />
                    </div>
                ) : (
                    /* Fallback: colored initial */
                    <div
                        className={`${s.circle} rounded-full transition-all duration-300`}
                        style={{
                            background: `linear-gradient(145deg, ${color}, ${color}dd)`,
                            width: pixelSize ?? undefined,
                            height: pixelSize ?? undefined,
                            fontSize: isCustomSize ? Math.max(10, (size as number) * 0.4) : undefined,
                            ...ringStyle,
                        }}
                    >
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
                {isDealer && (
                    <div className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-white/20"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}
                    >
                        D
                    </div>
                )}
            </div>
            {!hideInfo && (
                <>
                    <span className={`text-white ${s.font} font-medium truncate max-w-[70px] leading-tight drop-shadow-md`}>
                        {name}
                    </span>
                    <div className="flex items-center gap-1 bg-black/40 px-1.5 rounded-full">
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                        <span className={`text-yellow-300 ${s.chipFont} font-bold`}>{formatChips(chips)}</span>
                    </div>
                </>
            )}
        </div>
    );
}
