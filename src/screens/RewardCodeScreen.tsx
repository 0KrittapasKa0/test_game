import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Calendar, Calculator, Timer, AlertCircle, Zap, Check } from 'lucide-react';
import { ChipIcon } from '../components/ChipIcon';
import { DailyRewardIcon } from '../components/DailyRewardIcon';
import { useGameStore } from '../store/useGameStore';
import { VALID_REWARD_CODES } from '../types/game';
import { formatChips } from '../utils/formatChips';
import { loadUsedCodes, saveUsedCode, loadDailyState, claimDailyReward, type DailyRewardState, loadMathGameState, saveMathGameState } from '../utils/storage';
import { SFX } from '../utils/sound';

type ActivityTab = 'daily' | 'math' | 'code';

export default function RewardCodeScreen() {
    const { setScreen, addChips } = useGameStore();
    const [activeTab, setActiveTab] = useState<ActivityTab>('daily');

    // Sidebar items
    const menuItems = [
        { id: 'daily', label: 'เช็คชื่อรายวัน', icon: <Calendar size={20} /> },
        { id: 'math', label: 'คณิตคิดไว', icon: <Calculator size={20} /> },
        { id: 'code', label: 'กรอกโค้ด', icon: <Gift size={20} /> },
    ] as const;

    return (
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10" />

            {/* Content Container matches GameSetupScreen & Profile layout */}
            <motion.div
                className="w-full max-w-5xl h-[95vh] md:h-[85vh] flex flex-col relative z-20 my-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl p-4 sm:p-6 backdrop-blur-xl relative overflow-hidden flex flex-col h-full">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Header with Back Button (Absolute for space saving like Profile/Settings) */}
                    <button
                        onClick={() => setScreen('MENU')}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg absolute top-4 sm:top-5 left-4 sm:left-6 z-30"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="mt-2 mb-6 sm:mt-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-gold-gradient text-center tracking-widest drop-shadow-md uppercase mb-1">
                            กิจกรรม
                        </h2>
                        {/* Centered Decorative Subtitle */}
                        <div className="text-center flex items-center justify-center gap-2">
                            <span className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Reward Center</span>
                        </div>
                    </div>

                    {/* Main 2-Column Layout */}
                    <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden">

                        {/* LEFT: Sidebar / Menu Tabs */}
                        <div className="w-full md:w-1/4 md:min-w-[220px] bg-black/30 border border-white/5 rounded-2xl p-2 md:p-4 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto no-scrollbar shadow-inner relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-2xl" />

                            {menuItems.map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); SFX.click(); }}
                                        className={`flex items-center gap-2 md:gap-3 px-3 py-3 md:py-4 rounded-xl text-[11px] sm:text-xs md:text-sm font-bold transition-all text-left whitespace-nowrap md:whitespace-normal flex-1 md:flex-none justify-center md:justify-start relative overflow-hidden group tracking-wider z-10
                                            ${isActive
                                                ? 'bg-gradient-to-r from-yellow-600/30 to-amber-600/10 text-yellow-400 border border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                                                : 'text-white/50 hover:bg-white/5 border border-transparent hover:text-white'
                                            }`}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                        )}
                                        <span className={`${isActive ? 'text-yellow-400 drop-shadow-md' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>
                                            {item.icon}
                                        </span>
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* RIGHT: Content Area */}
                        <div className="flex-1 bg-black/20 p-2 sm:p-4 overflow-y-auto relative rounded-2xl border border-white/5 shadow-inner flex flex-col">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="w-full h-full flex flex-col relative"
                                >
                                    {activeTab === 'daily' && <DailyLoginView addChips={addChips} />}
                                    {activeTab === 'math' && <MathGameView addChips={addChips} />}
                                    {activeTab === 'code' && <RedeemCodeView addChips={addChips} />}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ── Daily Login View ──
function DailyLoginView({ addChips }: { addChips: (amount: number) => void }) {
    const [state, setState] = useState<DailyRewardState | null>(null);
    const [todayClaimed, setTodayClaimed] = useState(false);

    const refreshState = () => {
        const s = loadDailyState();
        setState(s);
        setTodayClaimed(s.lastClaimDate === new Date().toISOString().split('T')[0]);
    };

    useEffect(() => {
        refreshState();
    }, []);

    const handleClaim = () => {
        const result = claimDailyReward();
        if (result.success) {
            addChips(result.reward);
            SFX.win();
            refreshState(); // Update UI
        }
    };

    if (!state) return null;

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-1 md:px-4 py-2">

            <div className="flex items-center gap-3 mb-6 shrink-0">
                <Calendar className="text-yellow-500" size={24} />
                <h3 className="text-sm sm:text-base font-semibold text-white/80 uppercase tracking-widest">
                    เช็คชื่อรับชิปฟรี
                </h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
            </div>

            {/* Grid Layout inside scrollable if needed */}
            <div className="flex-1 w-full flex flex-col items-center overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl mb-4">
                    {state.rewards.map((reward, idx) => {
                        let status: 'claimed' | 'active' | 'locked' = 'locked';
                        if (idx < state.currentDay) {
                            status = 'claimed';
                        } else if (idx === state.currentDay) {
                            status = todayClaimed ? 'locked' : 'active';
                        }

                        const isDay7 = idx === 6;

                        // Base styles Premium Flat
                        let bgClass = "bg-black/30";
                        let borderClass = "border-white/5";
                        let textDayClass = "text-white/40";
                        let textRewardClass = "text-white/50";
                        let iconOpacity = "opacity-60 grayscale";

                        // Active State
                        if (status === 'active') {
                            bgClass = "bg-black/60";
                            borderClass = "border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.1)]";
                            textDayClass = "text-yellow-500/80";
                            textRewardClass = "text-yellow-400";
                            iconOpacity = "opacity-100 grayscale-0";
                        }

                        // Claimed State
                        if (status === 'claimed') {
                            iconOpacity = "opacity-20 grayscale";
                            textRewardClass = "text-white/20";
                            borderClass = "border-transparent";
                            bgClass = "bg-black/20";
                        }

                        return (
                            <div
                                key={idx}
                                className={`relative rounded-2xl flex flex-col items-center justify-center pt-4 pb-5 px-1 sm:pt-5 sm:pb-6 transition-all duration-300 border
                                    ${isDay7 ? 'col-span-2 sm:col-span-4 lg:col-span-2' : 'col-span-1 sm:col-span-2 lg:col-span-1'}
                                    ${bgClass} ${borderClass}
                                `}
                            >
                                <span className={`text-[10px] sm:text-xs tracking-widest font-bold mb-3 uppercase ${textDayClass}`}>
                                    วันที่ {idx + 1}
                                </span>

                                <div className={`mb-3 flex items-center justify-center ${iconOpacity} transition-all`}>
                                    {/* USES ORIGINAL DAILY REWARD ICON COMPONENT */}
                                    <DailyRewardIcon dayIndex={idx} size={isDay7 ? 50 : 38} isActive={status === 'active'} />
                                </div>

                                <span className={`text-[11px] sm:text-sm md:text-md font-bold tracking-wider ${textRewardClass}`}>
                                    {formatChips(reward)}
                                </span>

                                {status === 'claimed' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl backdrop-blur-[1px]">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-500 font-bold text-lg">
                                            <Check size={18} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-auto pt-6 w-full flex flex-col items-center shrink-0">
                    <motion.button
                        whileTap={!todayClaimed ? { scale: 0.96 } : undefined}
                        onClick={handleClaim}
                        disabled={todayClaimed}
                        className={`w-[200px] md:w-[240px] py-3.5 rounded-2xl font-bold text-sm md:text-md tracking-wider transition-all disabled:opacity-50 border
                            ${todayClaimed
                                ? 'bg-black/50 text-white/40 cursor-not-allowed border-white/5'
                                : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-[0_4px_15px_rgba(245,158,11,0.2)] cursor-pointer border-yellow-400 hover:brightness-110'
                            }`}
                    >
                        {todayClaimed ? 'รับแล้ว' : 'กดรับรางวัล'}
                    </motion.button>
                    <p className="text-white/30 text-[9px] sm:text-[10px] tracking-widest uppercase font-semibold mt-3">
                        {todayClaimed ? "กลับมาใหม่พรุ่งนี้" : "รับชิปฟรีทุกวัน รีสตาร์ตเมื่อขาดการเข้าระบบ"}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Math Game View ──
function MathGameView({ addChips }: { addChips: (amount: number) => void }) {
    const [mathQuestion, setMathQuestion] = useState<{ a: number; b: number; op: '+' | '-' } | null>(null);
    const [mathAnswer, setMathAnswer] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
    const [winStreak, setWinStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(25);
    const [isActive, setIsActive] = useState(false);
    const [nextFreePlay, setNextFreePlay] = useState<number>(0);
    const [cooldownString, setCooldownString] = useState('');

    useEffect(() => {
        const state = loadMathGameState();
        setNextFreePlay(state.nextFreePlayTime);
    }, []);

    useEffect(() => {
        if (isActive) return;

        const checkCooldown = () => {
            const now = Date.now();
            if (nextFreePlay > now) {
                const diff = Math.ceil((nextFreePlay - now) / 1000);
                const m = Math.floor(diff / 60);
                const s = diff % 60;
                setCooldownString(`${m}:${s.toString().padStart(2, '0')}`);
            } else {
                setCooldownString('');
            }
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, [nextFreePlay, isActive]);

    const startGame = () => {
        SFX.click();
        setWinStreak(0);
        setIsActive(true);
        generateQuestion();
    };

    const generateQuestion = () => {
        const op = Math.random() > 0.5 ? '+' : '-';
        let a = Math.floor(Math.random() * 99) + 1;
        let b = Math.floor(Math.random() * 99) + 1;
        if (op === '-' && a < b) [a, b] = [b, a];
        setMathQuestion({ a, b, op });
        setMathAnswer('');
        setMessage('');
        setMessageType('');
        setTimeLeft(25);
    };

    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleGameOver('หมดเวลา!');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    const handleGameOver = (msg: string) => {
        SFX.error();
        setMessage(msg);
        setMessageType('error');
        setIsActive(false);
        setMathQuestion(null);

        const cooldown = Date.now() + 3 * 60 * 1000;
        setNextFreePlay(cooldown);
        saveMathGameState({ nextFreePlayTime: cooldown });
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!mathQuestion || !mathAnswer) return;
        const correct = mathQuestion.op === '+' ? mathQuestion.a + mathQuestion.b : mathQuestion.a - mathQuestion.b;

        if (parseInt(mathAnswer) === correct) {
            SFX.win();
            const reward = 2000 + (winStreak * 500);
            addChips(reward);
            setMessage(`ถูกต้อง! +${formatChips(reward)}`);
            setMessageType('success');
            setWinStreak(p => p + 1);
            setTimeout(generateQuestion, 1000);
        } else {
            handleGameOver('ตอบผิด! จบเกม');
        }
    };

    if (!isActive && cooldownString) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto p-4">
                <div className="mb-6 relative opacity-50">
                    <Timer size={64} className="text-white/50" />
                </div>
                <h3 className="text-xl font-bold text-white/50 mb-1 tracking-widest uppercase">พักสมอง</h3>
                <p className="text-white/30 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-6">เล่นใหม่ได้ในอีก</p>
                <div className="text-4xl md:text-5xl font-mono font-bold text-yellow-500/50 mb-8 tracking-widest">
                    {cooldownString}
                </div>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto p-4">
                <div className="mb-6 bg-black/40 p-5 rounded-full border border-yellow-500/20 shadow-inner relative">
                    <Calculator size={48} className="text-yellow-400 opacity-80" />
                    <Zap size={20} className="absolute top-1 right-1 text-yellow-500/80 drop-shadow-md" />
                </div>
                <h3 className="text-xl font-bold text-white/80 mb-2 tracking-wider">คณิตคิดไว</h3>
                <p className="text-white/40 text-[10px] sm:text-xs mb-8 max-w-[240px] mx-auto leading-relaxed">
                    ตอบโจทย์คณิตศาสตร์ให้ถูก<br />ฟรี 1 ครั้งทุกๆ 3 นาที
                </p>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="w-[200px] py-3.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-2xl text-black font-bold text-sm tracking-widest shadow-[0_4px_15px_rgba(245,158,11,0.2)] hover:brightness-110 border border-yellow-400 transition-all cursor-pointer"
                >
                    เริ่มทดสอบ
                </motion.button>
                {message && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-red-400 font-bold bg-red-950/40 px-6 py-2 rounded-xl border border-red-500/20 text-xs">
                        {message}
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center justify-center relative w-full max-w-md mx-auto p-2">
            <div className="w-full flex justify-between items-center mb-5 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs tracking-widest uppercase">
                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
                        <Zap size={12} className="text-yellow-400" />
                    </div>
                    <span>Streak: {winStreak}</span>
                </div>
                <div className={`flex items-center gap-1.5 font-bold tracking-wider text-sm ${timeLeft <= 5 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'text-white/80'}`}>
                    <Timer size={16} />
                    <span>{timeLeft}s</span>
                </div>
            </div>

            <div className="w-full h-1.5 bg-black/60 rounded-full mb-6 overflow-hidden border border-white/5">
                <motion.div
                    className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-500 to-amber-400'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 25) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                />
            </div>

            <div className="w-full bg-black/50 rounded-2xl p-6 sm:p-8 text-center border border-yellow-500/20 shadow-inner mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                {mathQuestion && (
                    <div className="text-4xl md:text-5xl font-black text-white/90 tracking-widest flex items-center justify-center gap-3 sm:gap-6 font-mono">
                        <span className="drop-shadow-sm">{mathQuestion.a}</span>
                        <span className="text-yellow-500/80 drop-shadow-sm">{mathQuestion.op}</span>
                        <span className="drop-shadow-sm">{mathQuestion.b}</span>
                        <span className="text-white/20">=</span>
                        <span className="text-yellow-400 text-4xl animate-pulse">?</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 w-full mb-4">
                <input
                    type="number"
                    value={mathAnswer}
                    onChange={(e) => { setMathAnswer(e.target.value); setMessage(''); }}
                    placeholder="เลข..."
                    autoFocus
                    className="flex-1 text-center text-xl font-mono font-bold p-3 rounded-xl bg-black/60 border border-white/10 focus:border-yellow-500/50 outline-none text-white appearance-none shadow-inner transition-colors"
                />
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!mathAnswer}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-3 text-sm font-bold tracking-widest rounded-xl shadow-[0_4px_15px_rgba(234,179,8,0.2)] disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400"
                >
                    ส่ง
                </motion.button>
            </form>

            <div className="h-10 mt-2">
                <AnimatePresence mode='wait'>
                    {message && (
                        <motion.div
                            key={message}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`text-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 border w-max mx-auto
                                ${messageType === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}
                        >
                            {messageType === 'success' ? <ChipIcon className="w-4 h-4 mx-0.5 inline-block" /> : <AlertCircle size={16} />} {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Redeem Code View ──
function RedeemCodeView({ addChips }: { addChips: (amount: number) => void }) {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

    const handleRedeem = () => {
        const trimmed = code.trim();
        if (!trimmed) return;
        const usedCodes = loadUsedCodes();
        if (usedCodes.includes(trimmed)) {
            SFX.error();
            setMessage('โค้ดนี้ถูกใช้งานไปแล้ว');
            setMessageType('error');
            return;
        }
        const reward = VALID_REWARD_CODES.find(r => r.code === trimmed);
        if (!reward) {
            SFX.error();
            setMessage('โค้ดไม่ถูกต้อง');
            setMessageType('error');
            return;
        }

        SFX.win();
        saveUsedCode(trimmed);
        addChips(reward.chips);
        setMessage(`สำเร็จ! ได้รับ ${formatChips(reward.chips)}`);
        setMessageType('success');
        setCode('');
    };

    return (
        <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto w-full p-2">
            <div className="mb-6 bg-black/40 p-5 rounded-full border border-yellow-500/20 shadow-inner relative">
                <Gift size={40} className="text-yellow-400/80 drop-shadow-md" />
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-white/80 mb-2 tracking-wider">แลกโค้ด</h3>
            <p className="text-white/40 text-[10px] sm:text-xs mb-8 max-w-[240px] mx-auto tracking-wide">
                นำโค้ดกิจกรรมมาใส่เพื่อรับชิปฟรี
            </p>

            <div className="w-full space-y-4 px-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setMessage(''); }}
                    placeholder="CODE..."
                    className="w-full text-center text-lg md:text-xl font-mono font-bold p-3.5 rounded-xl bg-black/60 border border-white/10 focus:border-yellow-500/50 outline-none text-yellow-400 tracking-[0.2em] placeholder-white/20 shadow-inner transition-colors"
                />
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleRedeem}
                    disabled={!code}
                    className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl text-black font-bold text-sm tracking-widest shadow-[0_4px_15px_rgba(245,158,11,0.2)] disabled:opacity-30 disabled:grayscale hover:brightness-110 border border-yellow-400 transition-all cursor-pointer"
                >
                    รับรางวัล
                </motion.button>
            </div>

            <div className="h-10 mt-6">
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold shadow-md flex items-center justify-center gap-2 w-max mx-auto border
                                ${messageType === 'success' ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-red-950/40 border-red-500/30 text-red-400'}`}
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
