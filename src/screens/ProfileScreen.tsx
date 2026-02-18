import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPen, Trophy, Flame, Sparkles, TrendingUp, Camera } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadProfile, saveProfile, loadStats } from '../utils/storage';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';

/* ─── Donut Chart ─── */
function DonutChart({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
    const total = wins + losses + draws;
    if (total === 0) {
        return (
            <div className="flex items-center justify-center w-32 h-32 rounded-full border-4 border-white/5">
                <span className="text-gray-500 text-xs">ยังไม่มีข้อมูล</span>
            </div>
        );
    }

    const radius = 50;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * radius;

    const winPct = wins / total;
    const losePct = losses / total;
    const drawPct = draws / total;

    const winLen = circumference * winPct;
    const loseLen = circumference * losePct;
    const drawLen = circumference * drawPct;

    const winOffset = 0;
    const loseOffset = -winLen;
    const drawOffset = -(winLen + loseLen);

    return (
        <div className="relative">
            <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Win arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#22c55e"
                    strokeDasharray={`${winLen} ${circumference - winLen}`}
                    strokeDashoffset={winOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    strokeLinecap="round"
                />
                {/* Lose arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#ef4444"
                    strokeDasharray={`${loseLen} ${circumference - loseLen}`}
                    strokeDashoffset={loseOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    strokeLinecap="round"
                />
                {/* Draw arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#6b7280"
                    strokeDasharray={`${drawLen} ${circumference - drawLen}`}
                    strokeDashoffset={drawOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    strokeLinecap="round"
                />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-xl font-bold">{Math.round(winPct * 100)}%</span>
                <span className="text-gray-400 text-[10px]">ชนะ</span>
            </div>
        </div>
    );
}

/* ─── Line Chart (SVG) ─── */
function ChipHistoryChart({ data }: { data: number[] }) {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-32 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-500 text-xs">เล่นอีกสักหน่อยเพื่อดูกราฟ...</span>
            </div>
        );
    }

    const width = 300;
    const height = 100;
    const padding = { top: 10, bottom: 10, left: 5, right: 5 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const min = Math.min(...data) * 0.9;
    const max = Math.max(...data) * 1.1 || 1;

    const points = data.map((val, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + chartH - ((val - min) / (max - min)) * chartH;
        return { x, y };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Gradient area path
    const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${points[0].x.toFixed(1)} ${height - padding.bottom} Z`;

    const lastPoint = points[points.length - 1];
    const trend = data[data.length - 1] >= data[0];

    return (
        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs flex items-center gap-1">
                    <TrendingUp size={12} />
                    ประวัติชิป (30 รอบล่าสุด)
                </span>
                <span className={`text-xs font-bold ${trend ? 'text-green-400' : 'text-red-400'}`}>
                    {formatChips(data[data.length - 1])}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: '100px' }}>
                <defs>
                    <linearGradient id="chipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={trend ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={trend ? '#22c55e' : '#ef4444'} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Area fill */}
                <path d={areaD} fill="url(#chipGrad)" />
                {/* Line */}
                <path d={pathD} fill="none" stroke={trend ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Current point dot */}
                <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={trend ? '#22c55e' : '#ef4444'} />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="6" fill={trend ? '#22c55e' : '#ef4444'} opacity="0.3" />
            </svg>
        </div>
    );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <motion.div
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-1"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <div className="text-lg" style={{ color }}>{icon}</div>
            <span className="text-white text-lg font-bold">{value}</span>
            <span className="text-gray-500 text-[10px] tracking-wide">{label}</span>
        </motion.div>
    );
}

/* ─── Main Profile Screen ─── */
export default function ProfileScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const profile = loadProfile()!;
    const stats = useMemo(() => loadStats(), []);

    const [name, setName] = useState(profile.name);
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveName = () => {
        if (name.trim().length === 0) return;
        SFX.betConfirm();
        saveProfile({ ...profile, name: name.trim() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 150; // Resize to 150x150 to save space
                canvas.width = size;
                canvas.height = size;
                if (ctx) {
                    // Crop center
                    const minSide = Math.min(img.width, img.height);
                    const sx = (img.width - minSide) / 2;
                    const sy = (img.height - minSide) / 2;
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    saveProfile({ ...profile, avatarUrl: dataUrl });
                    window.location.reload(); // Simple reload to reflect changes everywhere
                }
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const winRate = stats.totalRounds > 0
        ? Math.round((stats.wins / stats.totalRounds) * 100)
        : 0;

    return (
        <div className="w-full h-full page-bg flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
                className="glass w-full max-w-md p-5 sm:p-7 space-y-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                {/* Back */}
                <button
                    onClick={() => setScreen('MENU')}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white transition cursor-pointer text-sm"
                >
                    <ArrowLeft size={18} />
                    กลับ
                </button>

                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div
                            onClick={handleAvatarClick}
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden shadow-lg cursor-pointer transition-transform group-active:scale-95"
                            style={!profile.avatarUrl ? { backgroundColor: profile.avatarColor, boxShadow: `0 0 20px ${profile.avatarColor}40` } : {}}
                        >
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                (name.trim() || profile.name).charAt(0).toUpperCase()
                            )}
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={20} className="text-white" />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={20}
                                className="flex-1 text-lg font-semibold p-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-yellow-500/60 focus:outline-none transition-all min-w-0"
                            />
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSaveName}
                                disabled={name.trim().length === 0}
                                className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition cursor-pointer"
                            >
                                <UserPen size={18} />
                            </motion.button>
                        </div>
                        {saved && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-green-400 text-xs mt-1"
                            >
                                ✅ บันทึกแล้ว
                            </motion.p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
                            <span className="text-yellow-300 text-sm font-bold">{formatChips(profile.chips)}</span>
                            <span className="text-gray-500 text-xs">ชิป</span>
                        </div>
                    </div>
                </div>

                {/* Section: สถิติ */}
                <div>
                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 font-bold text-sm mb-3 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-yellow-400" />
                        สถิติการเล่น
                    </h3>

                    <div className="grid grid-cols-2 gap-2.5">
                        <StatCard
                            icon={<span>🎮</span>}
                            label="เล่นทั้งหมด"
                            value={stats.totalRounds}
                            color="#818cf8"
                        />
                        <StatCard
                            icon={<Trophy size={18} />}
                            label="อัตราชนะ"
                            value={`${winRate}%`}
                            color="#22c55e"
                        />
                        <StatCard
                            icon={<span>💰</span>}
                            label="ชนะสูงสุด"
                            value={formatChips(stats.maxChipsWon)}
                            color="#fbbf24"
                        />
                        <StatCard
                            icon={<Flame size={18} />}
                            label="สตรีคดีสุด"
                            value={`${stats.bestStreak}🔥`}
                            color="#f97316"
                        />
                    </div>
                </div>

                {/* Donut + Legend */}
                <div className="flex items-center gap-5">
                    <DonutChart wins={stats.wins} losses={stats.losses} draws={stats.draws} />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-gray-300 text-xs flex-1">ชนะ</span>
                            <span className="text-white text-sm font-bold">{stats.wins}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-gray-300 text-xs flex-1">แพ้</span>
                            <span className="text-white text-sm font-bold">{stats.losses}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-500" />
                            <span className="text-gray-300 text-xs flex-1">เสมอ</span>
                            <span className="text-white text-sm font-bold">{stats.draws}</span>
                        </div>
                        <hr className="border-white/5" />
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-[10px]">ป๊อก</span>
                            <span className="text-yellow-300 text-sm font-bold">{stats.pokCount} ครั้ง</span>
                        </div>
                    </div>
                </div>

                {/* Chip History Chart */}
                <ChipHistoryChart data={stats.chipHistory} />
            </motion.div>
        </div>
    );
}
