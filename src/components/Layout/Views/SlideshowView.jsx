import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useMediaStore from '../../../stores/useMediaStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from '../../VideoPlayer';
import SlideshowOverlay from '../SlideshowOverlay';
import ControlPanel from '../ControlPanel';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { VideoRegistryContext } from '../../../contexts/VideoRegistryContext.js';
import { getMediaUrl } from '../../../utils/mediaUrl';

const TRANSITION_VARIANTS = {
    none: {},
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: "linear" }
    },
    slide: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 }
    },
    zoom: {
        initial: { scale: 0.95, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.05, opacity: 0 },
        transition: { duration: 0.3 }
    },
    swipe: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 }
    }
};

const SlideshowView = () => {
    const {
        processedFiles: files, currentFileIndex, nextFile, prevFile, skipGroup,
        slideshowActive, slideshowDuration, slideshowTransition,
        slideshowRandom, triggerRandomStart,
        masterVolume, isMasterMuted, masterPlaybackRate,
        setMasterVolume, setIsMasterMuted,
        setAppViewMode, previousViewMode,
        slideshowIdle,
        gridColumns, gridRows,
        setCurrentFileIndex,
        setSlideshowDuration,
        mediaFitMode,
        globalIsPlaying, setGlobalIsPlaying,
        slideshowAutoAdvance, setSlideshowAutoAdvance
    } = useMediaStore();

    // Bind global play state
    const isPlaying = globalIsPlaying;
    const setIsPlaying = setGlobalIsPlaying;

    const gridSize = (gridColumns || 1) * (gridRows || 1);

    // Video Registry for Random Start
    const videoRegistryRef = useRef(new Map());
    const registerVideo = useCallback((v, id) => {
        if (v) videoRegistryRef.current.set(id, v);
    }, []);
    const unregisterVideo = useCallback((id, v) => {
        const current = videoRegistryRef.current.get(id);
        if (current === v) videoRegistryRef.current.delete(id);
    }, []);

    // Context Value
    const registryContextValue = useMemo(() => ({
        register: registerVideo,
        unregister: unregisterVideo,
        videos: {} // Not used directly
    }), [registerVideo, unregisterVideo]);

    const handleRandomizeAll = () => {
        videoRegistryRef.current.forEach(v => {
            if (v && v.duration) {
                v.currentTime = Math.random() * v.duration;
            }
        });
    };

    // Continuous Flow: Calculate visible files as a rolling window
    // [0, 1, 2] -> [1, 2, 3] -> [2, 3, 4]
    const visibleFiles = useMemo(() => {
        if (!files || files.length === 0) return [];
        const pageFiles = [];

        // Handle case where currentFileIndex is -1 (not started yet)
        const baseIndex = currentFileIndex < 0 ? 0 : currentFileIndex;

        for (let i = 0; i < gridSize; i++) {
            // Safe modulo for wrapping
            const index = (baseIndex + i) % files.length;

            if (files[index]) {
                pageFiles.push({
                    file: files[index],
                    key: files[index].path // STABLE KEY
                });
            }
        }
        return pageFiles;
    }, [files, currentFileIndex, gridSize]);

    // Timer: Continuous Advance (Next File) - Robust Ref Pattern
    const advanceRef = useRef();

    useEffect(() => {
        advanceRef.current = () => {
            useMediaStore.getState().nextFile();
        };
    });

    useEffect(() => {
        if (!slideshowAutoAdvance) return;

        const durationMs = (slideshowDuration || 5) * 1000;

        const id = setInterval(() => {
            if (advanceRef.current) advanceRef.current();
        }, durationMs);

        return () => clearInterval(id);
    }, [slideshowAutoAdvance, slideshowDuration]);

    // Idle Timer Logic
    useEffect(() => {
        let timeout;
        const resetIdle = () => {
            useMediaStore.setState({ slideshowIdle: false });
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                useMediaStore.setState({ slideshowIdle: true });
            }, 3000);
        };

        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('keydown', resetIdle);
        resetIdle();

        return () => {
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('keydown', resetIdle);
            clearTimeout(timeout);
        };
    }, []);

    // === Mouse wheel volume HUD (must be before early return) ===
    const [volumeHudVisible, setVolumeHudVisible] = useState(false);
    const volumeHudTimeoutRef = useRef(null);

    const showVolumeHud = useCallback(() => {
        setVolumeHudVisible(true);
        if (volumeHudTimeoutRef.current) clearTimeout(volumeHudTimeoutRef.current);
        volumeHudTimeoutRef.current = setTimeout(() => setVolumeHudVisible(false), 1200);
    }, []);

    if (!files || files.length === 0) return <div className="h-full w-full bg-black flex items-center justify-center text-white/20">No media</div>;

    // Transition for Layout Animations
    // We remove the container variant to allow individual items to animate position

    const handleStopAll = () => {
        setIsPlaying(false);
        setSlideshowAutoAdvance(false);
        // Do NOT reset currentFileIndex(0) - User requested only stopping playback
        videoRegistryRef.current.forEach(v => {
            if (v) {
                v.pause();
                v.currentTime = 0;
            }
        });
    };

    return (
        <VideoRegistryContext.Provider value={registryContextValue}>
            <div className="h-full w-full bg-black relative overflow-hidden group">

                {/* Floating Volume HUD — Top Right Vertical Bar */}
                <AnimatePresence>
                    {volumeHudVisible && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="absolute top-6 right-6 z-[100] bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-4 flex flex-col items-center gap-3 shadow-2xl pointer-events-none"
                        >
                            {isMasterMuted || masterVolume === 0
                                ? <VolumeX size={16} className="text-white/60" />
                                : <Volume2 size={16} className="text-white/60" />
                            }
                            <div className="w-1.5 h-28 bg-white/10 rounded-full overflow-hidden flex flex-col-reverse">
                                <div
                                    className="w-full bg-[var(--accent-primary)] rounded-full transition-all duration-100 ease-out"
                                    style={{ height: `${Math.round(masterVolume * 100)}%` }}
                                />
                            </div>
                            <span className="text-white/80 text-[10px] font-mono font-bold">
                                {Math.round(masterVolume * 100)}%
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grid Container with wheel volume control */}
                <div
                    className="absolute inset-0 p-4 grid gap-4 transition-all"
                    style={{
                        gridTemplateColumns: `repeat(${gridColumns || 1}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${gridRows || 1}, minmax(0, 1fr))`
                    }}
                    onWheel={(e) => {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 0.01 : -0.01;
                        const rawVol = masterVolume + delta;
                        const newVol = Math.max(0, Math.min(1, Math.round(rawVol * 1000) / 1000));
                        setMasterVolume(newVol);
                        setIsMasterMuted(newVol <= 0);
                        showVolumeHud();
                    }}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {visibleFiles.map(({ file, key }, i) => {
                            if (!file) return null;
                            return (
                                <motion.div
                                    key={key} // Stable key preserves component instance + state
                                    {...TRANSITION_VARIANTS[slideshowTransition] || TRANSITION_VARIANTS.fade}
                                    className="relative w-full h-full overflow-hidden rounded-xl bg-white/5 border border-white/10 shadow-lg"
                                >
                                    <SlideItem
                                        file={file}
                                        masterVolume={masterVolume}
                                        isMasterMuted={isMasterMuted}
                                        masterPlaybackRate={masterPlaybackRate}
                                        isActive={true}
                                        slotIndex={i} // Used for registry ID
                                        hideControls={true}
                                        forcePlay={isPlaying} // Pause/Play
                                        mediaFitMode={mediaFitMode}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Global Controls - Centered & Auto-Hiding */}
                <div className={clsx(
                    "absolute bottom-8 left-1/2 -translate-x-1/2 z-[70] transition-all duration-500",
                    slideshowIdle ? "opacity-0 translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"
                )}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/80 backdrop-blur-md">
                        <ControlPanel
                            compact={true}
                            onPlayAll={() => setIsPlaying(true)}
                            onPauseAll={() => setIsPlaying(false)}
                            onStopAll={handleStopAll}
                            onRandomizeAll={handleRandomizeAll}
                            onSkipAll={(val) => { /* implementation needed if we want skip support */ }}
                            masterVolume={masterVolume}
                            setMasterVolume={(v) => useMediaStore.setState({ masterVolume: v })}
                            isMasterMuted={isMasterMuted}
                            setIsMasterMuted={(m) => useMediaStore.setState({ isMasterMuted: m })}
                            onRandomizeGrid={() => { /* Grid randomization driven by store? */ }}
                            isPlaying={isPlaying}
                            // New Props
                            slideshowDuration={slideshowDuration}
                            setSlideshowDuration={setSlideshowDuration}
                            isAutoAdvance={slideshowAutoAdvance}
                            setIsAutoAdvance={setSlideshowAutoAdvance}
                        />
                    </div>
                </div>
            </div>
        </VideoRegistryContext.Provider>
    );
};

const SlideItem = ({ file, masterVolume, isMasterMuted, masterPlaybackRate, isActive, hideControls, forcePlay, slotIndex, mediaFitMode }) => {
    const isVideo = file.type === 'video';
    const [url, setUrl] = useState(null);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        let active = true;
        if (file?.handle) {
            getMediaUrl(file).then(u => { if (active) setUrl(u); });
        }
        return () => { active = false; };
    }, [file]);

    if (!url) return <div className="w-full h-full flex items-center justify-center"><RefreshCw className="animate-spin text-white/20" /></div>;

    // File info tooltip overlay
    const InfoTooltip = () => (
        <div className={clsx(
            "absolute top-2 left-2 max-w-[80%] z-[60] bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10 transition-all duration-200 pointer-events-none",
            isHovering ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
            <p className="text-[11px] font-bold text-white truncate">{file.name}</p>
            <p className="text-[9px] text-white/50 truncate mt-0.5">{file.folderPath || file.path}</p>
        </div>
    );

    if (isVideo) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black relative"
                 onMouseEnter={() => setIsHovering(true)}
                 onMouseLeave={() => setIsHovering(false)}
            >
                <InfoTooltip />
                <VideoPlayer
                    file={file}
                    fileUrl={url}
                    isActive={isActive}
                    masterVolume={isMasterMuted ? 0 : masterVolume}
                    masterPlaybackRate={masterPlaybackRate}
                    forcePlay={forcePlay}
                    slotIndex={slotIndex}
                    hideControls={hideControls}
                    mediaFitMode={mediaFitMode}
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full relative"
             onMouseEnter={() => setIsHovering(true)}
             onMouseLeave={() => setIsHovering(false)}
        >
            <InfoTooltip />
            <img
                src={url}
                alt={file.name}
                className={clsx("w-full h-full transition-all duration-700", mediaFitMode === 'cover' ? 'object-cover' : 'object-contain')}
                style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
            />
        </div>
    );
};

export default SlideshowView;
