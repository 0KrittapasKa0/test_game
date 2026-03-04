import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnimatedEmojiUrl, preloadEmojis } from './FloatingEmoji';

export interface EmojiCategory {
    id: string;
    name: string;
    emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        id: 'greetings',
        name: 'ทักทาย',
        emojis: ['👋', '🙏', '🤝', '💖', '💯']
    },
    {
        id: 'happy',
        name: 'ดีใจ',
        emojis: ['😄', '🎉', '👏', '🤩', '🤑']
    },
    {
        id: 'suspense',
        name: 'ลุ้น',
        emojis: ['🫣', '🥶', '😱', '🤞', '🥺']
    },
    {
        id: 'sad',
        name: 'เศร้า',
        emojis: ['😭', '💔', '😓', '😵', '💸']
    },
    {
        id: 'angry',
        name: 'โกรธ',
        emojis: ['😡', '🤬', '😤', '🙄', '😠']
    },
    {
        id: 'teasing',
        name: 'หยอกล้อ',
        emojis: ['😏', '😝', '🤫', '🥱', '😎']
    }
];

interface EmojiPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
    const [activeTab, setActiveTab] = useState(EMOJI_CATEGORIES[0].id);

    // Preload all emoji images on first open
    useEffect(() => {
        if (isOpen) {
            const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
            preloadEmojis(allEmojis);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[100]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Picker Popup */}
                    <motion.div
                        className="fixed bottom-20 sm:bottom-24 left-4 sm:left-6 z-[101] w-[340px] max-w-[90vw] rounded-2xl overflow-hidden glass border border-white/10 shadow-2xl flex flex-col"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        {/* Tabs */}
                        <div className="flex bg-black/40 p-1 border-b border-white/10 shrink-0">
                            {EMOJI_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveTab(category.id)}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === category.id
                                        ? 'bg-white/20 text-white shadow-sm'
                                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>

                        {/* Emoji Grid */}
                        <div className="p-3">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="grid grid-cols-5 gap-2"
                                >
                                    {EMOJI_CATEGORIES.find(c => c.id === activeTab)?.emojis.map(emoji => (
                                        <motion.button
                                            key={emoji}
                                            whileHover={{ scale: 1.15 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => {
                                                onSelect(emoji);
                                                onClose();
                                            }}
                                            className="aspect-square flex items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            <img
                                                src={getAnimatedEmojiUrl(emoji)}
                                                alt={emoji}
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                                decoding="async"
                                                width={48}
                                                height={48}
                                            />
                                        </motion.button>
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
