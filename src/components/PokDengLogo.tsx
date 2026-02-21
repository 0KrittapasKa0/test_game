import { motion } from 'framer-motion';

export const PokDengLogo = ({ className = "" }: { className?: string }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            {/* Left Card: 9 of Spades (Pok 9) */}
            <motion.div
                className="absolute w-16 h-24 bg-white rounded flex flex-col justify-between p-1 shadow-2xl border border-gray-200 z-10"
                style={{
                    transformOrigin: 'bottom right',
                    rotate: -15,
                    x: -20,
                    y: 5
                }}
                initial={{ rotate: -45, x: -40, opacity: 0 }}
                animate={{ rotate: -15, x: -20, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
            >
                <div className="flex flex-col items-start leading-none relative z-10 w-full pl-0.5 pt-0.5 pb-0">
                    <span className="text-black font-black text-xl leading-none">9</span>
                    <span className="text-black text-sm leading-none -mt-1">♠</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-black text-4xl drop-shadow-sm">♠</span>
                </div>
                <div className="flex flex-col items-start leading-none rotate-180 relative z-10 w-full pl-0.5 pt-0.5 pb-0">
                    <span className="text-black font-black text-xl leading-none">9</span>
                    <span className="text-black text-sm leading-none -mt-1">♠</span>
                </div>
            </motion.div>

            {/* Right Card: 8 of Hearts (Pok 8) */}
            <motion.div
                className="absolute w-16 h-24 bg-white rounded flex flex-col justify-between p-1 shadow-xl border border-gray-200 z-20"
                style={{
                    transformOrigin: 'bottom left',
                    rotate: 15,
                    x: 20,
                    y: 0
                }}
                initial={{ rotate: 45, x: 40, opacity: 0 }}
                animate={{ rotate: 15, x: 20, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
            >
                <div className="flex flex-col items-start leading-none relative z-10 w-full pl-0.5 pt-0.5 pb-0">
                    <span className="text-red-500 font-black text-xl leading-none">8</span>
                    <span className="text-red-500 text-sm leading-none -mt-1">♥</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 text-4xl drop-shadow-sm">♥</span>
                </div>
                <div className="flex flex-col items-start leading-none rotate-180 relative z-10 w-full pl-0.5 pt-0.5 pb-0">
                    <span className="text-red-500 font-black text-xl leading-none">8</span>
                    <span className="text-red-500 text-sm leading-none -mt-1">♥</span>
                </div>
            </motion.div>

            {/* Center Pok glow */}
            <motion.div
                className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full z-0"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </div>
    );
};
