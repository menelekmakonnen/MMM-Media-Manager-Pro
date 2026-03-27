import React, { useRef, useState, useEffect, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import {
    Play, Pause, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, Columns, Rows, Square,
    Volume2, VolumeX, Shuffle, RefreshCw,
    LayoutGrid, Grid3X3, Columns3, Grid2X2,
    RotateCw, ZoomIn, EyeOff, Film, ArrowLeftRight,
    Gauge, ArrowUp, ArrowDown, Pin, Star, X
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
    const [url, setUrl] = useState(null);
    const videoPlayerRef = useRef(null);

    const handleContextMenu = (e) => {
        e.preventDefault();
        const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
        useMediaStore.getState().setMediaContextMenu({ x: e.clientX, y: e.clientY, file, currentTime });
    };

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
