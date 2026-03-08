import { memo, useEffect, useState } from 'react';

export interface FloatingEmojiEvent {
    id: string;
    playerId: string;
    emoji: string;
    timestamp: number;
}

interface FloatingEmojiProps {
    events: FloatingEmojiEvent[];
    playerId: string;
}

// Local Animated Emoji (from public/emojis folder)
export function getAnimatedEmojiUrl(emoji: string, _size: number = 512): string {
    const code = Array.from(emoji)
        .map(char => char.codePointAt(0)?.toString(16))
        .filter(c => c !== 'fe0f') // remove variation selector
        .join('_');
    return `/emojis/${code}_${_size}.webp`;
}

// Local Static Emoji fallback (if applicable, currently mapping to the same animated file)
export function getStaticEmojiUrl(emoji: string): string {
    const code = Array.from(emoji)
        .map(char => char.codePointAt(0)?.toString(16))
        .filter(c => c !== 'fe0f') // remove variation selector
        .join('_');
    return `/emojis/${code}_512.webp`; // Fallback to the 512px version on local
}



// --- Single floating emoji with pure CSS animation (GPU-accelerated) ---
const FloatingEmojiItem = memo(function FloatingEmojiItem({ event }: { event: FloatingEmojiEvent }) {
    const [visible, setVisible] = useState(false);
    const imgSrc = getAnimatedEmojiUrl(event.emoji);

    useEffect(() => {
        // Trigger CSS animation on next frame
        requestAnimationFrame(() => setVisible(true));
    }, [event.emoji]);

    return (
        <div
            className={`absolute flex items-center justify-center transition-none ${visible ? 'emoji-pop-active' : 'emoji-pop-start'}`}
            style={{ willChange: 'transform, opacity' }}
        >
            <img
                src={imgSrc}
                alt={event.emoji}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-lg"
                width={64}
                height={64}
                decoding="async"
            />
        </div>
    );
});

// --- Main component (memoized to prevent unnecessary re-renders) ---
export default memo(function FloatingEmoji({ events, playerId }: FloatingEmojiProps) {
    // Only show events for this specific player
    const playerEvents = events.filter(e => e.playerId === playerId);

    return (
        <div className="absolute inset-0 pointer-events-none z-[120] flex items-center justify-center">
            {playerEvents.map((event) => (
                <FloatingEmojiItem key={event.id} event={event} />
            ))}
        </div>
    );
});
