import type { Player } from '../types/game';

/**
 * ระบบตัดสินใจว่า AI ควรออกจากห้องหรือไม่
 * เรียกใน nextRound() หลังจบรอบ ก่อน spawn AI ใหม่
 *
 * เหตุผลการออก 5 แบบ (เรียงตาม Priority):
 * 1. ชิปหมด (100%)
 * 2. แพ้ติดต่อกัน ≥4 รอบ (25-40%)
 * 3. ได้กำไรมาก ≥2x (15-25%)
 * 4. เล่นนาน ≥8 รอบ (8-15%)
 * 5. สุ่มออกเฉยๆ (3%)
 */

export type LeaveReason = 'broke' | 'losing_streak' | 'big_profit' | 'played_long' | 'random' | null;

export function shouldAiLeave(
    player: Player,
    minBet: number,
    totalPlayers: number, // จำนวนผู้เล่นปัจจุบัน (รวม human)
): LeaveReason {
    // Dealer ไม่ออก
    if (player.isDealer) return null;
    // Human ไม่ออก
    if (player.isHuman) return null;

    const roundsPlayed = player.roundsPlayed ?? 0;
    const consecutiveLosses = player.consecutiveLosses ?? 0;
    const peakChips = player.peakChips ?? player.chips;

    // ── Safety: ถ้าคนน้อย ลดโอกาสออก 50% ──
    const scarcityMultiplier = totalPlayers <= 3 ? 0.5 : 1;

    // 1. ชิปหมด → ออกแน่นอน
    if (player.chips < minBet) {
        return 'broke';
    }

    // 2. แพ้ติดต่อกัน ≥4 รอบ → เหมือนคนโมโหลุกจากโต๊ะ
    if (consecutiveLosses >= 4) {
        // ยิ่งแพ้ติดมาก ยิ่งน่าจะออก (25% base → สูงสุด 40%)
        const chance = Math.min(0.25 + (consecutiveLosses - 4) * 0.05, 0.40) * scarcityMultiplier;
        if (Math.random() < chance) return 'losing_streak';
    }

    // 3. ได้กำไรมากกว่า 2x ของชิปตอนเริ่ม → เก็บกำไร
    if (peakChips > 0 && player.chips >= peakChips * 2) {
        const chance = 0.15 * scarcityMultiplier;
        if (Math.random() < chance) return 'big_profit';
    } else if (peakChips > 0 && player.chips >= peakChips * 1.5 && roundsPlayed >= 5) {
        // กำไร 1.5x + เล่นมาพอสมควร → น้อยกว่า 2x หน่อย
        const chance = 0.10 * scarcityMultiplier;
        if (Math.random() < chance) return 'big_profit';
    }

    // 4. เล่นนานมาก ≥8 รอบ → เหมือนคนที่ต้องไปทำอย่างอื่น
    if (roundsPlayed >= 8) {
        // ยิ่งเล่นนานยิ่งน่าจะออก (8% base → สูงสุด 15%)
        const chance = Math.min(0.08 + (roundsPlayed - 8) * 0.015, 0.15) * scarcityMultiplier;
        if (Math.random() < chance) return 'played_long';
    }

    // 5. สุ่มออกเฉยๆ → เบื่อ / มีนัด
    if (roundsPlayed >= 2) { // ต้องเล่นอย่างน้อย 2 รอบก่อน
        const chance = 0.03 * scarcityMultiplier;
        if (Math.random() < chance) return 'random';
    }

    return null;
}

/**
 * ตรวจสอบว่า AI ตัวไหนควรออกจากห้อง
 * Return: ผู้เล่นที่ควรออก (สูงสุด 1 คนต่อรอบ ยกเว้น broke)
 */
export function getAiLeavers(
    players: Player[],
    minBet: number,
): { player: Player; reason: LeaveReason }[] {
    const totalPlayers = players.length;
    const leavers: { player: Player; reason: LeaveReason }[] = [];
    let voluntaryLeaveUsed = false; // สูงสุด 1 คนต่อรอบ (ไม่รวม broke)

    for (const player of players) {
        const reason = shouldAiLeave(player, minBet, totalPlayers);
        if (!reason) continue;

        if (reason === 'broke') {
            // ชิปหมด ออกเสมอ ไม่จำกัดจำนวน
            leavers.push({ player, reason });
        } else if (!voluntaryLeaveUsed) {
            // สมัครใจออก: สูงสุด 1 คนต่อรอบ
            leavers.push({ player, reason });
            voluntaryLeaveUsed = true;
        }
    }

    return leavers;
}
