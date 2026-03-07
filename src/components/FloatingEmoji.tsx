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

// Noto CDN: 512px = animated webp, smaller sizes = static
export function getAnimatedEmojiUrl(emoji: string, size: number = 512): string {
    const code = Array.from(emoji)
        .map(char => char.codePointAt(0)?.toString(16))
        .filter(c => c !== 'fe0f') // remove variation selector
        .join('_');
    return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/${size}.webp`;
}

// Noto CDN Fallback for Static image (using smaller size or default PNG route)
export function getStaticEmojiUrl(emoji: string): string {
    const code = Array.from(emoji)
        .map(char => char.codePointAt(0)?.toString(16))
        .filter(c => c !== 'fe0f') // remove variation selector
        .join('_');
    // 128px is often static or we can just rely on the static .png endpoint if it exists.
    // However, the most reliable static Noto emoji endpoint is the standard image endpoint:
    return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/128.webp`;
}

// ============================================================
// Persistent Emoji Cache (Cache API + Object URL)
// ============================================================
// - Caches images permanently in browser Cache Storage
// - Creates Object URLs for instant access (no network needed)
// - Falls back to CDN if cache miss
// ============================================================

const CACHE_NAME = 'ponk-emoji-cache-v1';
const objectUrlCache = new Map<string, string>(); // url → objectURL (in-memory fast access)
let cacheReady = false;

async function getCachedUrl(url: string): Promise<string> {
    // 1) Check in-memory object URL cache (instant)
    const cached = objectUrlCache.get(url);
    if (cached) return cached;

    // 2) Check persistent Cache Storage
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url);
        if (response) {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            objectUrlCache.set(url, objectUrl);
            return objectUrl;
        }
    } catch {
        // Cache API not available — fall through
    }

    // 3) Cache miss — return original CDN URL
    return url;
}

async function cacheUrl(url: string): Promise<void> {
    if (objectUrlCache.has(url)) return;

    try {
        const cache = await caches.open(CACHE_NAME);
        // Check if already in persistent cache
        const existing = await cache.match(url);
        if (existing) {
            const blob = await existing.blob();
            objectUrlCache.set(url, URL.createObjectURL(blob));
            return;
        }

        // Fetch and store
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const clone = response.clone();
            await cache.put(url, clone);
            const blob = await response.blob();
            objectUrlCache.set(url, URL.createObjectURL(blob));
        }
    } catch {
        // Network error or Cache API not available — silently fail
    }
}

/**
 * Preload and cache all emoji images.
 * Call once on app startup for persistent offline support.
 */
export async function preloadEmojis(emojis: string[]): Promise<void> {
    if (cacheReady) return;
    cacheReady = true;

    // Preload in small batches to avoid overwhelming the network
    const urls = emojis.map(e => getAnimatedEmojiUrl(e, 512));
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await Promise.all(batch.map(url => cacheUrl(url)));
    }
}

// --- Single floating emoji with pure CSS animation (GPU-accelerated) ---
const FloatingEmojiItem = memo(function FloatingEmojiItem({ event }: { event: FloatingEmojiEvent }) {
    const [visible, setVisible] = useState(false);
    const [imgSrc, setImgSrc] = useState(getAnimatedEmojiUrl(event.emoji));

    useEffect(() => {
        // Try to load from cache
        getCachedUrl(getAnimatedEmojiUrl(event.emoji)).then(setImgSrc);
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
