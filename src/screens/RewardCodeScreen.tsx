import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Calendar, Calculator, Timer, AlertCircle, Zap } from 'lucide-react';
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
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

            <div className="w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col relative z-10">
                {/* Back Button */}
                <button
                    onClick={() => setScreen('MENU')}
                    className="absolute -top-10 md:-top-12 left-0 w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition cursor-pointer shadow-lg flex items-center justify-center z-20"
                >
                    <ArrowLeft size={20} />
                </button>

                {/* Main Layout */}
                <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden mt-4 md:mt-0">
                    {/* Sidebar / Top Bar */}
                    <div className="w-full md:w-1/4 md:min-w-[240px] bg-black/60 border border-white/5 rounded-3xl p-3 md:p-5 flex flex-row md:flex-col gap-3 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md shadow-2xl">
                        <div className="hidden md:block mb-4 px-2 text-center mt-2">
                            <h2 className="text-2xl font-black text-gold-gradient tracking-widest drop-shadow-md">
                                กิจกรรม
                            </h2>
                            <p className="text-[10px] text-yellow-500/60 uppercase font-bold tracking-widest mt-1">Reward Center</p>
                        </div>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); SFX.click(); }}
                                className={`flex items-center gap-2 md:gap-4 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left whitespace-nowrap md:whitespace-normal flex-1 md:flex-none justify-center md:justify-start relative overflow-hidden group tracking-wide
                                    ${activeTab === item.id
                                        ? 'bg-gradient-to-r from-yellow-600/30 to-amber-600/10 text-yellow-400 border border-yellow-500/40 shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                                        : 'text-white/50 hover:bg-white/5 border border-transparent hover:text-white'
                                    }`}
                            >
                                {activeTab === item.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                )}
                                <span className={`${activeTab === item.id ? 'text-yellow-400 drop-shadow-md' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-black/60 p-4 md:p-8 overflow-y-auto relative rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="w-full h-full flex flex-col"
                            >
                                {activeTab === 'daily' && <DailyLoginView addChips={addChips} />}
                                {activeTab === 'math' && <MathGameView addChips={addChips} />}
                                {activeTab === 'code' && <RedeemCodeView addChips={addChips} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
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
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-2 md:px-6 mt-4 pb-20">

            {/* Dark Header Bar */}
            <div className="flex items-center bg-[#0a0a0c] rounded-xl p-4 md:p-5 mb-8 border border-white/5 shadow-lg">
                <Calendar className="text-yellow-500 mr-3" size={28} />
                <h3 className="text-xl md:text-2xl font-black text-white tracking-wide">
                    เช็คชื่อรายวัน
                </h3>
            </div>

            {/* Grid Layout */}
            <div className="flex-1 w-full flex flex-col items-center">
                <div className="grid grid-cols-4 gap-4 md:gap-6 w-full max-w-3xl">
                    {state.rewards.map((reward, idx) => {
                        let status: 'claimed' | 'active' | 'locked' = 'locked';
                        if (idx < state.currentDay) {
                            status = 'claimed';
                        } else if (idx === state.currentDay) {
                            status = todayClaimed ? 'locked' : 'active';
                        }

                        const isDay7 = idx === 6;

                        // Base styles (locked or inactive futures)
                        let bgClass = "bg-[#14161a]";
                        let borderClass = "border-transparent";
                        let textDayClass = "text-white/40";
                        let textRewardClass = "text-white/50";
                        let iconOpacity = "opacity-60";

                        // Day 7 specific dark theme (brownish)
                        if (isDay7 && status !== 'active') {
                            bgClass = "bg-[#281c15]"; // matching the image's dark brown
                        }

                        // Active State
                        if (status === 'active') {
                            bgClass = "bg-[#181a1f]";
                            borderClass = "border-yellow-500";
                            textDayClass = "text-white/60";
                            textRewardClass = "text-yellow-400";
                            iconOpacity = "opacity-100";

                            // Keep Day 7 brown base but active
                            if (isDay7) {
                                bgClass = "bg-[#332218]";
                            }
                        }

                        // Claimed State
                        if (status === 'claimed') {
                            iconOpacity = "opacity-30";
                            textRewardClass = "text-white/20";
                            borderClass = "border-white/5";
                        }

                        return (
                            <div
                                key={idx}
                                className={`relative rounded-2xl flex flex-col items-center justify-center pt-6 pb-8 px-2 transition-all duration-300 border
                                    ${isDay7 ? 'col-span-2' : 'col-span-1'}
                                    ${bgClass} ${borderClass}
                                `}
                            >
                                <span className={`text-sm md:text-md font-medium mb-4 ${textDayClass}`}>
                                    วันที่ {idx + 1}
                                </span>

                                <div className={`mb-4 flex items-center justify-center ${iconOpacity} transition-opacity`}>
                                    <DailyRewardIcon dayIndex={idx} size={isDay7 ? 56 : 44} isActive={status === 'active'} />
                                </div>

                                <span className={`text-lg md:text-xl font-black tracking-wider ${textRewardClass}`}>
                                    {formatChips(reward)}
                                </span>

                                {status === 'claimed' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-[1px]">
                                        <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-green-500 font-black text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                            ✓
                                        </div>
                                    </div>
                                )}

                                {status === 'active' && !todayClaimed && (
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-yellow-500 text-black font-bold text-sm rounded-full shadow-lg whitespace-nowrap">
                                        รับเลย
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Claim Button section */}
                <div className="mt-16 w-full flex flex-col items-center">
                    <motion.button
                        whileTap={!todayClaimed ? { scale: 0.96 } : undefined}
                        onClick={handleClaim}
                        disabled={todayClaimed}
                        className={`w-[220px] md:w-[260px] py-4 rounded-3xl font-bold text-lg md:text-xl transition-all shadow-md
                            ${todayClaimed
                                ? 'bg-[#2a2d35] text-white/40 cursor-not-allowed'
                                : 'bg-[#f59e0b] hover:bg-[#d97706] text-black shadow-[0_4px_20px_rgba(245,158,11,0.3)] cursor-pointer'
                            }`}
                    >
                        {todayClaimed ? 'รับแล้ว' : 'กดรับรางวัล'}
                    </motion.button>

                    <p className="text-[#64748b] text-[10px] md:text-xs mt-4">
                        กลับมาใหม่พรุ่งนี้เพื่อรับรางวัลถัดไป!
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
            <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto">
                <div className="mb-6 relative">
                    <Timer size={72} className="text-white/20 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-white/50 mb-2 tracking-widest">พักสมองแป๊บนะ</h3>
                <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-8">เล่นใหม่ได้ในอีก</p>
                <div className="text-6xl font-mono font-black text-yellow-500/50 mb-10 drop-shadow-md">
                    {cooldownString}
                </div>
                <button disabled className="w-full bg-black/50 border border-white/5 py-4 rounded-xl text-white/30 font-bold tracking-widest cursor-not-allowed">
                    กำลังรีชาร์จ...
                </button>
            </div>
        );
    }

    if (!isActive) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto">
                <div className="mb-8 relative p-6 bg-black/40 rounded-full border border-yellow-500/20 shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                    <Calculator size={56} className="text-yellow-400" />
                    <Zap size={24} className="absolute top-2 right-2 text-yellow-300 animate-bounce drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" />
                </div>
                <h3 className="text-3xl font-black text-white mb-3 tracking-wider">คณิตคิดไว</h3>
                <p className="text-white/50 text-sm mb-10 max-w-[280px] mx-auto leading-relaxed">
                    ตอบโจทย์คณิตศาสตร์ให้ถูกเพื่อรับรางวัลทวีคูณ ฟรี 1 ครั้งทุกๆ 3 นาที
                </p>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-2xl text-black font-black text-xl tracking-widest shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:brightness-110 border border-yellow-300 transition-all"
                >
                    เริ่มทดสอบ
                </motion.button>
                {message && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-red-400 font-bold bg-red-950/40 px-6 py-3 rounded-xl border border-red-500/20 text-sm">
                        {message}
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center justify-center relative w-full max-w-lg mx-auto">
            <div className="w-full flex justify-between items-center mb-6 bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 text-yellow-400 font-black text-sm md:text-base tracking-widest uppercase">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40">
                        <Zap size={14} className="text-yellow-400" />
                    </div>
                    <span>Streak: {winStreak}</span>
                    <span className="text-xs text-white/30 hidden sm:inline ml-2">(+{formatChips(2000 + winStreak * 500)})</span>
                </div>
                <div className={`flex items-center gap-2 font-black tracking-wider text-lg ${timeLeft <= 5 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 'text-white'}`}>
                    <Timer size={20} />
                    <span>{timeLeft}s</span>
                </div>
            </div>

            <div className="w-full h-2 bg-black/60 rounded-full mb-8 overflow-hidden border border-white/5">
                <motion.div
                    className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-500 to-amber-400'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 25) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                />
            </div>

            <div className="w-full bg-gradient-to-br from-black/80 to-black/40 rounded-3xl p-8 md:p-12 text-center border border-yellow-500/20 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                {mathQuestion && (
                    <div className="text-5xl md:text-7xl font-black text-white tracking-widest flex items-center justify-center gap-4 md:gap-8 font-mono">
                        <span className="drop-shadow-md">{mathQuestion.a}</span>
                        <span className="text-yellow-400 drop-shadow-md">{mathQuestion.op}</span>
                        <span className="drop-shadow-md">{mathQuestion.b}</span>
                        <span className="text-white/20">=</span>
                        <span className="text-yellow-300 text-6xl md:text-8xl drop-shadow-[0_0_15px_rgba(253,224,71,0.3)] animate-pulse">?</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-3 w-full mb-6">
                <input
                    type="number"
                    value={mathAnswer}
                    onChange={(e) => { setMathAnswer(e.target.value); setMessage(''); }}
                    placeholder="คำตอบ..."
                    autoFocus
                    className="flex-1 text-center text-3xl font-mono font-black p-4 rounded-2xl bg-black/50 border-2 border-white/10 focus:border-yellow-500/50 outline-none text-white appearance-none shadow-inner transition-colors"
                />
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!mathAnswer}
                    className="bg-yellow-500 text-black px-8 py-4 text-xl font-black rounded-2xl shadow-[0_4px_15px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-300"
                >
                    ส่ง
                </motion.button>
            </form>

            <AnimatePresence mode='wait'>
                {message && (
                    <motion.div
                        key={message}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`text-center px-6 py-3 rounded-xl border-2 text-sm md:text-base font-bold shadow-2xl flex items-center justify-center gap-2
                            ${messageType === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-red-950/80 border-red-500/50 text-red-400'}`}
                    >
                        {messageType === 'success' ? <ChipIcon className="w-5 h-5 mx-1 inline-block" /> : <AlertCircle size={20} />} {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Redeem Code View ──
function RedeemCodeView({ addChips }: { addChips: (amount: number) => void }) {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

    const handleRedeem = () => {
        const trimmed = code.trim().toUpperCase();
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
        setMessage(`SUCCESS! ได้รับ ${formatChips(reward.chips)} ชิป`);
        setMessageType('success');
        setCode('');
    };

    return (
        <div className="flex flex-col h-full items-center justify-center text-center max-w-sm mx-auto">
            <div className="mb-8 relative p-6 bg-black/40 rounded-full border border-yellow-500/20 shadow-[0_0_30px_rgba(250,204,21,0.1)]">
                <Gift size={56} className="text-yellow-400 drop-shadow-md" />
                <div className="absolute top-2 right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
            </div>

            <h3 className="text-3xl font-black text-white mb-3 tracking-wider">แลกโค้ดของขวัญ</h3>
            <p className="text-white/40 text-sm mb-10 max-w-[280px] mx-auto tracking-wide">
                นำโค้ดกิจกรรมมาใส่เพื่อรับชิปฟรี
            </p>

            <div className="w-full space-y-5 px-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setMessage(''); }}
                    placeholder="ENTER CODE..."
                    className="w-full text-center text-2xl md:text-3xl font-mono font-black uppercase p-5 rounded-2xl bg-black/50 border-2 border-white/10 focus:border-yellow-500/50 outline-none text-yellow-400 tracking-[0.2em] placeholder-white/10 shadow-inner transition-colors"
                />
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleRedeem}
                    disabled={!code}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 rounded-2xl text-black font-black text-xl tracking-widest shadow-[0_10px_30px_rgba(245,158,11,0.3)] disabled:opacity-30 disabled:grayscale hover:brightness-110 border border-yellow-300 transition-all cursor-pointer"
                >
                    รับรางวัล
                </motion.button>
            </div>

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`mt-8 px-6 py-3 rounded-xl border-2 text-sm font-bold shadow-2xl flex items-center justify-center gap-2 w-full max-w-xs mx-auto
                            ${messageType === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : 'bg-red-950/80 border-red-500/50 text-red-400'}`}
                    >
                        {message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
