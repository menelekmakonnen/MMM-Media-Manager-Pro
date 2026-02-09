import React, { useEffect, useState } from 'react';
import {
    Play, Pause, ChevronLeft, ChevronRight, Zap, Maximize, X,
    SkipForward, RefreshCw, Volume2, VolumeX, Clock,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight
} from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const TRANSITIONS = [
    { id: 'none', label: 'Instant', icon: Zap },
    { id: 'fade', label: 'Fade', icon: Play },
    { id: 'slide', icon: ChevronRight, label: 'Slide' },
    { id: 'zoom', icon: Maximize, label: 'Zoom' },
    { id: 'flip', icon: RefreshCw, label: 'Flip' },
    { id: 'swipe', icon: SkipForward, label: 'Swipe' },
    { id: 'scrollUp', icon: ArrowUp, label: 'Scroll Up' },
    { id: 'scrollDown', icon: ArrowDown, label: 'Scroll Down' },
    { id: 'scrollLeft', icon: ArrowLeft, label: 'Scroll Left' },
    { id: 'scrollRight', icon: ArrowRight, label: 'Scroll Right' },
    { id: 'matrix', icon: Zap, label: 'Matrix' }
];

const SlideshowOverlay = () => {
    const {
        slideshowActive,
        slideshowDuration, adjustSlideshowDuration,
        slideshowTransition, setSlideshowTransition,
        superSlideshowActive,
        setSuperSlideshowActive,
        masterPlaybackRate, setMasterPlaybackRate,
        nextFile, prevFile, triggerRandomStart, setSortField,
        masterVolume, setMasterVolume, isMasterMuted, setIsMasterMuted,
        setSlideshowIdle, // Global state setter
        setAppViewMode, previousViewMode
    } = useMediaStore();

    const [isVisible, setIsVisible] = useState(false);

    // Auto-hide controls after 3 seconds of inactivity
    // Sync with global store for TopBar visibility
    useEffect(() => {
        let timeout;
        const handleAction = () => {
            setIsVisible(true);
            setSlideshowIdle(false);
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setIsVisible(false);
                setSlideshowIdle(true);
            }, 3000);
        };

        window.addEventListener('mousemove', handleAction);
        window.addEventListener('keydown', handleAction);
        handleAction();

        return () => {
            window.removeEventListener('mousemove', handleAction);
            window.removeEventListener('keydown', handleAction);
            clearTimeout(timeout);
            setSlideshowIdle(false); // Reset on unmount
        };
    }, [setSlideshowIdle]);

    // Handle arrow keys for duration selection and Esc to close
    useEffect(() => {
        const handleKey = (e) => {
            if (!slideshowActive) return;

            if (e.key === 'Escape') {
                setAppViewMode(previousViewMode || 'standard');
            }
            if (e.key === 'ArrowUp') {
                adjustSlideshowDuration(1);
            }
            if (e.key === 'ArrowDown') {
                adjustSlideshowDuration(-1);
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [slideshowActive, slideshowDuration, adjustSlideshowDuration, setAppViewMode, previousViewMode]);

    if (!slideshowActive) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-x-0 bottom-0 min-h-[120px] bg-gradient-to-t from-black/95 via-black/80 to-transparent z-[60] flex flex-col items-center justify-center pointer-events-none"
                >
                    <motion.div
                        drag
                        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 0 }}
                        className="flex items-center gap-6 pointer-events-auto bg-black/80 p-4 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-md cursor-move active:cursor-grabbing"
                    >
                        {/* Duration Selection */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Duration</span>
                            <div className="flex items-center gap-1 bg-white/5 p-1 px-2 rounded-xl border border-white/10">
                                <button
                                    onClick={async (e) => { e.stopPropagation(); adjustSlideshowDuration(-10); }}
                                    className="p-1 hover:text-white text-white/30 text-[10px] active-press"
                                    title="-10s"
                                >
                                    -10
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); adjustSlideshowDuration(-1); }}
                                    className="p-1 hover:text-white text-white/40 active-press"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <span className="text-sm font-black text-white w-8 text-center select-none">
                                    {slideshowDuration}s
                                </span>

                                <button
                                    onClick={(e) => { e.stopPropagation(); adjustSlideshowDuration(1); }}
                                    className="p-1 hover:text-white text-white/40 active-press"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); adjustSlideshowDuration(10); }}
                                    className="p-1 hover:text-white text-white/30 text-[10px] active-press"
                                    title="+10s"
                                >
                                    +10
                                </button>
                            </div>
                        </div>

                        {/* Transition Selection (Icons) */}
                        <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-6">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Effect</span>
                            <div className="flex items-center gap-1 bg-white/5 p-1 px-2 rounded-xl border border-white/10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = TRANSITIONS.findIndex(t => t.id === slideshowTransition);
                                        const prevIndex = (currentIndex - 1 + TRANSITIONS.length) % TRANSITIONS.length;
                                        setSlideshowTransition(TRANSITIONS[prevIndex].id);
                                    }}
                                    className="p-1 hover:text-white text-white/40 active-press"
                                >
                                    <ChevronLeft size={14} />
                                </button>

                                <div className="flex items-center gap-2 px-2 min-w-[60px] justify-center">
                                    {(() => {
                                        const current = TRANSITIONS.find(t => t.id === slideshowTransition) || TRANSITIONS[0];
                                        return (
                                            <>
                                                <current.icon size={14} className="text-[var(--accent-primary)]" />
                                                <span className="text-[10px] font-mono font-bold text-white/80">{current.label}</span>
                                            </>
                                        );
                                    })()}
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = TRANSITIONS.findIndex(t => t.id === slideshowTransition);
                                        const nextIndex = (currentIndex + 1) % TRANSITIONS.length;
                                        setSlideshowTransition(TRANSITIONS[nextIndex].id);
                                    }}
                                    className="p-1 hover:text-white text-white/40 active-press"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Control Center */}
                        <div className="flex items-center gap-4 px-4 border-l border-r border-white/10">
                            <button onClick={prevFile} className="text-white/60 hover:text-white hover:scale-110 active:scale-75 transition-all"><ChevronLeft size={28} /></button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSuperSlideshowActive(!superSlideshowActive)}
                                    className={clsx(
                                        "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
                                        superSlideshowActive ? "bg-amber-500 text-black animate-pulse" : "bg-white text-black hover:scale-105"
                                    )}
                                    title={superSlideshowActive ? "Pause Auto-Advance" : "Resume Auto-Advance"}
                                >
                                    {superSlideshowActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                                </button>

                                <button
                                    onClick={() => {
                                        setAppViewMode(previousViewMode || 'standard');
                                    }}
                                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white border-2 border-white/20 shadow-lg hover:bg-red-600 transition-all ml-2"
                                    title="Close Slideshow"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <button onClick={nextFile} className="text-white/60 hover:text-white hover:scale-110 active:scale-75 transition-all"><ChevronRight size={28} /></button>
                        </div>

                        {/* Randomization Group (NEW) */}
                        <div className="flex items-center gap-2 px-4 border-r border-white/10">
                            <button
                                onClick={() => setSortField('random')}
                                className="p-2 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white rounded-xl transition-all active-press border border-purple-500/30"
                                title="Randomize Clips for next cycle"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <button
                                onClick={triggerRandomStart}
                                className="p-2 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-500 hover:text-white rounded-xl transition-all active-press border border-yellow-500/30"
                                title="Randomize all playback start points"
                            >
                                <Clock size={18} />
                            </button>
                        </div>


                        {/* Playback Rate / Slowmo */}
                        <div className="flex flex-col items-center gap-1 pl-4 border-l border-white/10">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Playback</span>
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 h-9">
                                <button
                                    onClick={() => setMasterPlaybackRate(Math.max(0.25, masterPlaybackRate - 0.25))}
                                    className="p-1 hover:text-white text-white/40 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <div className="px-1 min-w-[32px] text-center">
                                    <span className="text-[10px] font-bold font-mono text-white">{masterPlaybackRate}x</span>
                                </div>
                                <button
                                    onClick={() => setMasterPlaybackRate(Math.min(10, masterPlaybackRate + 0.25))}
                                    className="p-1 hover:text-white text-white/40 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Volume Control (NEW) */}
                        <div className="flex flex-col items-center gap-1 pl-4 border-l border-white/10">
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">Volume</span>
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 h-9 px-3">
                                <button onClick={() => setIsMasterMuted(!isMasterMuted)} className="text-white/40 hover:text-white">
                                    {isMasterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={masterVolume}
                                    onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                                    className="w-20 h-1 accent-amber-500"
                                />
                            </div>
                        </div>
                    </motion.div >

                    <div className="mt-3 text-[9px] font-black text-white/40 uppercase tracking-[0.4em] drop-shadow-sm">
                        Arrows: Speed & Nav • Esc: Close • Space: Pause
                    </div>
                </motion.div >
            )}
        </AnimatePresence >
    );
};

export default SlideshowOverlay;
