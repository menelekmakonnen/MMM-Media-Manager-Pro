import React, { useRef, useCallback, useEffect } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import {
    Play, Pause, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, Square,
    Volume2, VolumeX, Shuffle, RefreshCw,
    LayoutGrid, Grid3X3, Columns3, Grid2X2, Columns, Grid, Table,
    RotateCw, Gauge, Clock, ChevronUp, ChevronDown, Monitor, Flame
} from 'lucide-react';

// === Duration Control with Hold-to-Repeat & Scroll Wheel ===
const DurationControl = ({ slideshowDuration, setSlideshowDuration, isAutoAdvance, setIsAutoAdvance }) => {
    const holdRef = useRef(null);
    const containerRef = useRef(null);

    const adjust = useCallback((delta) => {
        setSlideshowDuration(Math.max(1, Math.min(90, (slideshowDuration || 5) + delta)));
    }, [slideshowDuration, setSlideshowDuration]);

    const startHold = useCallback((delta) => {
        // Immediate first tick
        adjust(delta);
        // Start repeating after 400ms, then every 120ms
        const timeout = setTimeout(() => {
            const interval = setInterval(() => {
                const current = useMediaStore.getState().slideshowDuration || 5;
                const next = Math.max(1, Math.min(90, current + delta));
                setSlideshowDuration(next);
            }, 120);
            holdRef.current = { interval, timeout: null };
        }, 400);
        holdRef.current = { timeout, interval: null };
    }, [adjust, setSlideshowDuration]);

    const stopHold = useCallback(() => {
        if (holdRef.current) {
            if (holdRef.current.timeout) clearTimeout(holdRef.current.timeout);
            if (holdRef.current.interval) clearInterval(holdRef.current.interval);
            holdRef.current = null;
        }
    }, []);

    // Wheel handler on the container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY < 0 ? 1 : -1;
            setSlideshowDuration(Math.max(1, Math.min(90, (slideshowDuration || 5) + delta)));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [slideshowDuration, setSlideshowDuration]);

    return (
        <div ref={containerRef} className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 shadow-lg">
            <div className="flex flex-col items-center bg-black/40 rounded-lg border border-white/5 px-1 py-0.5">
                <button
                    onMouseDown={() => startHold(1)}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    className="text-gray-500 hover:text-white transition-colors h-3 flex items-center"
                    title="Hold to increase duration"
                >
                    <ChevronUp size={12} />
                </button>
                <span
                    onClick={() => setIsAutoAdvance && setIsAutoAdvance(!isAutoAdvance)}
                    className={clsx("text-xs font-bold font-mono py-0.5 cursor-pointer select-none transition-colors", isAutoAdvance ? "text-green-400" : "text-gray-500")}
                    title="Click to toggle Auto-Advance"
                >
                    {slideshowDuration || 5}s
                </span>
                <button
                    onMouseDown={() => startHold(-1)}
                    onMouseUp={stopHold}
                    onMouseLeave={stopHold}
                    className="text-gray-500 hover:text-white transition-colors h-3 flex items-center"
                    title="Hold to decrease duration"
                >
                    <ChevronDown size={12} />
                </button>
            </div>
        </div>
    );
};

const ControlPanel = ({
    onPlayAll, onPauseAll, onStopAll, onRandomizeAll, onSkipAll,
    masterVolume, setMasterVolume, isMasterMuted, setIsMasterMuted,
    onRandomizeGrid, isPlaying,
    compact = false,
    // New Props for Duration & Auto-Advance
    slideshowDuration, setSlideshowDuration,
    isAutoAdvance, setIsAutoAdvance
}) => {
    const {
        gridColumns, gridRows,
        fullscreenMode, toggleFullscreen,
        nextFile, prevFile, skipGroup,
        threeGridEqual,
        toggleDual, toggleTriple, toggleQuad, toggleSix, toggleNine, toggleTwelve, setGridLayout,
        masterPlaybackRate, setMasterPlaybackRate,
        globalRotation, setGlobalRotation,
        cinemaMode, toggleCinemaMode,
        mediaFitMode, toggleMediaFitMode,
        isChaosMode, toggleChaosMode
    } = useMediaStore();

    // Volume Slider Architecture:
    // Slider range: 0–200
    // 0–100 → Volume 0–1.0 via x² curve (precise low-volume control)
    // 100–200 → Volume 1.0–4.0 linear (VLC-style boost, uses Web Audio gain)
    const handleVolumeChange = (e) => {
        const raw = parseInt(e.target.value);
        let vol;
        if (raw <= 100) {
            const linearVal = raw / 100;
            vol = Math.pow(linearVal, 2); // x² curve for fine control
        } else {
            vol = 1.0 + ((raw - 100) / 100) * 3.0; // 1.0 → 4.0 linear
        }
        setMasterVolume(vol);
        setIsMasterMuted(false);
    };

    const sliderValue = (() => {
        if (isMasterMuted) return 0;
        if (masterVolume <= 1.0) return Math.sqrt(masterVolume) * 100;
        return 100 + ((masterVolume - 1.0) / 3.0) * 100; // reverse the linear boost
    })();

    const volumePercent = isMasterMuted ? 0 : Math.round(masterVolume * 100);

    return (
        <div className={clsx(
            "glass-panel border-t border-white/10 flex flex-col items-center z-[70] shrink-0 p-2 gap-3 bg-black/80 backdrop-blur-md transition-all rounded-xl",
            compact ? "min-h-[4rem] w-auto mx-auto border-none bg-transparent" : (cinemaMode ? "min-h-[4rem] w-full py-1 gap-1 from-black/90 to-black/80" : "min-h-[6rem] w-full")
        )}>

            {/* ROW 1: PRIMARY CONTROLS */}
            <div className="w-full flex items-center justify-between">

                {/* DURATION CONTROLS (Show only in Compact/Slideshow Mode) */}
                <div className="flex-1 flex justify-start pl-2">
                    {compact && (
                        <DurationControl
                            slideshowDuration={slideshowDuration}
                            setSlideshowDuration={setSlideshowDuration}
                            isAutoAdvance={isAutoAdvance}
                            setIsAutoAdvance={setIsAutoAdvance}
                        />
                    )}
                </div>

                {/* CENTER: PLAYBACK & TOOLS (Merged) */}
                <div className={clsx("flex flex-col items-center bg-black/40 p-2 flex-shrink-0 rounded-2xl shadow-2xl transition-all z-10", cinemaMode ? "gap-1 py-1" : "gap-3")}>

                    {/* Transport Controls & Tools */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-4 lg:gap-6">
                        
                        {/* Prev Group/File */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/5 rounded-xl p-1">
                            <button onClick={() => skipGroup(-1)} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev Group"><SkipForward size={16} className="rotate-180" /></button>
                            <button onClick={prevFile} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev File"><ChevronLeft size={18} /></button>
                        </div>

                        {/* Unified Core Actions Group */}
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button onClick={onRandomizeAll} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20")} title="Random Start Point"><Shuffle size={cinemaMode ? 14 : 16} /></button>
                            <button onClick={toggleChaosMode} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5", isChaosMode ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/5")} title={isChaosMode ? "Chaos Mode ON (Random Start Times)" : "Chaos Mode OFF"}><Flame size={cinemaMode ? 14 : 16} fill={isChaosMode ? "currentColor" : "none"} /></button>
                            
                            {!compact && (
                                <>
                                    <button onClick={onRandomizeGrid} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent text-gray-400" : "p-2 sm:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20")} title="Randomize Grid"><RefreshCw size={cinemaMode ? 14 : 16} /></button>
                                    <button onClick={() => setGlobalRotation(r => (r + 90) % 360)} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent text-gray-400" : "p-2 sm:p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20")} title="Rotate All"><RotateCw size={cinemaMode ? 14 : 16} /></button>
                                </>
                            )}

                            <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2" />

                            <button onClick={onStopAll} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20")} title="Stop All"><Square size={cinemaMode ? 14 : 16} fill="currentColor" /></button>
                            <button onClick={onPauseAll} className={clsx("rounded-xl transition-all active:scale-95 flex items-center justify-center border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5", !isPlaying ? "bg-white/5 text-gray-400 border-white/5" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]")} title="Pause Media"><Pause size={cinemaMode ? 14 : 16} fill="currentColor" /></button>
                            
                            <button onClick={onPlayAll} className={clsx("rounded-xl transition-all active:scale-95 flex items-center justify-center border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5", isPlaying ? "bg-white/5 text-gray-400 border-white/5" : "bg-[var(--accent-primary)] text-black border-[var(--accent-primary)] shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:brightness-110 font-black")} title="Play Media"><Play size={cinemaMode ? 14 : 16} fill="currentColor" /></button>
                            
                            <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2" />
                            
                            <button onClick={toggleMediaFitMode} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent" : "p-2 sm:p-2.5 border-white/5", mediaFitMode === 'cover' ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.3)]" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white")} title={mediaFitMode === 'cover' ? "Fit Media in Box (Contain)" : "Fill Box with Media (Cover)"}>
                                {mediaFitMode === 'cover' ? <Minimize size={cinemaMode ? 14 : 18} /> : <Maximize size={cinemaMode ? 14 : 18} />}
                            </button>

                            {!compact && (
                                <button onClick={toggleCinemaMode} className={clsx("rounded-xl transition-all active:scale-95 border", cinemaMode ? "p-1.5 border-transparent bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "p-2 sm:p-2.5 bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white")} title={cinemaMode ? "Exit Cinema Mode (Show Sidebars)" : "Enter Cinema Mode (Hide Sidebars)"}>
                                    <Monitor size={cinemaMode ? 14 : 18} />
                                </button>
                            )}
                        </div>

                        {/* Next Group/File */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/5 rounded-xl p-1">
                            <button onClick={nextFile} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next File"><ChevronRight size={18} /></button>
                            <button onClick={() => skipGroup(1)} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next Group"><SkipForward size={16} /></button>
                        </div>
                    </div>

                    {/* Bottom: Volume Slider (Full Width — now 400% capable) */}
                    <div className="flex items-center gap-2 px-2 pb-0 group/vol w-full max-w-[500px]">
                        <button onClick={() => setIsMasterMuted(!isMasterMuted)} className={clsx("p-1 transition-colors", isMasterMuted ? "text-gray-500" : "text-[var(--text-dim)] hover:text-white")}>
                            {isMasterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input
                            type="range" min="0" max="200" value={sliderValue} onChange={handleVolumeChange} 
                            className="w-full h-1 accent-[var(--accent-primary)] bg-white/10 rounded-full cursor-pointer opacity-60 group-hover/vol:opacity-100 transition-opacity"
                        />
                        <span className={clsx("text-[9px] font-mono font-bold min-w-[32px] text-right transition-colors", volumePercent > 100 ? "text-orange-400" : "text-white/40")}>
                            {volumePercent}%
                        </span>
                    </div>
                </div>

                {/* KIOSK TOGGLE (Slideshow Only) */}
                <div className="flex-1 flex justify-end pr-2">
                    {compact && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (window.electronAPI) window.electronAPI.toggleFullscreen(); }} className={clsx("p-2 rounded-lg transition-all shadow-lg", fullscreenMode ? "bg-red-500 text-white" : "bg-black/60 text-gray-400 hover:bg-white/10 hover:text-white")} title="Toggle Kiosk Mode">
                            {fullscreenMode ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* ROW 2: SPEED & SKIPS */}
            {
                !compact && !cinemaMode && (
                    <div className="flex items-center justify-center gap-4 sm:gap-6 mt-1 flex-wrap">

                        {/* Backward Skips */}
                        <div className="flex items-center gap-1">
                            <button onClick={() => onSkipAll(-300)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors hidden sm:block">-5m</button>
                            <button onClick={() => onSkipAll(-120)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">-2m</button>
                            <button onClick={() => onSkipAll(-30)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">-30s</button>
                            <button onClick={() => onSkipAll(-5)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">-5s</button>
                        </div>

                        {/* Speed Controls */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-full px-1 py-0.5 shadow-lg">
                            <button
                                onClick={() => {
                                    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
                                    const index = speeds.indexOf(masterPlaybackRate);
                                    if (index > 0) setMasterPlaybackRate(speeds[index - 1]);
                                }}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors"
                                title="Slower"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <div className="flex flex-col items-center justify-center px-3 min-w-[48px]">
                                <Gauge size={12} className="text-[var(--accent-primary)] mb-0.5" />
                                <span className="text-[10px] font-bold font-mono text-white">{masterPlaybackRate}x</span>
                            </div>
                            <button
                                onClick={() => {
                                    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
                                    const index = speeds.indexOf(masterPlaybackRate);
                                    if (index < speeds.length - 1) setMasterPlaybackRate(speeds[index + 1]);
                                }}
                                className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors"
                                title="Faster"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Forward Skips */}
                        <div className="flex items-center gap-1">
                            <button onClick={() => onSkipAll(10)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">+10s</button>
                            <button onClick={() => onSkipAll(120)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">+2m</button>
                            <button onClick={() => onSkipAll(300)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors hidden sm:block">+5m</button>
                            <button onClick={() => onSkipAll(600)} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors hidden sm:block">+10m</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ControlPanel;
