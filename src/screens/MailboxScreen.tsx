import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, MailOpen, Check } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { loadMails, claimMailReward, markMailAsRead, checkAndGenerateReliefMail } from '../utils/storage';
import { SFX } from '../utils/sound';
import { formatChips } from '../utils/formatChips';
import type { Mail as MailType } from '../types/game';
import { ChipIcon } from '../components/ChipIcon';

export default function MailboxScreen() {
    const { setScreen, addChips } = useGameStore();
    const [mails, setMails] = useState<MailType[]>([]);

    const refreshMails = () => {
        checkAndGenerateReliefMail();
        setMails(loadMails());
    };

    useEffect(() => {
        refreshMails();
    }, []);

    const handleClaim = (mailId: string) => {
        if (claimMailReward(mailId)) {
            SFX.win();
            setTimeout(() => SFX.chipCollect(), 500);
            const claimedMail = mails.find(m => m.id === mailId);
            if (claimedMail && claimedMail.chipsReward) {
                addChips(claimedMail.chipsReward);
            }
            refreshMails();
        }
    };

    const handleRead = (mailId: string) => {
        markMailAsRead(mailId);
        refreshMails();
    };

    return (
        <div className="w-full h-full bg-casino-table flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden relative">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] z-10 heavy-fx" />

            <motion.div
                className="w-full max-w-4xl h-[95vh] md:h-[85vh] flex flex-col relative z-20 my-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                <div className="bg-black/60 border border-yellow-500/20 shadow-2xl rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col max-h-full w-full h-full">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

                    {/* Header */}
                    <div className="p-6 pb-4 relative z-10 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                        <button
                            onClick={() => { SFX.click(); setScreen('MENU'); }}
                            className="absolute left-6 top-6 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-yellow-400 hover:border-yellow-500/30 transition-all cursor-pointer shadow-lg group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <h2 className="text-2xl font-bold text-gold-gradient tracking-widest uppercase flex items-center gap-2">
                            <Mail className="inline-block" size={24} /> กล่องจดหมาย
                        </h2>
                        <span className="text-yellow-500/60 text-[10px] tracking-widest font-bold uppercase mt-1">Mailbox</span>
                    </div>

                    {/* Mail List */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
                        <AnimatePresence>
                            {mails.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                                    className="h-full flex flex-col items-center justify-center text-white/30"
                                >
                                    <MailOpen size={64} className="mb-4 opacity-20" />
                                    <p className="tracking-widest uppercase">ไม่มีจดหมาย</p>
                                </motion.div>
                            ) : (
                                mails.map(mail => (
                                    <motion.div
                                        key={mail.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden transition-all
                                            ${mail.isRead ? 'bg-black/40 border-white/5' : 'bg-black/60 border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.1)]'}`}
                                        onClick={() => !mail.isRead && handleRead(mail.id)}
                                    >
                                        {!mail.isRead && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                                        )}
                                        
                                        <div className="flex-1 w-full pl-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-lg font-bold ${mail.isRead ? 'text-white/60' : 'text-yellow-400'}`}>
                                                    {mail.title}
                                                </h3>
                                                {!mail.isRead && <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">NEW</span>}
                                            </div>
                                            <p className="text-white/70 text-sm mb-3 leading-relaxed">
                                                {mail.content}
                                            </p>
                                            <span className="text-white/30 text-[10px]">
                                                {new Date(mail.createdAt).toLocaleString('th-TH')}
                                            </span>
                                        </div>

                                        {mail.chipsReward > 0 && (
                                            <div className="w-full sm:w-auto shrink-0 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 pt-4 sm:pt-0 border-t border-white/5 sm:border-none">
                                                <div className="flex items-center gap-1 text-yellow-400 font-bold bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                                                    <ChipIcon className="w-4 h-4" />
                                                    <span>{formatChips(mail.chipsReward)}</span>
                                                </div>
                                                
                                                {mail.isClaimed ? (
                                                    <div className="text-green-500 flex items-center gap-1 text-sm font-bold bg-green-500/10 px-4 py-2 rounded-xl">
                                                        <Check size={16} /> รับแล้ว
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleClaim(mail.id); }}
                                                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-6 py-2 rounded-xl font-bold shadow-[0_4px_15px_rgba(245,158,11,0.2)] hover:brightness-110 border border-yellow-400 transition-all text-sm"
                                                    >
                                                        รับชิป
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
