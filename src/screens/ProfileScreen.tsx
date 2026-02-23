import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPen, Trophy, Flame, Sparkles, TrendingUp, Check } from 'lucide-react';
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
            <div className="flex items-center justify-center w-28 h-28 rounded-full border-4 border-white/5 bg-black/40">
                <span className="text-white/30 text-[10px] tracking-widest uppercase">ไม่มีข้อมูล</span>
            </div>
        );
    }

    const radius = 45;
    const cx = 55;
    const cy = 55;
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
            <svg width="110" height="110" viewBox="0 0 110 110">
                <circle cx={cx} cy={cy} r={radius} fill="none" strokeWidth="12" stroke="rgba(255,255,255,0.05)" />
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="12"
                    stroke="#4b5563"
                    strokeDasharray={`${drawLen} ${circumference - drawLen}`}
                    strokeDashoffset={drawOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                />
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="12"
                    stroke="#ef4444"
                    strokeDasharray={`${loseLen} ${circumference - loseLen}`}
                    strokeDashoffset={loseOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                />
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none" strokeWidth="12"
                    stroke="#facc15"
                    strokeDasharray={`${winLen} ${circumference - winLen}`}
                    strokeDashoffset={winOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-xl font-bold">{Math.round(winPct * 100)}%</span>
                <span className="text-white/40 text-[9px] uppercase tracking-widest font-semibold">ชนะ</span>
            </div>
        </div>
    );
}

/* ─── Line Chart (SVG) ─── */
function ChipHistoryChart({ data }: { data: number[] }) {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-28 rounded-2xl bg-black/40 border border-white/5 mt-4">
                <span className="text-white/30 text-xs text-center px-4 tracking-wider">เล่นอีกสักหน่อยเพื่อดูกราฟ...</span>
            </div>
        );
    }

    const width = 300;
    const height = 90;
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
        <div className="relative rounded-2xl bg-black/40 border border-white/5 p-4 shadow-inner mt-4 overflow-hidden h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3 relative z-10 mx-1">
                <span className="text-white/60 text-xs flex items-center gap-1.5 font-semibold tracking-wider uppercase">
                    <TrendingUp size={14} className={trend ? 'text-yellow-400' : 'text-red-400'} />
                    ประวัติชิป (30 รอบล่าสุด)
                </span>
                <span className={`text-sm font-bold tracking-wider ${trend ? 'text-yellow-400' : 'text-red-400'}`}>
                    {formatChips(data[data.length - 1])}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full relative z-10 flex-1" style={{ height: '80px', minHeight: '80px' }}>
                <defs>
                    <linearGradient id="chipGradGold" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#facc15" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="chipGradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill={trend ? "url(#chipGradGold)" : "url(#chipGradRed)"} />
                <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={strokeColor} />
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
        <div className="p-3.5 rounded-2xl bg-black/40 flex flex-col items-center justify-center gap-1.5 shadow-inner border border-white/5 transition-colors hover:bg-black/50">
            <div className="text-xl mb-1" style={{ color }}>{icon}</div>
            <span className="text-white text-lg font-bold tracking-wider leading-none">{value}</span>
            <span className="text-white/40 text-[9px] uppercase font-semibold tracking-widest text-center">{label}</span>
        </div>
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
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto overflow-x-hidden relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />

            {/* Header matches GameSetup & Settings styles */}
            <div className="w-full max-w-4xl relative z-20 flex justify-between items-center mb-6 mt-2 shrink-0">
                <button
                    onClick={() => setScreen('MENU')}
                    className="flex items-center justify-center w-11 h-11 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 hover:border-white/20 transition-all cursor-pointer shadow-lg backdrop-blur-md"
                >
                    <ArrowLeft size={22} className="drop-shadow-sm" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl sm:text-3xl font-black text-gold-gradient tracking-widest uppercase shadow-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        ข้อมูลผู้เล่น
                    </h2>
                    <span className="text-yellow-500/60 text-[10px] tracking-widest font-bold uppercase mt-1">Player Profile</span>
                </div>
                <div className="w-11 h-11" /> {/* Spacer */}
            </div>

            {/* Content Container matches GameSetupScreen width (max-w-4xl for 2 columns) */}
            <motion.div
                className="w-full max-w-4xl relative z-20 mb-8 flex-1 flex flex-col"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-5 sm:p-8 backdrop-blur-xl relative overflow-hidden flex flex-col w-full">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* HEADER SECTION (Avatar, Name, Chips) */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 bg-black/30 p-5 sm:p-6 rounded-2xl border border-white/5 shadow-inner relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-2xl" />

                        {/* Chips in Top Right */}
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-yellow-500/20 shadow-inner">
                                <ChipIcon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" />
                                <span className="text-yellow-400 font-bold tracking-wider text-sm sm:text-lg">{formatChips(profile.chips)}</span>
                            </div>
                        </div>

                        {/* Avatar */}
                        <div className="relative group/avatar cursor-pointer shrink-0 z-10" onClick={handleAvatarClick}>
                            <div
                                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-4xl font-bold text-black overflow-hidden border border-white/10 group-active/avatar:scale-95 transition-transform shadow-lg"
                                style={{
                                    background: profile.avatarUrl ? 'transparent' : 'linear-gradient(135deg, rgba(250,204,21,0.8), rgba(217,119,6,0.8))'
                                }}
                            >
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-black/80 drop-shadow-sm">
                                        {(name.trim() || profile.name).charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center border border-white/20 text-white/70 hover:text-yellow-400 transition-colors shadow-md">
                                <UserPen size={14} />
                            </div>
                        </div>

                        {/* Display Name */}
                        <div className="flex flex-col flex-1 z-10 w-full sm:w-auto mt-2 sm:mt-2 sm:pr-32 justify-center h-full">
                            <div className="flex flex-col items-center sm:items-start w-full">
                                <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-1">Display Name</p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start w-full sm:max-w-[240px] relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        maxLength={20}
                                        className="text-lg sm:text-xl font-bold bg-black/50 border border-white/10 px-4 py-2.5 rounded-xl text-white text-center sm:text-left focus:border-yellow-500/50 outline-none transition-all w-full placeholder-white/20 shadow-inner"
                                    />
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleSaveName}
                                        disabled={name.trim() === profile.name || name.trim().length === 0}
                                        className="absolute right-0 top-0 bottom-0 h-full px-3.5 rounded-r-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer border-l border-white/10 disabled:opacity-0"
                                    >
                                        <Check size={18} />
                                    </motion.button>
                                </div>
                                <div className="h-4 mt-1">
                                    <AnimatePresence>
                                        {saved && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-green-400 text-xs font-semibold tracking-wide"
                                            >
                                                บันทึกสำเร็จ ✓
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STATISTICS SECTION */}
                    <div className="bg-black/20 p-5 sm:p-6 rounded-2xl border border-white/5 shadow-inner flex flex-col w-full flex-1">
                        <h3 className="text-white/50 font-semibold text-xs uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                            <Sparkles size={14} className="text-yellow-500/70" />
                            สถิติการเล่น
                            <span className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                        </h3>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0">
                            <StatCard
                                icon={<span className="text-xl">🎮</span>}
                                label="เล่นทั้งหมด"
                                value={stats.totalRounds}
                                color="#94a3b8"
                            />
                            <StatCard
                                icon={<Trophy size={20} />}
                                label="อัตราชนะ"
                                value={`${winRate}%`}
                                color="#facc15"
                            />
                            <StatCard
                                icon={<span className="text-xl">💰</span>}
                                label="ชนะสูงสุด"
                                value={formatChips(stats.maxChipsWon)}
                                color="#facc15"
                            />
                            <StatCard
                                icon={<Flame size={20} />}
                                label="สตรีคดีสุด"
                                value={`${stats.bestStreak}🔥`}
                                color="#f97316"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5 mb-2 shrink-0">
                            {/* Donut Chart Data */}
                            <div className="flex flex-row items-center justify-between gap-4 bg-black/40 p-4 sm:px-6 sm:py-5 rounded-2xl border border-white/5 shadow-inner flex-1">
                                <div className="shrink-0 scale-90 sm:scale-100 origin-left">
                                    <DonutChart wins={stats.wins} losses={stats.losses} draws={stats.draws} />
                                </div>
                                <div className="flex flex-col justify-center flex-1 space-y-3 pl-4 border-l border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                                        <span className="text-white/50 text-[10px] tracking-wider font-semibold uppercase flex-1">ชนะ</span>
                                        <span className="text-white text-xs font-bold">{stats.wins}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        <span className="text-white/50 text-[10px] tracking-wider font-semibold uppercase flex-1">แพ้</span>
                                        <span className="text-white text-xs font-bold">{stats.losses}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                                        <span className="text-white/50 text-[10px] tracking-wider font-semibold uppercase flex-1">เสมอ</span>
                                        <span className="text-white text-xs font-bold">{stats.draws}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-2 mt-3 mb-1 shrink-0">
                            <span className="text-white/40 text-[10px] sm:text-xs tracking-widest font-semibold uppercase">จำนวนครั้งที่ป๊อกเด้ง</span>
                            <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-md text-[10px] sm:text-xs border border-yellow-500/20 shadow-inner">{stats.pokCount} ครั้ง</span>
                        </div>

                        {/* Chip History Chart */}
                        <div className="flex-1 mt-2 h-full min-h-[140px]">
                            <ChipHistoryChart data={stats.chipHistory} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
