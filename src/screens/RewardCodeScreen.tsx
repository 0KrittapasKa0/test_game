import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gift, Calendar, Calculator, Timer, AlertCircle, Zap } from 'lucide-react';
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
        <div className="w-full h-full page-bg flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
            <div className="w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col relative">
                {/* Back Button */}
                <button
                    onClick={() => setScreen('MENU')}
                    className="absolute -top-8 md:-top-10 left-0 text-gray-400 hover:text-white transition flex items-center gap-2 text-xs md:text-sm z-20"
                >
                    <ArrowLeft size={16} />
                    กลับเมนูหลัก
                </button>

                {/* Main Layout */}
                <div className="flex flex-col md:flex-row flex-1 gap-4 overflow-hidden mt-2 md:mt-0">
                    {/* Sidebar / Top Bar */}
                    <div className="w-full md:w-1/4 md:min-w-[220px] glass p-2 md:p-4 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto no-scrollbar">
                        <div className="hidden md:block mb-4 px-2">
                            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">
                                กิจกรรม
                            </h2>
                            <p className="text-xs text-gray-500">Activity Hub</p>
                        </div>
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all text-left whitespace-nowrap md:whitespace-normal flex-1 md:flex-none justify-center md:justify-start
                                    ${activeTab === item.id
                                        ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-300 border border-yellow-500/30 shadow-lg shadow-yellow-500/5'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className={activeTab === item.id ? 'text-yellow-400' : 'text-gray-500'}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 glass p-4 md:p-6 overflow-y-auto relative bg-black/40 rounded-2xl md:rounded-3xl">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="w-full h-full"
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
        <div className="flex flex-col h-full">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2 sticky top-0 bg-black/50 backdrop-blur-sm p-2 rounded-xl z-20">
                <Calendar className="text-yellow-400" />
                เช็คชื่อรายวัน
            </h3>

            <div className="flex-1 flex flex-col items-center justify-start md:justify-center gap-4 md:gap-8 pb-4">
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl">
                    {state.rewards.map((reward, idx) => {
                        let status: 'claimed' | 'active' | 'locked' = 'locked';
                        if (idx < state.currentDay) {
                            status = 'claimed';
                        } else if (idx === state.currentDay) {
                            status = todayClaimed ? 'locked' : 'active';
                        }

                        const isBig = idx === 6;

                        return (
                            <div
                                key={idx}
                                className={`relative rounded-xl border flex flex-col items-center justify-center p-2 md:p-4 aspect-[4/5]
                                    ${isBig ? 'col-span-2 aspect-[auto] bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border-yellow-500/50' : ''}
                                    ${status === 'active'
                                        ? 'bg-yellow-500/10 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)] scale-105 z-10'
                                        : status === 'claimed'
                                            ? 'bg-green-500/10 border-green-500/30 opacity-60'
                                            : 'bg-white/5 border-white/10 opacity-50'
                                    }
                                `}
                            >
                                <span className="text-[10px] md:text-xs text-gray-400 mb-1 md:mb-2">วันที่ {idx + 1}</span>
                                {status === 'claimed' ? (
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg md:text-xl mb-1">
                                        ✓
                                    </div>
                                ) : (
                                    <div className={`text-xl md:text-2xl mb-1 ${isBig ? 'text-3xl md:text-4xl' : ''}`}>
                                        {isBig ? '🎁' : '💰'}
                                    </div>
                                )}
                                <span className={`font-bold text-sm md:text-base ${status === 'active' ? 'text-yellow-300' : 'text-white'}`}>
                                    {formatChips(reward)}
                                </span>
                                {status === 'active' && !todayClaimed && (
                                    <div className="absolute -bottom-2 md:-bottom-3 px-2 md:px-3 py-0.5 md:py-1 bg-yellow-500 text-black text-[10px] md:text-xs font-bold rounded-full animate-bounce">
                                        รับเลย
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-2 md:mt-4 w-full md:w-auto">
                    <button
                        onClick={handleClaim}
                        disabled={todayClaimed}
                        className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg
                            ${todayClaimed
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'btn-gold hover:scale-105 active:scale-95'
                            }`}
                    >
                        {todayClaimed ? 'รับแล้ววันนี้' : 'กดรับรางวัล'}
                    </button>
                    <p className="text-center text-gray-500 text-xs mt-3">
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

    // Load state
    useEffect(() => {
        const state = loadMathGameState();
        setNextFreePlay(state.nextFreePlayTime);
    }, []);

    // Cooldown Timer
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

    // Game Timer
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

        // Set cooldown: 3 minutes from now
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
            setMessage(`ถูกต้อง! +${formatChips(reward)} ชิป`);
            setMessageType('success');
            setWinStreak(p => p + 1);
            setTimeout(generateQuestion, 1000);
        } else {
            handleGameOver('ตอบผิด! จบเกม');
        }
    };

    // Render Cooldown State
    if (!isActive && cooldownString) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="mb-6 relative">
                    <Timer size={64} className="text-gray-600 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">พักสมองแป๊บนะ</h3>
                <p className="text-gray-400 mb-6">เล่นใหม่ได้ในอีก</p>
                <div className="text-4xl md:text-5xl font-mono font-bold text-yellow-400 mb-8">
                    {cooldownString}
                </div>
                <button disabled className="btn-dark px-8 py-3 opacity-50 cursor-not-allowed">
                    รอเวลา...
                </button>
            </div>
        );
    }

    // Render Start Screen
    if (!isActive) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="mb-6 relative">
                    <Calculator size={64} className="text-yellow-400" />
                    <Zap size={24} className="absolute -top-1 -right-1 text-yellow-200 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">คณิตคิดไว</h3>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto text-sm md:text-base">
                    ตอบถูกรับรางวัลทวีคูณเรื่อยๆ จนกว่าจะแพ้<br />
                    <span className="text-xs text-yellow-500/80">(สิทธิ์เล่นฟรี 1 ครั้ง ทุก 3 นาที)</span>
                </p>
                <button
                    onClick={startGame}
                    className="btn-gold px-12 py-4 text-xl font-bold rounded-2xl shadow-lg hover:scale-105 transition-transform"
                >
                    เริ่มเกม
                </button>
                {message && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-red-500 font-bold bg-red-900/20 px-4 py-2 rounded-full border border-red-500/20">
                        {message}
                    </motion.div>
                )}
            </div>
        );
    }

    // Render Active Game
    return (
        <div className="flex flex-col h-full items-center justify-center relative">
            {/* Stats Header */}
            <div className="absolute top-0 w-full flex justify-between px-2 md:px-4 py-2">
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm md:text-base">
                    <Zap size={18} />
                    <span>Streak: {winStreak}</span>
                    <span className="hidden md:inline text-xs text-gray-500">(Reward +{formatChips(2000 + winStreak * 500)})</span>
                </div>
                <div className={`flex items-center gap-2 font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    <Timer size={18} />
                    <span>{timeLeft}s</span>
                </div>
            </div>

            {/* Timer Bar */}
            <div className="w-full h-1 bg-gray-800 absolute top-10 left-0">
                <motion.div
                    className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-yellow-500'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 25) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                />
            </div>

            <div className="bg-black/40 rounded-3xl p-6 md:p-12 text-center border border-white/5 relative overflow-hidden w-full max-w-lg mb-8 shadow-inner mt-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                {mathQuestion && (
                    <div className="text-4xl md:text-7xl font-bold text-white tracking-widest flex items-center justify-center gap-2 md:gap-6 font-mono flex-wrap">
                        <span>{mathQuestion.a}</span>
                        <span className="text-yellow-400">{mathQuestion.op}</span>
                        <span>{mathQuestion.b}</span>
                        <span className="text-gray-600">=</span>
                        <span className="text-yellow-300 text-5xl md:text-8xl">?</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-lg mb-6">
                <input
                    type="number"
                    value={mathAnswer}
                    onChange={(e) => { setMathAnswer(e.target.value); setMessage(''); }}
                    placeholder="คำตอบ..."
                    autoFocus
                    className="flex-1 text-center text-2xl font-bold p-4 rounded-2xl bg-black/50 border border-white/10 focus:border-yellow-500/50 outline-none text-white appearance-none"
                    ref={(input) => { if (input) input.focus(); }}
                />
                <button
                    type="submit"
                    disabled={!mathAnswer}
                    className="btn-gold px-6 md:px-8 py-4 text-lg md:text-xl font-bold rounded-2xl whitespace-nowrap shadow-lg"
                >
                    ส่ง
                </button>
            </form>

            <AnimatePresence mode='wait'>
                {message && (
                    <motion.div
                        key={message}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-center px-4 md:px-6 py-2 rounded-full border text-sm md:text-lg font-bold shadow-lg flex items-center gap-2
                            ${messageType === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'}`}
                    >
                        {messageType === 'success' ? '🎉' : <AlertCircle size={20} />} {message}
                    </motion.div>
                )}
            </AnimatePresence>

            <p className="mt-6 text-gray-500 text-xs text-center">
                ⚠️ ตอบผิดหรือหมดเวลาจะเสีย <span className="text-red-400">Streak</span><br className="md:hidden" />
                (แต่ได้รางวัลของรอบที่ถูกแล้ว)
            </p>
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
            setMessage('โค้ดนี้ถูกใช้ไปแล้ว');
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
        setMessage(`สำเร็จ! ได้รับ ${formatChips(reward.chips)} ชิป`);
        setMessageType('success');
        setCode('');
    };

    return (
        <div className="flex flex-col h-full items-center justify-center text-center">
            <div className="mb-6 relative">
                <Gift size={64} className="text-yellow-400 mx-auto" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">กรอกโค้ดรางวัล</h3>
            <p className="text-gray-400 mb-8 text-sm md:text-base">ติดตามโค้ดใหม่ๆ ได้ที่แฟนเพจของเรา</p>

            <div className="w-full max-w-sm space-y-4 px-4">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setMessage(''); }}
                    placeholder="CODE"
                    className="w-full text-center text-xl md:text-2xl font-mono uppercase p-4 rounded-xl bg-black/30 border border-white/10 focus:border-yellow-500/50 outline-none text-white tracking-widest placeholder-white/20"
                />
                <button
                    onClick={handleRedeem}
                    disabled={!code}
                    className="btn-gold w-full py-4 text-lg font-bold rounded-xl shadow-lg hover:shadow-yellow-500/20"
                >
                    แลกรางวัล
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 px-4 py-2 rounded-lg text-sm font-medium
                        ${messageType === 'success' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}
                >
                    {message}
                </motion.div>
            )}
        </div>
    );
}
