import React from 'react';
import { motion } from 'framer-motion';
import type { Player } from '../types/game';
import { formatChips } from '../utils/formatChips';
import ChipStack from './ChipStack';
import { ChipIcon } from './ChipIcon';

interface SeatPosition {
    x: number;
    y: number;
}

interface RoundChipSettlementProps {
    activePlayers: Player[];
    seatPositions: SeatPosition[];
    chipPresets?: number[];
    category?: string;
}

function getChipPosition(playerPos: SeatPosition): SeatPosition {
    const t = 0.35;
    return {
        x: playerPos.x + (50 - playerPos.x) * t,
        y: playerPos.y + (50 - playerPos.y) * t,
    };
}

function getSeatCenter(player: Player, pos: SeatPosition): SeatPosition {
    return {
        x: pos.x,
        y: pos.y + (player.isDealer && !player.isHuman ? 10 : 0),
    };
}

const RoundChipSettlement: React.FC<RoundChipSettlementProps> = React.memo(({
    activePlayers,
    seatPositions,
    chipPresets,
    category,
}) => {
    const gatherers = activePlayers
        .map((player, idx) => {
            const pos = seatPositions[idx];
            if (!pos || player.isDealer || player.bet <= 0) return null;
            return {
                player,
                chipPos: getChipPosition(pos),
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    const winners = activePlayers
        .map((player, idx) => {
            const pos = seatPositions[idx];
            const profit = player.roundProfit ?? 0;
            if (!pos || profit <= 0) return null;
            return {
                player,
                profit,
                seatPos: getSeatCenter(player, pos),
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    // กรณีเสมอทั้งโต๊ะ ไม่มีใครได้กำไร คืนชิปเดิมให้ผู้เล่นที่เสมอ
    const drawReturners = winners.length === 0
        ? activePlayers
            .map((player, idx) => {
                const pos = seatPositions[idx];
                if (!pos || player.isDealer || player.bet <= 0 || player.result !== 'draw') return null;
                return {
                    player,
                    chipPos: getChipPosition(pos),
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
        : [];

    const totalPotAmount = gatherers.reduce((sum, g) => sum + g.player.bet, 0);

    return (
        <div className="absolute inset-0 z-30 pointer-events-none">
            {/* 1. รวมชิปทั้งหมดบนโต๊ะเข้าจุดกลาง */}
            {gatherers.map(({ player, chipPos }) => (
                <motion.div
                    key={`gather-${player.id}`}
                    className="absolute"
                    style={{ transform: 'translate(-50%, -50%)' }}
                    initial={{
                        left: `${chipPos.x}%`,
                        top: `${chipPos.y}%`,
                        opacity: 1,
                    }}
                    animate={{
                        left: ['' + chipPos.x + '%', '50%'],
                        top: ['' + chipPos.y + '%', '50%'],
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: 0.56,
                        ease: [0.4, 0, 0.2, 1],
                        opacity: { times: [0, 0.78, 1], duration: 0.56 },
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.85 }}
                        animate={{ scale: [0.85, 0.96, 0.55] }}
                        transition={{ duration: 0.56, times: [0, 0.5, 1], ease: 'easeInOut' }}
                    >
                        <ChipStack amount={player.bet} chipPresets={chipPresets} category={category} />
                    </motion.div>
                </motion.div>
            ))}

            {/* 2. กองชิปรวมตรงกลางโต๊ะ */}
            {totalPotAmount > 0 && (
                <motion.div
                    className="absolute"
                    style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                        delay: 0.36,
                        duration: 0.52,
                        times: [0, 0.28, 0.72, 1],
                        ease: 'easeOut',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.4 }}
                        animate={{ scale: [0.4, 1.08, 1.15, 0.45] }}
                        transition={{
                            delay: 0.36,
                            duration: 0.52,
                            times: [0, 0.32, 0.7, 1],
                            ease: 'easeOut',
                        }}
                    >
                        <ChipStack amount={totalPotAmount} chipPresets={chipPresets} category={category} />
                    </motion.div>
                </motion.div>
            )}

            {/* 3. กระจายชิปจากจุดกลางไปยังผู้ชนะทั้งหมดพร้อมกัน */}
            {winners.map(({ player, profit, seatPos }) => (
                <motion.div
                    key={`distribute-${player.id}`}
                    className="absolute"
                    style={{ transform: 'translate(-50%, -50%)' }}
                    initial={{ left: '50%', top: '50%', opacity: 0 }}
                    animate={{
                        left: ['50%', `${seatPos.x}%`],
                        top: ['50%', `${seatPos.y}%`],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        delay: 0.72,
                        duration: 0.62,
                        ease: [0.22, 1, 0.36, 1],
                        opacity: { delay: 0.72, duration: 0.62, times: [0, 0.14, 0.82, 1] },
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.45 }}
                        animate={{ scale: [0.45, 0.95, 0.85, 0.35] }}
                        transition={{
                            delay: 0.72,
                            duration: 0.62,
                            times: [0, 0.35, 0.78, 1],
                            ease: 'easeOut',
                        }}
                    >
                        <ChipStack amount={profit} chipPresets={chipPresets} category={category} />
                    </motion.div>
                </motion.div>
            ))}

            {/* 3b. กรณีเสมอทั้งโต๊ะ คืนชิปกลับให้ผู้เล่น */}
            {drawReturners.map(({ player, chipPos }) => (
                <motion.div
                    key={`return-${player.id}`}
                    className="absolute"
                    style={{ transform: 'translate(-50%, -50%)' }}
                    initial={{ left: '50%', top: '50%', opacity: 0 }}
                    animate={{
                        left: ['50%', `${chipPos.x}%`],
                        top: ['50%', `${chipPos.y}%`],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        delay: 0.72,
                        duration: 0.56,
                        ease: [0.22, 1, 0.36, 1],
                        opacity: { delay: 0.72, duration: 0.56, times: [0, 0.15, 0.85, 1] },
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: [0.5, 0.9, 0.85] }}
                        transition={{ delay: 0.72, duration: 0.56, times: [0, 0.5, 1] }}
                    >
                        <ChipStack amount={player.bet} chipPresets={chipPresets} category={category} />
                    </motion.div>
                </motion.div>
            ))}

            {/* 4. ตัวเลขจำนวนชิปที่ได้เด้งเข้าตัวผู้ชนะ */}
            {winners.map(({ player, profit, seatPos }) => {
                const bounceDown = seatPos.y <= 14;
                const yFrames = bounceDown
                    ? [-6, 18, 12, 20, 22, 26]
                    : [14, -20, -12, -24, -28, -36];

                return (
                    <motion.div
                        key={`payout-pop-${player.id}`}
                        className="absolute z-40"
                        style={{
                            left: `${seatPos.x}%`,
                            top: `${seatPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 1, 1, 0] }}
                        transition={{
                            delay: 1.2,
                            duration: 1.55,
                            times: [0, 0.12, 0.45, 0.82, 1],
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.25, y: yFrames[0] }}
                            animate={{
                                scale: [0.25, 1.32, 0.94, 1.08, 1, 0.9],
                                y: yFrames,
                            }}
                            transition={{
                                delay: 1.2,
                                duration: 1.55,
                                times: [0, 0.16, 0.28, 0.4, 0.82, 1],
                                ease: 'easeOut',
                            }}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap"
                            style={{
                                background: 'linear-gradient(135deg, rgba(8, 24, 18, 0.92), rgba(0, 0, 0, 0.88))',
                                border: '1px solid rgba(250, 204, 21, 0.5)',
                                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.65), 0 0 12px rgba(250, 204, 21, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                            }}
                        >
                            <ChipIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="font-extrabold tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                <span className="text-emerald-400">+</span>
                                <span className="text-yellow-300">{formatChips(profit)}</span>
                            </span>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>
    );
});

RoundChipSettlement.displayName = 'RoundChipSettlement';

export default RoundChipSettlement;
