import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPen, Trophy, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { ChipIcon } from '../components/ChipIcon';
import { useGameStore } from '../store/useGameStore';
import { loadProfile, saveProfile, loadStats } from '../utils/storage';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';

/* ─── Donut Chart ─── */
function DonutChart({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
    const total = wins + losses + draws;
    if (total === 0) {
        return (
            <div className="flex items-center justify-center w-32 h-32 rounded-full border-4 border-white/5 shadow-inner bg-black/40">
                <span className="text-white/30 text-xs">ยังไม่มีข้อมูล</span>
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
                {/* Glow Filters */}
                <defs>
                    <filter id="glow-win" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-lose" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                {/* Background track */}
                <circle cx={cx} cy={cy} r={radius} fill="none" strokeWidth="16" stroke="rgba(0,0,0,0.5)" />
                {/* Draw arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#4b5563"
                    strokeDasharray={`${drawLen} ${circumference - drawLen}`}
                    strokeDashoffset={drawOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                />
                {/* Lose arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#ef4444"
                    strokeDasharray={`${loseLen} ${circumference - loseLen}`}
                    strokeDashoffset={loseOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    filter="url(#glow-lose)"
                />
                {/* Win arc */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="16"
                    stroke="#facc15"
                    strokeDasharray={`${winLen} ${circumference - winLen}`}
                    strokeDashoffset={winOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    strokeLinecap="round"
                    filter="url(#glow-win)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-yellow-400 text-2xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{Math.round(winPct * 100)}%</span>
                <span className="text-white/50 text-[10px] uppercase tracking-widest mt-0.5 font-bold">ชนะ</span>
            </div>
        </div>
    );
}

/* ─── Line Chart (SVG) ─── */
function ChipHistoryChart({ data }: { data: number[] }) {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-32 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                <span className="text-white/30 text-xs text-center px-4">เล่นอีกสักหน่อยเพื่อดูกราฟ...</span>
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

    const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${points[0].x.toFixed(1)} ${height - padding.bottom} Z`;

    const lastPoint = points[points.length - 1];
    const trend = data[data.length - 1] >= data[0];
    const strokeColor = trend ? '#facc15' : '#ef4444';

    return (
        <div className="relative rounded-2xl bg-black/40 border border-white/10 p-5 shadow-inner mt-4 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10 mx-1">
                <span className="text-yellow-500/80 text-xs flex items-center gap-1.5 font-bold tracking-wide uppercase">
                    <TrendingUp size={14} className={trend ? 'text-yellow-400' : 'text-red-400'} />
                    ประวัติชิป (30 รอบล่าสุด)
                </span>
                <span className={`text-sm font-black tracking-wider drop-shadow-md ${trend ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatChips(data[data.length - 1])}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full drop-shadow-xl relative z-10" style={{ height: '100px' }}>
                <defs>
                    <linearGradient id="chipGradGold" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#facc15" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="chipGradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill={trend ? "url(#chipGradGold)" : "url(#chipGradRed)"} />
                <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={strokeColor} className="drop-shadow-md" />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="10" fill={strokeColor} opacity="0.4" className="animate-pulse" />
            </svg>
        </div>
    );
}

/* ─── Stat Card ─── */
function StatCard({ icon, label, value, color, glowColor }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    glowColor: string;
}) {
    return (
        <motion.div
            className="p-4 rounded-2xl bg-[#0a0a0c]/80 flex flex-col items-center gap-2 shadow-xl relative overflow-hidden group/stat border border-white/5"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ y: -2, borderColor: glowColor }}
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -inset-4 opacity-0 group-hover/stat:opacity-30 transition-opacity blur-xl rounded-full" style={{ backgroundColor: glowColor }} />

            <div className="text-2xl relative z-10 drop-shadow-md" style={{ color }}>{icon}</div>
            <span className="text-white text-xl font-black tracking-wider relative z-10 drop-shadow-sm">{value}</span>
            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest relative z-10">{label}</span>
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
                const size = 150;
                canvas.width = size;
                canvas.height = size;
                if (ctx) {
                    const minSide = Math.min(img.width, img.height);
                    const sx = (img.width - minSide) / 2;
                    const sy = (img.height - minSide) / 2;
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    saveProfile({ ...profile, avatarUrl: dataUrl });
                    window.location.reload();
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
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto relative overflow-x-hidden">

            {/* Dark vignette matching SettingsScreen */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-0" />

            {/* Top Bar */}
            <div className="w-full max-w-md relative z-20 flex justify-between items-center mb-6 mt-2">
                <button
                    onClick={() => setScreen('MENU')}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-yellow-400 hover:bg-black/80 hover:border-yellow-500/30 transition-all cursor-pointer shadow-lg backdrop-blur-md"
                >
                    <ArrowLeft size={22} className="drop-shadow-sm" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-black text-gold-gradient tracking-widest uppercase shadow-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        ข้อมูลผู้เล่น
                    </h2>
                    <span className="text-yellow-500/60 text-[10px] tracking-widest font-bold uppercase mt-1">Player Profile</span>
                </div>
                <div className="w-11 h-11" />
            </div>

            <motion.div
                className="w-full max-w-md space-y-6 relative z-20 mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                {/* VIP ID Card - Premium Glassmorphism */}
                <div className="w-full relative p-[1px] rounded-[24px] mb-2 group">
                    {/* Glowing border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/60 via-amber-400/40 to-yellow-600/60 rounded-[24px] opacity-40 blur-[2px]" />

                    <div className="relative glass p-6 flex flex-col gap-4 text-left border border-white/10 shadow-2xl overflow-hidden rounded-[24px]"
                        style={{ background: 'rgba(10, 10, 12, 0.75)', backdropFilter: 'blur(16px)' }}>
                        {/* Shimmer effect inside card */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

                        <div className="flex items-center gap-5 relative z-10 w-full">
                            <div className="relative group/avatar cursor-pointer" onClick={handleAvatarClick}>
                                <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full blur-sm opacity-60 group-hover/avatar:opacity-100 transition-opacity" />
                                <div
                                    className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-black bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 shrink-0 shadow-[0_4px_20px_rgba(250,204,21,0.4)] overflow-hidden border-2 border-yellow-200 group-active/avatar:scale-95 transition-transform"
                                >
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (name.trim() || profile.name).charAt(0).toUpperCase()
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-3">
                                <div className="space-y-1 w-full">
                                    <p className="text-yellow-500/90 text-[10px] font-black tracking-[0.2em] uppercase drop-shadow-sm">VIP MEMBER</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            maxLength={20}
                                            className="flex-1 text-2xl font-black p-2 -mx-2 rounded-xl bg-transparent border border-transparent text-white focus:bg-white/5 focus:border-yellow-500/50 outline-none transition-all w-full truncate placeholder-white/20 hover:bg-white/5"
                                        />
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleSaveName}
                                            disabled={name.trim() === profile.name || name.trim().length === 0}
                                            className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 hover:text-white transition-colors cursor-pointer border border-yellow-500/30 disabled:opacity-30 disabled:cursor-not-allowed shadow-inner"
                                        >
                                            <UserPen size={18} />
                                        </motion.button>
                                    </div>
                                    <AnimatePresence>
                                        {saved && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-green-400 text-[10px] font-bold tracking-wide mt-1"
                                            >
                                                บันทึกสำเร็จ ✓
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="inline-flex items-center gap-2 bg-black/40 px-3.5 py-1.5 rounded-full border border-yellow-500/20 shadow-inner w-fit">
                                    <ChipIcon className="w-5 h-5 mx-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                                    <span className="text-yellow-400 text-lg font-black tracking-wider drop-shadow-md">{formatChips(profile.chips)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: สถิติ ด้วยสไตล์ Glass */}
                <div className="relative rounded-[24px] p-[1px] w-full">
                    <div className="absolute inset-0 bg-white/5 rounded-[24px] border border-white/10" />
                    <div className="relative glass p-5 rounded-[24px] backdrop-blur-xl shadow-2xl" style={{ background: 'rgba(10, 10, 12, 0.6)' }}>
                        <h3 className="text-white/80 font-black text-sm uppercase tracking-widest mb-5 flex items-center gap-3">
                            <Sparkles size={16} className="text-yellow-500" />
                            สถิติการเล่น
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-500/30 via-white/5 to-transparent ml-2" />
                        </h3>

                        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                            <StatCard
                                icon={<span className="text-[26px]">🎮</span>}
                                label="เล่นทั้งหมด"
                                value={stats.totalRounds}
                                color="#94a3b8"
                                glowColor="rgba(148, 163, 184, 0.4)"
                            />
                            <StatCard
                                icon={<Trophy size={26} strokeWidth={2.5} />}
                                label="อัตราชนะ"
                                value={`${winRate}%`}
                                color="#facc15"
                                glowColor="rgba(250, 204, 21, 0.5)"
                            />
                            <StatCard
                                icon={<span className="text-[26px]">💰</span>}
                                label="ชนะสูงสุด"
                                value={formatChips(stats.maxChipsWon)}
                                color="#fbbf24"
                                glowColor="rgba(251, 191, 36, 0.4)"
                            />
                            <StatCard
                                icon={<Flame size={26} strokeWidth={2.5} />}
                                label="สตรีคดีสุด"
                                value={`${stats.bestStreak}🔥`}
                                color="#f97316"
                                glowColor="rgba(249, 115, 22, 0.5)"
                            />
                        </div>

                        {/* Donut + Legend */}
                        <div className="flex items-center gap-6 bg-[#0a0a0c]/60 p-5 rounded-2xl border border-white/5 mx-auto shadow-inner">
                            <DonutChart wins={stats.wins} losses={stats.losses} draws={stats.draws} />
                            <div className="flex-1 space-y-3.5 pl-4 border-l border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                                    <span className="text-white/60 text-xs flex-1 uppercase tracking-wider font-bold">ชนะ</span>
                                    <span className="text-yellow-400 text-sm font-black drop-shadow-sm">{stats.wins}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                    <span className="text-white/60 text-xs flex-1 uppercase tracking-wider font-bold">แพ้</span>
                                    <span className="text-red-400 text-sm font-black drop-shadow-sm">{stats.losses}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-gray-500 border border-white/20" />
                                    <span className="text-white/60 text-xs flex-1 uppercase tracking-wider font-bold">เสมอ</span>
                                    <span className="text-white/90 text-sm font-bold">{stats.draws}</span>
                                </div>
                                <hr className="border-white/5 border-dashed my-2" />
                                <div className="flex items-center justify-between">
                                    <span className="text-white/40 text-[10px] tracking-widest font-black uppercase">ป๊อกเด้ง</span>
                                    <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded text-xs border border-yellow-500/20">{stats.pokCount} ครั้ง</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chip History Chart */}
                <div className="w-full relative">
                    <ChipHistoryChart data={stats.chipHistory} />
                </div>
            </motion.div>
        </div>
    );
}
