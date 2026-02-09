import React from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import {
    Play, Pause, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, Square,
    Volume2, VolumeX, Shuffle, RefreshCw,
    LayoutGrid, Grid3X3, Columns3, Grid2X2, Columns,
    RotateCw, Gauge, Clock, ChevronUp, ChevronDown
} from 'lucide-react';

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
        toggleDual, toggleTriple, toggleQuad, toggleSix, toggleNine, setGridLayout,
        masterPlaybackRate, setMasterPlaybackRate,
        globalRotation, setGlobalRotation
    } = useMediaStore();

    // Logarithmic Volume Helper
    // Slider (0-1) -> Volume (0-1) : x^2 curve
    // Volume (0-1) -> Slider (0-1) : sqrt(x)
    const handleVolumeChange = (e) => {
        const linearVal = parseInt(e.target.value) / 100;
        const logVal = Math.pow(linearVal, 2); // x^2 curve
        setMasterVolume(logVal);
        setIsMasterMuted(false);
    };

    const sliderValue = isMasterMuted ? 0 : Math.sqrt(masterVolume) * 100;

    return (
        <div className={clsx(
            "glass-panel border-t border-white/10 flex flex-col items-center z-[70] shrink-0 p-2 gap-3 bg-black/80 backdrop-blur-md transition-all rounded-xl",
            compact ? "min-h-[4rem] w-auto mx-auto border-none bg-transparent" : "min-h-[6rem] w-full"
        )}>

            {/* ROW 1: PRIMARY CONTROLS */}
            <div className="w-full flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-between gap-4">

                {/* LEFT: GRID CONTROLS (Hide in Compact Mode or if using Duration Controls) */}
                {!compact ? (
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner shrink-0 order-2 lg:order-1 overflow-x-auto max-w-full justify-center">
                        <button onClick={() => setGridLayout(1, 1)} className={clsx("p-2 rounded-lg transition-all", (gridColumns === 1 && gridRows === 1) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title="Single View"><Square size={16} /></button>
                        <button onClick={toggleDual} className={clsx("p-2 rounded-lg transition-all", (gridColumns * gridRows === 2) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title="Dual View"><Columns size={16} /></button>
                        <button onClick={toggleTriple} className={clsx("p-2 rounded-lg transition-all", (gridColumns * gridRows === 3) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title={threeGridEqual ? "Triple Equal" : "Triple Hero"}><Columns3 size={16} /></button>
                        <button onClick={toggleQuad} className={clsx("p-2 rounded-lg transition-all", (gridColumns * gridRows === 4) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title="Quad View"><Grid2X2 size={16} /></button>
                        <button onClick={toggleSix} className={clsx("p-2 rounded-lg transition-all", (gridColumns * gridRows === 6) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title="Six View"><Grid3X3 size={16} /></button>
                        <button onClick={toggleNine} className={clsx("p-2 rounded-lg transition-all", (gridColumns === 3 && gridRows === 3) ? "bg-[var(--accent-primary)] text-white shadow-lg scale-105" : "text-gray-400 hover:bg-white/10")} title="Nine View"><LayoutGrid size={16} /></button>
                    </div>
                ) : (
                    // DURATION CONTROLS (Show only in Compact/Slideshow Mode)
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 shadow-lg order-1 lg:order-1 mr-2">
                        {/* Duration Value & Arrows */}
                        <div className="flex flex-col items-center bg-black/40 rounded-lg border border-white/5 px-1 py-0.5">
                            <button
                                onClick={() => setSlideshowDuration(Math.min(60, (slideshowDuration || 5) + 5))}
                                onDoubleClick={() => setSlideshowDuration(60)}
                                className="text-gray-500 hover:text-white transition-colors h-3 flex items-center"
                                title="Click: +5s | Double-click: 60s"
                            >
                                <ChevronUp size={12} />
                            </button>

                            <span
                                onClick={() => setIsAutoAdvance && setIsAutoAdvance(!isAutoAdvance)}
                                className={clsx(
                                    "text-xs font-bold font-mono py-0.5 cursor-pointer select-none transition-colors",
                                    isAutoAdvance ? "text-green-400" : "text-gray-500"
                                )}
                                title="Click to toggle Auto-Advance"
                            >
                                {slideshowDuration || 5}s
                            </span>

                            <button
                                onClick={() => setSlideshowDuration(Math.max(5, (slideshowDuration || 5) - 5))}
                                onDoubleClick={() => setSlideshowDuration(5)}
                                className="text-gray-500 hover:text-white transition-colors h-3 flex items-center"
                                title="Click: -5s | Double-click: 5s"
                            >
                                <ChevronDown size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* CENTER: PLAYBACK & VOLUME (Stacked) */}
                <div className="flex flex-col items-stretch gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-lg min-w-[280px] order-2 lg:order-2">

                    {/* Top: Transport Controls */}
                    <div className="flex items-center justify-center gap-3">
                        {/* Prev Group/File */}
                        <div className="flex items-center gap-1">
                            <button onClick={() => skipGroup(-1)} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev Group"><SkipForward size={16} className="rotate-180" /></button>
                            <button onClick={prevFile} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev File"><ChevronLeft size={18} /></button>
                        </div>

                        {/* Stop / Play-Pause / Shuffle */}
                        <div className="flex items-center gap-2">
                            <button onClick={onStopAll} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all active:scale-95 border border-red-500/20" title="Stop All"><Square size={16} fill="currentColor" /></button>

                            <div className="relative group/play">
                                <div className="absolute inset-0 bg-[var(--accent-primary)]/20 blur-xl rounded-full opacity-0 group-hover/play:opacity-50 transition-opacity" />
                                <button
                                    onClick={isPlaying ? onPauseAll : onPlayAll}
                                    className="relative z-10 p-4 bg-[var(--accent-primary)] hover:brightness-110 text-black rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 transition-all flex items-center justify-center"
                                    title={isPlaying ? "Pause Media" : "Play Media"}
                                >
                                    {isPlaying ? (
                                        <Pause size={24} fill="currentColor" />
                                    ) : (
                                        <Play size={24} fill="currentColor" className="ml-1" />
                                    )}
                                </button>
                            </div>

                            {/* Random Start Point (Shuffle) */}
                            <button
                                onClick={onRandomizeAll}
                                className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-all active:scale-95 border border-purple-500/20"
                                title="Random Start Point"
                            >
                                <Shuffle size={16} />
                            </button>
                        </div>

                        {/* Next Group/File */}
                        <div className="flex items-center gap-1">
                            <button onClick={nextFile} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next File"><ChevronRight size={18} /></button>
                            <button onClick={() => skipGroup(1)} className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next Group"><SkipForward size={16} /></button>
                        </div>
                    </div>

                    {/* Bottom: Volume Slider (Full Width) */}
                    <div className="flex items-center gap-2 px-2 pb-1 group/vol">
                        <button onClick={() => setIsMasterMuted(!isMasterMuted)} className={clsx("p-1 transition-colors", isMasterMuted ? "text-gray-500" : "text-[var(--text-dim)] hover:text-white")}>
                            {isMasterMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={sliderValue}
                            onChange={handleVolumeChange} // Logarithmic logic
                            className="w-full h-1 accent-[var(--accent-primary)] bg-white/10 rounded-full cursor-pointer opacity-60 group-hover/vol:opacity-100 transition-opacity"
                        />
                    </div>
                </div>

                {/* RIGHT: TOOLS */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner shrink-0 order-3 justify-center">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (compact) {
                                // Slideshow Mode: True Kiosk Fullscreen
                                if (window.electronAPI) window.electronAPI.toggleFullscreen();
                            } else {
                                // Standard Mode: Layout Widescreen (Sidebar Toggle)
                                toggleFullscreen();
                            }
                        }}
                        className={clsx("p-2 rounded-lg transition-all", fullscreenMode ? "bg-red-500 text-white shadow-lg" : "text-gray-400 hover:bg-white/10 hover:text-white")}
                        title={compact ? "Toggle Kiosk Mode" : "Toggle Widescreen Layout"}
                    >
                        {fullscreenMode ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    {!compact && (
                        <>
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            <button onClick={onRandomizeGrid} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all" title="Randomize Grid"><RefreshCw size={18} /></button>
                            <button onClick={() => setGlobalRotation(r => (r + 90) % 360)} className="p-2 hover:text-yellow-400 text-yellow-600 rounded-lg transition-all" title="Rotate All"><RotateCw size={18} /></button>
                        </>
                    )}
                </div>
            </div>

            {/* ROW 2: SPEED & SKIPS */}
            {!compact && (
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
            )}
        </div>
    );
};

export default ControlPanel;
