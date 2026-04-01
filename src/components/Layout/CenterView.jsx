import React, { useRef, useState, useEffect, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { getMediaUrl } from '../../utils/mediaUrl';
import clsx from 'clsx';
import {
    Play, Pause, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, Columns, Rows, Square,
    Volume2, VolumeX, Shuffle, RefreshCw,
    LayoutGrid, Grid3X3, Columns3, Grid2X2,
    RotateCw, ZoomIn, EyeOff, Film, ArrowLeftRight,
    Gauge, ArrowUp, ArrowDown, Pin, Star, X,
    Monitor, Flame
} from 'lucide-react';
import VideoPlayer from '../VideoPlayer';
import { VideoRegistryContext } from '../../contexts/VideoRegistryContext.js';
import { motion, AnimatePresence } from 'framer-motion';
import SlideshowOverlay from './SlideshowOverlay';

const TRANSITION_VARIANTS = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 }
    },
    slide: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeOut" }
    },
    swipe: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: "easeOut" }
    },
    zoom: {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.05, opacity: 0 },
        transition: { duration: 0.2 }
    },
    flip: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 }
    }
};

// Helper for formatting bytes
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper for formatting date
const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString();
};

// IMAGE VIEWER with Zoom + Grayscale + Random
const ImageViewer = ({ file, url, isActive, grayscaleInactive, onRandom, rotation, onRotate }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [isGrayscale, setIsGrayscale] = useState(false);

    const { mediaFitMode } = useMediaStore();
    // State is reset by 'key' prop on the component

    const handleMouseDown = (e) => {
        if (zoom > 1) {
            setIsDragging(true);
            setLastPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && zoom > 1) {
            const dx = e.clientX - lastPos.x;
            const dy = e.clientY - lastPos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const toggleZoom = (e) => {
        e.stopPropagation();
        if (zoom > 1) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        } else {
            setZoom(2.5);
        }
    };

    return (
        <div
            className={clsx(
                "w-full h-full relative group overflow-hidden",
                zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                className="w-full h-full transition-transform duration-200"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation || 0}deg)`,
                    transformOrigin: 'center center'
                }}
            >
                <img
                    src={url}
                    alt={file.name}
                    className={clsx(
                        "w-full h-full pointer-events-none transition-all duration-300",
                        mediaFitMode === 'cover' ? 'object-cover' : 'object-contain',
                        (isGrayscale || (grayscaleInactive && !isActive)) && "grayscale"
                    )}
                />
            </div>
            {/* Hover Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none group-hover:pointer-events-auto bg-black/60 backdrop-blur rounded-full px-3 py-1.5 shadow-lg border border-white/10">
                <button onClick={toggleZoom} className="p-1 hover:text-[var(--accent-primary)] text-white transition-colors" title="Zoom In/Out"><ZoomIn size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); setIsGrayscale(!isGrayscale); }} className={clsx("p-1 transition-colors", isGrayscale ? "text-[var(--accent-primary)]" : "text-white")} title="Grayscale"><EyeOff size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); onRotate(); }} className="p-1 hover:text-yellow-400 text-white transition-colors" title="Rotate +90"><RotateCw size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); onRandom(); }} className="p-1 hover:text-purple-400 text-purple-200 transition-colors" title="Random Image"><RefreshCw size={14} /></button>
            </div>
        </div>
    );
};

const MediaItem = ({ 
    file, isActive, grayscaleInactive, zoomMode, widescreen, 
    onClick, onDoubleClick, onRandomVideo, 
    masterVolume, isMasterMuted, masterPlaybackRate, 
    rotation, isHero, nextFile, onRotate, onSwapLeft, onSwapRight, slotIndex,
    isPinned, onTogglePin, isFavorite, onToggleFavorite, onRemove
}) => {
    const videoPlayerRef = useRef(null);
    const [url, setUrl] = useState(null);

    useEffect(() => {
        let active = true;
        // External files (opened via "Open with") carry a pre-made blob URL
        if (file?._externalBlobUrl) {
            setUrl(file._externalBlobUrl);
        } else if (file?.handle) {
            getMediaUrl(file).then(u => { if (active) setUrl(u); });
        }
        return () => { active = false; };
    }, [file]);

    const handleContextMenu = (e) => {
        e.preventDefault();
        const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
        useMediaStore.getState().setMediaContextMenu({ x: e.clientX, y: e.clientY, file, currentTime });
    };

    if (!file) return <div className="bg-white/5 h-full w-full animate-pulse rounded-2xl" />;
    
    const isVideo = file.type === 'video';

    return (
        <div
            className={clsx(
                "relative bg-black h-full w-full overflow-hidden transition-all duration-500 group/video shadow-2xl border border-white/5",
                isHero ? "rounded-3xl z-10 scale-[1.01]" : "rounded-2xl opacity-90 hover:opacity-100 hover:scale-[1.02] z-0",
                isPinned ? "border-[var(--accent-primary)]/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "hover:border-white/20",
                grayscaleInactive && !isActive && !isPinned && "grayscale hover:grayscale-0 transition-[filter]"
            )}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={handleContextMenu}
        >
            {isVideo && url ? (
                <div className="w-full h-full relative">
                    <div className="relative w-full h-full group/controls">
                        <VideoPlayer
                            ref={videoPlayerRef}
                            file={file}
                            fileUrl={url}
                            isActive={isActive}
                            slotIndex={slotIndex}
                            onRandomVideo={onRandomVideo}
                            masterVolume={masterVolume}
                            isMasterMuted={isMasterMuted}
                            masterPlaybackRate={masterPlaybackRate}
                            rotation={rotation}
                        />
                        {/* Video Hover Controls */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover/controls:opacity-100 transition-opacity z-40 bg-black/60 rounded-lg p-1">
                            <button onClick={(e) => { e.stopPropagation(); onRotate(); }} className="p-1.5 hover:text-yellow-400 text-yellow-200 transition-colors" title="Rotate +90"><RotateCw size={14} /></button>
                        </div>
                    </div>
                </div>
            ) : url ? (
                <ImageViewer
                    key={file.path}
                    file={file}
                    url={url}
                    isActive={isActive}
                    grayscaleInactive={grayscaleInactive}
                    rotation={rotation}
                    onRandom={onRandomVideo}
                    onRotate={onRotate}
                />
            ) : null}

            {/* Top Left Controls: Swap & Pin */}
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/video:opacity-100 transition-opacity z-40 bg-black/60 rounded-lg p-1">
                <button onClick={(e) => { e.stopPropagation(); onSwapLeft(); }} className="p-1 hover:text-white text-gray-400"><ArrowLeftRight size={14} className="rotate-180" /></button>
                <button onClick={(e) => { e.stopPropagation(); onSwapRight(); }} className="p-1 hover:text-white text-gray-400"><ArrowLeftRight size={14} /></button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePin(); }} 
                    className={clsx("p-1 ml-1 transition-colors", isPinned ? "text-[var(--accent-primary)] drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" : "text-white/50 hover:text-white")}
                    title={isPinned ? "Unpin Grid" : "Pin to Grid"}
                >
                    <Pin size={14} className={isPinned ? "fill-current" : ""} />
                </button>
            </div>

            {/* Top Right Controls: Star & Remove */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/video:opacity-100 transition-opacity z-40 bg-black/60 rounded-lg p-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); useMediaStore.getState().sendToEditor(file); }} 
                    className="p-1 hover:text-[var(--accent-primary)] text-white/50 transition-colors"
                    title="Open in Timeline Editor"
                >
                    <Film size={14} />
                </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} 
                    className={clsx("p-1 transition-colors", isFavorite ? "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" : "text-white/50 hover:text-yellow-400")}
                    title={isFavorite ? "Unstar" : "Star"}
                >
                    <Star size={14} className={isFavorite ? "fill-current" : ""} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }} 
                    className="p-1 hover:text-red-400 text-white/50 transition-colors ml-1"
                    title="Remove/Exclude"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Metadata Overlay */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity pointer-events-none z-30">
                <h3 className="text-white font-medium text-sm truncate drop-shadow-md">{file.name}</h3>
                <div className="flex items-center gap-2 text-[var(--text-dim)] text-[10px] mt-0.5 font-mono">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.lastModified)}</span>
                </div>
            </div>
        </div>
    );
};
// Original Standard View ControlPanel (matching the exe build layout)
const StandardControlPanel = ({
    onPlayAll, onPauseAll, onStopAll, onRandomizeAll, onSkipAll,
    masterVolume, setMasterVolume, isMasterMuted, setIsMasterMuted,
    onRandomizeGrid, isPlaying
}) => {
    const {
        gridColumns, gridRows,
        fullscreenMode, toggleFullscreen,
        nextFile, prevFile, skipGroup,
        threeGridEqual,
        toggleDual, toggleTriple, toggleQuad, toggleSix, toggleNine, setGridLayout,
        masterPlaybackRate, setMasterPlaybackRate,
        globalRotation, setGlobalRotation,
        isChaosMode, toggleChaosMode,
        mediaFitMode, toggleMediaFitMode,
        cinemaMode, toggleCinemaMode
    } = useMediaStore();

    return (
        <div className={clsx("w-full glass-panel border-t border-white/10 flex flex-col items-center z-[70] shrink-0 p-2 gap-3 transition-all", cinemaMode ? "min-h-[4rem] py-1 bg-black/95" : "min-h-[6rem] bg-black/80 backdrop-blur-md")}>

            {/* ROW 1: PRIMARY CONTROLS */}
            <div className="w-full flex items-center justify-center gap-4">

                {/* PLAYBACK & VOLUME (Stacked) */}
                <div className="flex flex-col items-stretch gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-lg min-w-[280px]">

                    {/* Top: Transport Controls */}
                    <div className="flex items-center justify-between gap-3 w-full">
                        {/* Prev Group/File (Flanking Left) */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/5 rounded-xl p-1">
                            <button onClick={() => skipGroup(-1)} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev Group"><SkipForward size={16} className="rotate-180" /></button>
                            <button onClick={prevFile} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Prev File"><ChevronLeft size={18} /></button>
                        </div>

                        {/* Center Tools */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 sm:gap-2">
                            {/* Playback Actions */}
                            <button onClick={onRandomizeAll} className="p-2 sm:p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 transition-all active:scale-95" title="Random Start Point"><Shuffle size={16} /></button>
                            <button onClick={toggleChaosMode} className={clsx("p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 border", isChaosMode ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/5")} title={isChaosMode ? "Chaos Mode ON" : "Chaos Mode OFF"}><Flame size={16} fill={isChaosMode ? "currentColor" : "none"} /></button>
                            
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            
                            <button onClick={onStopAll} className="p-2 sm:p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all active:scale-95" title="Stop All"><Square size={16} fill="currentColor" /></button>
                            
                            <div className="relative group/play mx-1">
                                <div className="absolute inset-0 bg-[var(--accent-primary)]/20 blur-xl rounded-full opacity-0 group-hover/play:opacity-50 transition-opacity" />
                                <button
                                    onClick={isPlaying ? onPauseAll : onPlayAll}
                                    className="relative z-10 p-4 bg-[var(--accent-primary)] hover:brightness-110 text-black rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)] active:scale-95 transition-all flex items-center justify-center"
                                    title={isPlaying ? "Pause All" : "Play All"}
                                >
                                    {isPlaying ? (
                                        <Pause size={24} fill="currentColor" />
                                    ) : (
                                        <Play size={24} fill="currentColor" className="ml-1" />
                                    )}
                                </button>
                            </div>
                            
                            {/* Toggles */}
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            
                            <button onClick={onRandomizeGrid} className="p-2 sm:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all active:scale-95" title="Randomize Grid"><RefreshCw size={16} /></button>
                            <button onClick={() => setGlobalRotation(r => (r + 90) % 360)} className="p-2 sm:p-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/20 rounded-xl transition-all active:scale-95" title="Rotate All"><RotateCw size={16} /></button>
                            
                            <div className="w-px h-6 bg-white/10 mx-1" />
                            
                            <button onClick={toggleMediaFitMode} className={clsx("p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 border", mediaFitMode === 'cover' ? "bg-amber-600 border-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.3)]" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5")} title={mediaFitMode === 'cover' ? "Fit Media in Box (Contain)" : "Fill Box with Media (Cover)"}>
                                {mediaFitMode === 'cover' ? <Minimize size={16} /> : <Maximize size={16} />}
                            </button>
                            
                            <button onClick={toggleCinemaMode} className={clsx("p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 border", cinemaMode ? "bg-purple-500 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5")} title={cinemaMode ? "Exit Cinema Mode (Show Sidebars)" : "Enter Cinema Mode (Hide Sidebars)"}>
                                <Monitor size={16} />
                            </button>
                            
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); }} className={clsx("p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 border", fullscreenMode ? "bg-red-500 border-red-500 text-white shadow-lg" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/5")} title="Widescreen/Fullscreen">
                                {fullscreenMode ? <Minimize size={16} /> : <Maximize size={16} />}
                            </button>
                        </div>

                        {/* Next Group/File (Flanking Right) */}
                        <div className="flex items-center gap-1 shrink-0 bg-white/5 rounded-xl p-1">
                            <button onClick={nextFile} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next File"><ChevronRight size={18} /></button>
                            <button onClick={() => skipGroup(1)} className="p-1.5 sm:p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all" title="Next Group"><SkipForward size={16} /></button>
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
                            value={isMasterMuted ? 0 : masterVolume * 100}
                            onChange={(e) => { setMasterVolume(parseInt(e.target.value) / 100); setIsMasterMuted(false); }}
                            className="w-full h-1 accent-[var(--accent-primary)] bg-white/10 rounded-full cursor-pointer opacity-60 group-hover/vol:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
            </div>

            {/* ROW 2: SPEED & SKIPS */}
            {!cinemaMode && (
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

const CenterView = () => {
    const {
        currentFileIndex, setCurrentFileIndex,
        gridColumns, gridRows, threeGridEqual,
        grayscaleInactive, zoomMode, widescreen,
        nextFile,
        getSortedFiles,
        masterPlaybackRate, itemRotations, globalRotation, rotateItem,
        slideshowActive, slideshowDuration, slideshowTransition, superSlideshowActive,
        nineGridHero, currentFolder, setGridLayout,
        masterVolume, setMasterVolume, isMasterMuted, setIsMasterMuted,
        pinnedGrids, togglePin, clearPins, unpinItem,
        favoriteItems, toggleFavorite, toggleItemExclusion, showJumpButtons,
        globalIsPlaying, setGlobalIsPlaying
    } = useMediaStore();

    const sortedFiles = getSortedFiles();

    // DEBUG: Trace Navigation State
    useEffect(() => {
        console.log('[CenterView] Folder Change Detected:', { currentFolder, fileCount: sortedFiles.length });
    }, [currentFolder, sortedFiles.length]);

    const videoRegistryRef = useRef(new Map());
    // const [masterVolume, setMasterVolume] = useState(0.5); // Removed local state
    // const [isMasterMuted, setIsMasterMuted] = useState(false); // Removed local state
    const [gridOffsets, setGridOffsets] = useState({});
    
    // Bind global play state
    const isPlaying = globalIsPlaying;
    const setIsPlaying = setGlobalIsPlaying;
    
    // Pagination Visibility State
    const [showPagination, setShowPagination] = useState(false);
    const paginationTimeoutRef = useRef(null);

    // Auto-show pagination on group change
    useEffect(() => {
        if (slideshowActive || !showJumpButtons) return;
        setShowPagination(true);
        if (paginationTimeoutRef.current) clearTimeout(paginationTimeoutRef.current);
        paginationTimeoutRef.current = setTimeout(() => {
            setShowPagination(false);
        }, 4000);
        return () => clearTimeout(paginationTimeoutRef.current);
    }, [currentFileIndex, slideshowActive, showJumpButtons]);

    const handlePaginationHover = (isHovering) => {
        if (!showJumpButtons) return;
        if (isHovering) {
            setShowPagination(true);
            if (paginationTimeoutRef.current) clearTimeout(paginationTimeoutRef.current);
        } else {
            if (paginationTimeoutRef.current) clearTimeout(paginationTimeoutRef.current);
            paginationTimeoutRef.current = setTimeout(() => {
                setShowPagination(false);
            }, 4000);
        }
    };

    // Bubble scrubbing
    const isScrubbingRef = useRef(false);

    const handlePointerDown = (e) => {
        isScrubbingRef.current = true;
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e) => {
        isScrubbingRef.current = false;
        e.target.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isScrubbingRef.current) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el.dataset.index !== undefined) {
            const idx = parseInt(el.dataset.index, 10);
            const itemsToShow = gridColumns * gridRows;
            const currentPageNow = Math.floor(useMediaStore.getState().currentFileIndex / itemsToShow);
            if (idx !== currentPageNow) {
                useMediaStore.getState().setCurrentFileIndex(idx * itemsToShow);
                setGridOffsets({});
            }
        }
    };

    // Reset offsets when navigating folders or making large jumps (like next group)
    useEffect(() => {
        setGridOffsets({});
    }, [currentFolder, currentFileIndex]);

    // Reset playback state on folder change
    useEffect(() => {
        setCurrentFileIndex(0);
        setIsPlaying(false);
    }, [currentFolder, setCurrentFileIndex]);

    // Video Registry (Optimized to use Ref to avoid re-renders)
    const registerVideo = useCallback((v, slotIndex) => {
        if (v) {
            videoRegistryRef.current.set(slotIndex, v);
        }
    }, []);
    const unregisterVideo = useCallback((slotIndex, videoElement) => {
        const current = videoRegistryRef.current.get(slotIndex);
        if (current === videoElement) {
            videoRegistryRef.current.delete(slotIndex);
        }
    }, []);

    const playAll = () => {
        setIsPlaying(true);
        videoRegistryRef.current.forEach(v => {
            v.play().catch(() => { });
        });
    };
    const pauseAll = () => {
        setIsPlaying(false);
        videoRegistryRef.current.forEach(v => v.pause());
    };
    const stopAll = () => {
        setIsPlaying(false);
        videoRegistryRef.current.forEach(v => { v.pause(); v.currentTime = 0; });
    };
    const skipAll = (s) => videoRegistryRef.current.forEach(v => { if (v.currentTime !== undefined) v.currentTime += s; });
    const randomizeAll = () => {
        videoRegistryRef.current.forEach(v => { if (v.duration) v.currentTime = Math.random() * v.duration; });
    };

    // Slideshow Timer
    useEffect(() => {
        if (!slideshowActive) return;

        const interval = setInterval(() => {
            nextFile();
            // Super Slideshow: Play all after small delay to let items mount
            if (superSlideshowActive) {
                setTimeout(playAll, 500);
            }
        }, slideshowDuration * 1000);

        return () => clearInterval(interval);
    }, [slideshowActive, slideshowDuration, nextFile, superSlideshowActive, gridColumns, gridRows]);

    // Setup Grid Logic
    const randomizeGrid = () => {
        const count = gridColumns * gridRows;
        for (let i = 0; i < count; i++) swapToRandomVideo(i);
    };

    const swapToRandomVideo = useCallback((slotIndex) => {
        setGridOffsets(prev => ({ ...prev, [slotIndex]: (prev[slotIndex] || 0) + Math.floor(Math.random() * (sortedFiles.length - 1)) + 1 }));
    }, [sortedFiles.length]);

    // Grid Swapping
    const handleSwap = (slotIndex, direction) => {
        setGridOffsets(prev => {
            const baseIndex = currentFileIndex < 0 ? 0 : currentFileIndex % sortedFiles.length;
            const offsetA = prev[slotIndex] || 0;
            const offsetB = prev[slotIndex + direction] || 0;

            const fileIndexA = (baseIndex + slotIndex + offsetA);
            const fileIndexB = (baseIndex + (slotIndex + direction) + offsetB);

            const newOffsetA = fileIndexB - baseIndex - slotIndex;
            const newOffsetB = fileIndexA - baseIndex - (slotIndex + direction);

            return { ...prev, [slotIndex]: newOffsetA, [slotIndex + direction]: newOffsetB };
        });
    };

    const handleItemClick = useCallback((originalIndex) => {
        if (gridColumns * gridRows === 1) setCurrentFileIndex(originalIndex);
    }, [setCurrentFileIndex, gridColumns, gridRows]);

    const handleItemDoubleClick = useCallback((originalIndex) => {
        setCurrentFileIndex(originalIndex);
        if (gridColumns * gridRows > 1) {
            setGridLayout(1, 1);
        }
    }, [setCurrentFileIndex, gridColumns, gridRows, setGridLayout]);

    const cols = gridColumns;
    const rows = gridRows;
    const itemsToShow = cols * rows;
    const baseIndex = currentFileIndex < 0 ? 0 : currentFileIndex % Math.max(1, sortedFiles.length);

    const renderFiles = [];
    const hasFiles = sortedFiles.length > 0;
    
    if (hasFiles || Object.keys(pinnedGrids || {}).length > 0) {
        let unpinnedOffset = 0;
        for (let i = 0; i < itemsToShow; i++) {
            if (pinnedGrids && pinnedGrids[i]) {
                const pFile = pinnedGrids[i];
                renderFiles.push({
                    file: pFile,
                    originalIndex: -1,
                    slotIndex: i,
                    key: `pinned-${pFile.path}-${i}`,
                    isPinned: true
                });
            } else if (hasFiles) {
                let index = (baseIndex + unpinnedOffset);
                if (gridOffsets[i]) index += gridOffsets[i];
                const wrappedIndex = (index % sortedFiles.length + sortedFiles.length) % sortedFiles.length;
                if (sortedFiles[wrappedIndex]) {
                    renderFiles.push({
                        file: sortedFiles[wrappedIndex],
                        originalIndex: wrappedIndex,
                        slotIndex: i,
                        // If we are changing groups instantly, we want the DOM to recycle video elements if possible
                        // Or we just use standard file path keys.
                        key: sortedFiles[wrappedIndex].path,
                        isPinned: false
                    });
                }
                unpinnedOffset++;
            }
        }
    }

    // Bubble Pagination calculations
    const totalPages = itemsToShow > 0 ? Math.ceil(Math.max(1, sortedFiles.length) / itemsToShow) : 1;
    const currentPage = itemsToShow > 0 ? Math.floor(currentFileIndex / itemsToShow) : 0;

    const contextValue = React.useMemo(() => ({
        videos: {}, // Handled by VideoRegistryContext
        register: registerVideo,
        unregister: unregisterVideo
    }), [registerVideo, unregisterVideo]);

    const variant = TRANSITION_VARIANTS[slideshowTransition] || TRANSITION_VARIANTS.fade;

    if (sortedFiles.length === 0) return <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">Open a folder to start</div>;

    // Grid CSS Generation
    const is3GridHorizontal = (cols === 3 && rows === 1);
    const is3GridVertical = (cols === 1 && rows === 3);
    const isHeroGrid = ((is3GridHorizontal || is3GridVertical) && !threeGridEqual) || (cols === 3 && rows === 3 && nineGridHero);
    const is3x3Hero = cols === 3 && rows === 3 && nineGridHero;

    let gridStyle;
    if (is3GridHorizontal && !threeGridEqual) gridStyle = { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr)', gridTemplateRows: '1fr' };
    else if (is3GridVertical && !threeGridEqual) gridStyle = { gridTemplateColumns: '1fr', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr)' };
    else if (is3x3Hero) gridStyle = { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr)' };
    else gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` };

    return (
        <VideoRegistryContext.Provider value={contextValue}>
            <div className="h-full w-full flex flex-col relative overflow-hidden">
                <SlideshowOverlay />

                <div className="flex-1 p-4 min-h-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm relative">
                    
                        {/* Clear Pins Floating Button */}
                        <AnimatePresence>
                            {pinnedGrids && Object.keys(pinnedGrids).length > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    onClick={clearPins}
                                    className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/50 text-[var(--text-primary)] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-[var(--accent-primary)]/20 transition-all text-xs font-bold tracking-wider uppercase flex items-center gap-2"
                                >
                                    <Pin size={12} className="rotate-45" /> Clear Pinned Grids
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <div key={currentFolder} className="h-full w-full grid gap-2 transition-all duration-200" style={gridStyle}>
                            <AnimatePresence initial={false}>
                                {renderFiles.map(({ file, originalIndex, slotIndex, key, isPinned }, i) => (
                                    <motion.div
                                        key={key}
                                        {...variant}
                                        className="w-full h-full"
                                    >
                                    <MediaItem
                                        file={file}
                                        isActive={originalIndex === currentFileIndex}
                                        grayscaleInactive={grayscaleInactive}
                                        zoomMode={zoomMode}
                                        widescreen={widescreen}
                                        slotIndex={slotIndex}
                                        onClick={() => handleItemClick(originalIndex)}
                                        onDoubleClick={() => handleItemDoubleClick(originalIndex)}
                                        onRandomVideo={() => swapToRandomVideo(slotIndex)}
                                        onRotate={() => rotateItem(file.path, ((itemRotations[file.path] || 0) + 90))}
                                        onSwapLeft={() => handleSwap(slotIndex, -1)}
                                        onSwapRight={() => handleSwap(slotIndex, 1)}
                                        masterVolume={masterVolume}
                                        isMasterMuted={isMasterMuted}
                                        masterPlaybackRate={masterPlaybackRate}
                                        rotation={(itemRotations[file.path] || 0) + globalRotation}
                                        isHero={isHeroGrid && (is3x3Hero ? i === 4 : i === 1)}
                                        nextFile={nextFile}
                                        isPinned={isPinned}
                                        onTogglePin={() => togglePin(slotIndex, file)}
                                        isFavorite={favoriteItems && favoriteItems.includes(file.path)}
                                        onToggleFavorite={() => toggleFavorite(file.path)}
                                        onRemove={() => {
                                            toggleItemExclusion(file.path);
                                            if (isPinned) unpinItem(slotIndex);
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Bubble Pagination Overlay */}
                    {totalPages > 1 && !slideshowActive && (
                        <div 
                            className="absolute bottom-0 inset-x-0 h-24 flex items-end justify-center pb-6 z-50"
                            onMouseEnter={() => handlePaginationHover(true)}
                            onMouseLeave={() => handlePaginationHover(false)}
                        >
                            <div 
                                className={clsx(
                                    "flex items-center gap-1 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 transition-all duration-500 max-w-[80vw] sm:max-w-[400px] w-full touch-none shadow-2xl overflow-hidden",
                                    (showJumpButtons || showPagination) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                                )}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                            >
                                {Array.from({ length: Math.min(totalPages, 50) }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        data-index={idx}
                                        onClick={() => {
                                            if (!isScrubbingRef.current) {
                                                useMediaStore.getState().setCurrentFileIndex(idx * itemsToShow);
                                                setGridOffsets({});
                                            }
                                        }}
                                        className={clsx(
                                            "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                                            idx === currentPage 
                                                ? "flex-[2.5] bg-[var(--accent-primary)] shadow-[0_0_12px_var(--accent-primary)]" 
                                                : "flex-1 bg-white/20 hover:bg-white/60 hover:flex-[1.5]"
                                        )}
                                        title={`Page ${idx + 1}`}
                                    />
                                ))}
                                {totalPages > 50 && <span className="text-[10px] text-white/50 ml-1 font-bold flex-shrink-0">...</span>}
                            </div>
                        </div>
                    )}
                </div>

                {!slideshowActive && (
                    <StandardControlPanel
                        onPlayAll={playAll} onPauseAll={pauseAll} onStopAll={stopAll} onRandomizeAll={randomizeAll} onSkipAll={skipAll}
                        onRandomizeGrid={randomizeGrid}
                        masterVolume={masterVolume} setMasterVolume={setMasterVolume} isMasterMuted={isMasterMuted} setIsMasterMuted={setIsMasterMuted}
                        isPlaying={isPlaying}
                    />
                )}
            </div>
        </VideoRegistryContext.Provider>
    );
};

export default CenterView;
