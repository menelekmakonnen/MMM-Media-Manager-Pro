import React, { useEffect, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Zap, Wind, Maximize, Clock, Settings2 } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const DURATIONS = [3, 5, 10, 30];
const TRANSITIONS = [
    { id: 'fade', label: 'Fade', icon: Wind },
    { id: 'slide', label: 'Swipe', icon: ChevronRight },
    { id: 'zoom', label: 'Zoom', icon: Maximize },
    { id: 'flip', label: 'Flip', icon: Settings2 },
    { id: 'swipe', label: 'Push', icon: Zap }
];

const SlideshowOverlay = () => {
    const {
        slideshowActive, setSlideshowActive,
        slideshowDuration, setSlideshowDuration,
        slideshowTransition, setSlideshowTransition,
        superSlideshowActive, toggleSuperSlideshow,
        nextFile, prevFile
    } = useMediaStore();

    const [isVisible, setIsVisible] = useState(false);

    // Auto-hide controls after 3 seconds of inactivity
    useEffect(() => {
        let timeout;
        const handleAction = () => {
            setIsVisible(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setIsVisible(false), 3000);
        };

        window.addEventListener('mousemove', handleAction);
        window.addEventListener('keydown', handleAction);
        handleAction();

        return () => {
            window.removeEventListener('mousemove', handleAction);
            window.removeEventListener('keydown', handleAction);
            clearTimeout(timeout);
        };
    }, []);

    // Handle arrow keys for duration selection
    useEffect(() => {
        const handleKey = (e) => {
            if (!slideshowActive) return;

            if (e.key === 'ArrowUp') {
                const idx = DURATIONS.indexOf(slideshowDuration);
                const next = DURATIONS[Math.min(DURATIONS.length - 1, idx + 1)];
                setSlideshowDuration(next);
            }
            if (e.key === 'ArrowDown') {
                const idx = DURATIONS.indexOf(slideshowDuration);
                const prev = DURATIONS[Math.max(0, idx - 1)];
                setSlideshowDuration(prev);
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [slideshowActive, slideshowDuration, setSlideshowDuration]);

    if (!slideshowActive) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-[60] flex flex-col items-center justify-center pointer-events-none"
                >
                    <div className="flex items-center gap-6 pointer-events-auto">
                        {/* Duration Selection */}
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/10">
                            {DURATIONS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setSlideshowDuration(d)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active-press",
                                        slideshowDuration === d ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:text-white"
                                    )}
                                >
                                    {d}s
                                </button>
                            ))}
                        </div>

                        {/* Control Center */}
                        <div className="flex items-center gap-3 bg-[var(--accent-primary)]/10 backdrop-blur-xl p-2 px-4 rounded-3xl border border-[var(--accent-primary)]/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                            <button onClick={prevFile} className="text-white hover:scale-110 active:scale-75 transition-transform"><ChevronLeft size={24} /></button>
                            <button
                                onClick={() => setSlideshowActive(false)}
                                className="w-12 h-12 bg-[var(--accent-primary)] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-90 transition-all"
                            >
                                <Pause size={24} fill="white" />
                            </button>
                            <button onClick={nextFile} className="text-white hover:scale-110 active:scale-75 transition-transform"><ChevronRight size={24} /></button>
                        </div>

                        {/* Transition Selection */}
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/10">
                            {TRANSITIONS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSlideshowTransition(t.id)}
                                    className={clsx(
                                        "p-2 rounded-xl transition-all active-press group",
                                        slideshowTransition === t.id ? "bg-white/20 text-white shadow-inner" : "text-white/20 hover:text-white"
                                    )}
                                    title={t.label}
                                >
                                    <t.icon size={16} className={clsx("transition-transform", slideshowTransition === t.id ? "scale-110" : "group-hover:scale-110")} />
                                </button>
                            ))}
                        </div>

                        {/* Super Slideshow Toggle */}
                        <button
                            onClick={toggleSuperSlideshow}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all active-press",
                                superSlideshowActive
                                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                            )}
                        >
                            <Zap size={16} fill={superSlideshowActive ? "currentColor" : "none"} />
                            <span className="text-[10px] font-black tracking-widest uppercase">SUPER</span>
                        </button>
                    </div>

                    <div className="mt-2 text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
                        Arrow Keys to Adjust Speed & Navigate • Space to Pause
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SlideshowOverlay;
