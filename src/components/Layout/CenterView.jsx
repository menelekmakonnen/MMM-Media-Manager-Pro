import React, { useRef, useState, useEffect, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import {
    Play, Pause, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, Columns, Rows, Square,
    Volume2, VolumeX, Shuffle, RefreshCw,
    LayoutGrid, Grid3X3, Columns3, Grid2X2,
    RotateCw, ZoomIn, EyeOff, Film, ArrowLeftRight,
    Gauge, ArrowUp, ArrowDown
} from 'lucide-react';
import VideoPlayer from '../VideoPlayer';
import { VideoRegistryContext } from '../../contexts/VideoRegistryContext.js';
import { motion, AnimatePresence } from 'framer-motion';
import SlideshowOverlay from './SlideshowOverlay';
import ControlPanel from './ControlPanel';

const TRANSITION_VARIANTS = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.4 }
    },
    slide: {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '-100%' },
        transition: { duration: 0.3, ease: "circOut" }
    },
    swipe: {
        initial: { x: '100%', opacity: 1 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 1 },
        transition: { duration: 0.3, ease: "circOut" }
    },
    zoom: {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.4 }
    },
    flip: {
        initial: { rotateY: 90, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        exit: { rotateY: -90, opacity: 0 },
        transition: { duration: 0.6 }
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
                        "w-full h-full object-contain pointer-events-none",
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

const MediaItem = ({ file, isActive, grayscaleInactive, zoomMode, widescreen, onClick, onRandomVideo, masterVolume, isMasterMuted, masterPlaybackRate, rotation, isHero, nextFile, onRotate, onSwapLeft, onSwapRight, slotIndex }) => {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        let objectUrl = null;
        let active = true;

        const loadFile = async () => {
            if (!file?.handle) return;
            try {
                const fileObj = await file.handle.getFile();
                if (!active) return;
                objectUrl = URL.createObjectURL(fileObj);
                setUrl(objectUrl);
            } catch (err) {
                console.error("Failed to load file for media item:", err);
            }
        };

        loadFile();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };
    }, [file]);

    if (!file) return <div className="bg-white/5 h-full w-full animate-pulse rounded-2xl" />;
    const isVideo = file.type === 'video';

    return (
        <div
            className={clsx(
                "relative bg-black h-full w-full overflow-hidden transition-all duration-500 group/video shadow-2xl border border-white/5",
                isHero ? "rounded-3xl z-10 scale-[1.01]" : "rounded-2xl opacity-90 hover:opacity-100 hover:scale-[1.02] z-0",
                "hover:border-white/20",
                grayscaleInactive && !isActive && "grayscale hover:grayscale-0 transition-[filter]"
            )}
            onClick={onClick}
        >
            {isVideo && url ? (
                <div className="w-full h-full relative">
                    <div className="relative w-full h-full group/controls">
                        <VideoPlayer
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

            {/* Swap Controls (Top Left) */}
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover/video:opacity-100 transition-opacity z-40 bg-black/60 rounded-lg p-1">
                <button onClick={(e) => { e.stopPropagation(); onSwapLeft(); }} className="p-1 hover:text-white text-gray-400"><ArrowLeftRight size={14} className="rotate-180" /></button>
                <button onClick={(e) => { e.stopPropagation(); onSwapRight(); }} className="p-1 hover:text-white text-gray-400"><ArrowLeftRight size={14} /></button>
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



const CenterView = () => {
    const {
        currentFileIndex, setCurrentFileIndex,
        gridColumns, gridRows, threeGridEqual,
        grayscaleInactive, zoomMode, widescreen,
        nextFile,
        getSortedFiles,
        masterPlaybackRate, itemRotations, globalRotation, rotateItem,
        slideshowActive, slideshowDuration, slideshowTransition, superSlideshowActive,
        nineGridHero, currentFolder
    } = useMediaStore();

    const sortedFiles = getSortedFiles();

    // DEBUG: Trace Navigation State
    useEffect(() => {
        console.log('[CenterView] Folder Change Detected:', { currentFolder, fileCount: sortedFiles.length });
    }, [currentFolder, sortedFiles.length]);

    const videoRegistryRef = useRef(new Map());
    const [masterVolume, setMasterVolume] = useState(0.5);
    const [isMasterMuted, setIsMasterMuted] = useState(false);
    const [gridOffsets, setGridOffsets] = useState({});
    const [isPlaying, setIsPlaying] = useState(false);

    // Reset state when folder changes
    useEffect(() => {
        setGridOffsets({});
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
    }, [slideshowActive, slideshowDuration, nextFile, superSlideshowActive]);

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

    const cols = gridColumns;
    const rows = gridRows;
    const itemsToShow = cols * rows;
    const baseIndex = currentFileIndex < 0 ? 0 : currentFileIndex % Math.max(1, sortedFiles.length);

    const renderFiles = [];
    if (sortedFiles.length > 0) {
        for (let i = 0; i < itemsToShow; i++) {
            let index = (baseIndex + i);
            if (gridOffsets[i]) index += gridOffsets[i];
            const wrappedIndex = (index % sortedFiles.length + sortedFiles.length) % sortedFiles.length;
            if (sortedFiles[wrappedIndex]) renderFiles.push({
                file: sortedFiles[wrappedIndex],
                originalIndex: wrappedIndex,
                slotIndex: i,
                key: sortedFiles[wrappedIndex].path // STABLE KEY for seamless moved playback
            });
        }
    }

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
                    <div key={currentFolder} className="h-full w-full grid gap-2 transition-all duration-300" style={gridStyle}>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {renderFiles.map(({ file, originalIndex, slotIndex, key }, i) => (
                                <motion.div
                                    key={key}
                                    layout
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
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {!slideshowActive && (
                    <ControlPanel
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
