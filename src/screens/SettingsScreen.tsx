import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings as SettingsIcon, Mic, MicOff, Check, X, Download, Upload, Save, Bug, Facebook, Coins, Cpu, Gamepad2, UserCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadSettings, saveSettings, exportGameData, importGameData } from '../utils/storage';
import { SFX, speakPhrase } from '../utils/sound';
import { GAME_VERSION } from '../version';

const ToggleSwitch = ({ enabled, onClick, activeColorClass }: { enabled: boolean; onClick: () => void; activeColorClass: string }) => (
    <div
        onClick={onClick}
        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 border shadow-inner ${enabled
            ? `${activeColorClass} border-transparent bg-opacity-80`
            : 'bg-black/60 border-white/10 hover:bg-black/40'
            }`}
    >
        <motion.div
            initial={false}
            animate={{ x: enabled ? 24 : 0 }}
            className={`w-6 h-6 bg-white rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center justify-center`}
        >
            {enabled ? <Check size={14} className="text-black/70" /> : <X size={14} className="text-black/30" />}
        </motion.div>
    </div>
);

type TabType = 'GENERAL' | 'ACCOUNT' | 'SUPPORT';

export default function SettingsScreen() {
    const setScreen = useGameStore(s => s.setScreen);
    const settings = loadSettings();

    const [activeTab, setActiveTab] = useState<TabType>('GENERAL');

    const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
    const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled ?? true);
    const [fullChipFormat, setFullChipFormat] = useState(settings.fullChipFormat ?? false);
    const [lowMemoryMode, setLowMemoryMode] = useState(settings.lowMemoryMode ?? false);

    // Account Transfer States
    const [showImport, setShowImport] = useState(false);
    const [importData, setImportData] = useState('');
    const [transferMsg, setTransferMsg] = useState('');

    const toggleSound = () => {
        const newVal = !soundEnabled;
        setSoundEnabled(newVal);
        saveSettings({ soundEnabled: newVal });
        if (newVal) SFX.click();
    };

    const toggleVoice = () => {
        const newVal = !voiceEnabled;
        setVoiceEnabled(newVal);
        saveSettings({ voiceEnabled: newVal });
        if (soundEnabled) SFX.click();
    };

    const toggleFullChipFormat = () => {
        const newVal = !fullChipFormat;
        setFullChipFormat(newVal);
        saveSettings({ fullChipFormat: newVal });
        if (soundEnabled) SFX.click();
    };

    const toggleLowMemoryMode = () => {
        const newVal = !lowMemoryMode;
        setLowMemoryMode(newVal);
        saveSettings({ lowMemoryMode: newVal });
        if (soundEnabled) SFX.click();
    };

    const handleExport = async () => {
        SFX.click();
        const data = exportGameData();
        if (data) {
            try {
                await navigator.clipboard.writeText(data);
                speakPhrase('คัดลอกรหัสข้อมูลเรียบร้อยค่ะ');
                setTransferMsg('คัดลอกสำเร็จ');
                setTimeout(() => setTransferMsg(''), 3000);
            } catch {
                setTransferMsg('ไม่สามารถคัดลอกได้อัตโนมัติ');
            }
        }
    };

    const handleImport = () => {
        SFX.click();
        if (!importData.trim()) return;

        const success = importGameData(importData);
        if (success) {
            speakPhrase('โหลดข้อมูลสำเร็จ กำลังรีสตาร์ทเกมค่ะ');
            setTransferMsg('นำเข้าสำเร็จ! กำลังโหลด...');
            setTimeout(() => {
                window.location.reload(); // Reload to apply new storage data
            }, 1500);
        } else {
            speakPhrase('ข้อมูลไม่ถูกต้องค่ะ');
            setTransferMsg('รหัสข้อมูลไม่ถูกต้อง');
            setTimeout(() => setTransferMsg(''), 3000);
        }
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'GENERAL', label: 'ทั่วไป', icon: <Gamepad2 size={18} /> },
        { id: 'ACCOUNT', label: 'บัญชี', icon: <UserCircle size={18} /> },
        { id: 'SUPPORT', label: 'ช่วยเหลือ', icon: <Bug size={18} /> },
    ];

    return (
        <div className="w-full h-full bg-casino-table flex items-center justify-center p-4 sm:p-6 overflow-hidden relative">
            {/* Ambient Dark Vignette overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10 heavy-fx" />

            {/* Ambient Glows */}
            <div className="absolute inset-0 pointer-events-none opacity-40 z-0 heavy-fx">
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/20 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px]" />
            </div>

            <motion.div
                className="w-full max-w-md relative z-20 max-h-full flex flex-col"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col max-h-full">
                    {/* Top Glow Decor */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Header */}
                    <div className="p-6 pb-4 relative z-10 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                        <button
                            onClick={() => { SFX.click(); setScreen('MENU'); }}
                            className="absolute left-6 top-6 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-yellow-400 hover:border-yellow-500/30 transition-all cursor-pointer shadow-lg group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <h2 className="text-2xl font-bold text-gold-gradient tracking-widest uppercase">
                            การตั้งค่า
                        </h2>
                        <span className="text-yellow-500/60 text-[10px] tracking-widest font-bold uppercase mt-1">Player Profile</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 pt-4 gap-2 relative z-10">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { SFX.click(); setActiveTab(tab.id); }}
                                className={`flex-1 py-3 px-2 flex flex-col items-center gap-1.5 rounded-xl transition-all duration-300 relative overflow-hidden ${activeTab === tab.id ? 'text-yellow-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div className="relative z-10">{tab.icon}</div>
                                <span className="text-[11px] font-bold tracking-wider relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <AnimatePresence mode="wait">
                            {activeTab === 'GENERAL' && (
                                <motion.div
                                    key="GENERAL"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3"
                                >
                                    <div className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${soundEnabled ? 'group-hover:opacity-100' : ''}`} />
                                        <div className="relative flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner ${soundEnabled ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                                    {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${soundEnabled ? 'text-white' : 'text-white/60'}`}>ระบบเสียงเกม</span>
                                                    <span className="text-white/40 text-[11px] mt-0.5">เปิด/ปิด เอฟเฟกต์และดนตรี</span>
                                                </div>
                                            </div>
                                            <ToggleSwitch enabled={soundEnabled} onClick={toggleSound} activeColorClass="bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${voiceEnabled ? 'group-hover:opacity-100' : ''}`} />
                                        <div className="relative flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner ${voiceEnabled ? 'bg-gradient-to-br from-pink-500/20 to-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                                    {voiceEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${voiceEnabled ? 'text-white' : 'text-white/60'}`}>เสียงพากย์บรรยาย</span>
                                                    <span className="text-white/40 text-[11px] mt-0.5">เสียงดีลเลอร์และตอบรับ</span>
                                                </div>
                                            </div>
                                            <ToggleSwitch enabled={voiceEnabled} onClick={toggleVoice} activeColorClass="bg-gradient-to-b from-pink-400 to-pink-600 shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${fullChipFormat ? 'group-hover:opacity-100' : ''}`} />
                                        <div className="relative flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:bg-black/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner ${fullChipFormat ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                                    <Coins size={24} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${fullChipFormat ? 'text-white' : 'text-white/60'}`}>แสดงชิปเต็มจำนวน</span>
                                                    <span className="text-white/40 text-[11px] mt-0.5">1,000,000 แทน 1M</span>
                                                </div>
                                            </div>
                                            <ToggleSwitch enabled={fullChipFormat} onClick={toggleFullChipFormat} activeColorClass="bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 rounded-2xl blur-xl ${lowMemoryMode ? 'group-hover:opacity-100' : ''}`} />
                                        <div className={`relative flex items-center justify-between p-4 bg-black/40 border ${lowMemoryMode ? 'border-emerald-500/30' : 'border-white/5'} rounded-2xl hover:bg-black/50 transition-colors`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner shrink-0 ${lowMemoryMode ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/30 border border-white/5'}`}>
                                                    <Cpu size={24} />
                                                </div>
                                                <div className="flex flex-col pr-2">
                                                    <span className={`font-bold text-sm sm:text-base tracking-wider transition-colors ${lowMemoryMode ? 'text-emerald-400' : 'text-white/60'}`}>โหมดประหยัดความจำ</span>
                                                    <span className="text-white/40 text-[10px] mt-1 leading-snug">ลดกราฟิกและปิด BGM เพื่อลดอาการเกมหน่วง/เด้ง</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <ToggleSwitch enabled={lowMemoryMode} onClick={toggleLowMemoryMode} activeColorClass="bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'ACCOUNT' && (
                                <motion.div
                                    key="ACCOUNT"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                                        <Save size={32} className="text-blue-400 mx-auto mb-2" />
                                        <h3 className="text-blue-400 font-bold mb-1">ระบบโอนย้ายข้อมูล</h3>
                                        <p className="text-blue-300/60 text-xs">คุณสามารถคัดลอกรหัสเพื่อนำไปเล่นต่อในอุปกรณ์อื่นได้</p>
                                    </div>

                                    {!showImport ? (
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handleExport}
                                                className="w-full p-4 bg-black/40 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 rounded-2xl flex items-center gap-4 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                                    <Upload size={24} />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <span className="block font-bold text-yellow-400 text-sm">ส่งออกข้อมูล</span>
                                                    <span className="text-white/40 text-[11px]">คัดลอกรหัสข้อมูลเพื่อเก็บไว้</span>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => { SFX.click(); setShowImport(true); }}
                                                className="w-full p-4 bg-black/40 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-2xl flex items-center gap-4 transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                                    <Download size={24} />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <span className="block font-bold text-emerald-400 text-sm">นำเข้าข้อมูล</span>
                                                    <span className="text-white/40 text-[11px]">วางรหัสเพื่อกู้คืนหรือเล่นต่อ</span>
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-black/50 p-4 rounded-2xl border border-emerald-500/30 space-y-3 shadow-inner"
                                        >
                                            <h3 className="text-emerald-400 text-sm font-bold text-center">วางรหัสข้อมูลบัญชี</h3>
                                            <textarea
                                                value={importData}
                                                onChange={(e) => setImportData(e.target.value)}
                                                placeholder="วางรหัสข้อมูลบัญชีของคุณที่นี่..."
                                                className="w-full h-24 bg-black/60 border border-emerald-500/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none font-mono placeholder:text-white/20"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { SFX.click(); setShowImport(false); }}
                                                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white font-medium transition-colors"
                                                >
                                                    ยกเลิก
                                                </button>
                                                <button
                                                    onClick={handleImport}
                                                    className="flex-1 py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold shadow-lg border border-emerald-400/50 transition-all"
                                                >
                                                    นำเข้า
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <AnimatePresence>
                                        {transferMsg && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className={`p-3 rounded-xl text-center text-sm font-bold mt-2 ${transferMsg.includes('สำเร็จ') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                                            >
                                                {transferMsg}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {activeTab === 'SUPPORT' && (
                                <motion.div
                                    key="SUPPORT"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center shadow-inner">
                                        <Bug size={40} className="text-red-400 mx-auto mb-3" />
                                        <h3 className="text-white font-bold mb-2">พบปัญหาในการเล่น?</h3>
                                        <p className="text-white/60 text-xs leading-relaxed">
                                            หากคุณพบเจอบั๊ก หรือพบปัญหาใดๆ<br />
                                            สามารถติดต่อผู้พัฒนาได้โดยตรง
                                        </p>
                                    </div>

                                    <a
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); SFX.click(); window.open('https://www.facebook.com/krittapas.kaewsinchai.2025', '_blank'); }}
                                        className="w-full p-4 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2]/50 rounded-2xl flex items-center justify-center gap-3 text-white transition-all group shadow-[0_0_15px_rgba(24,119,242,0.15)]"
                                    >
                                        <Facebook size={24} className="text-[#1877F2] group-hover:scale-110 transition-transform" />
                                        <span className="font-bold tracking-wide">ติดต่อผ่าน Facebook</span>
                                    </a>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Version */}
                    <div className="pt-2 pb-4 text-center relative z-10 border-t border-white/5 bg-black/20">
                        <p className="text-white/20 text-[10px] tracking-widest uppercase font-bold mt-2">
                            {GAME_VERSION}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
