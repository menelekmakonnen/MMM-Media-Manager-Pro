import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useMediaStore from '../../../stores/useMediaStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from '../../VideoPlayer';
import SlideshowOverlay from '../SlideshowOverlay';
import ControlPanel from '../ControlPanel';
import { globalURLCache } from '../../../utils/urlCache';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, EyeOff } from 'lucide-react';
import { VideoRegistryContext } from '../../../contexts/VideoRegistryContext.js';

const TRANSITION_VARIANTS = {
    none: {},
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.8, ease: "linear" }
    },
    slide: {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '-100%' },
        transition: { type: 'spring', damping: 30, stiffness: 200 }
    },
    zoom: {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 1.2, opacity: 0 },
        transition: { duration: 0.8 }
    },
    swipe: {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '-20%', opacity: 0 },
        transition: { duration: 0.5 }
    }
};

const SlideshowView = () => {
    const {
        processedFiles: files, currentFileIndex, nextFile, prevFile, skipGroup,
        slideshowActive, slideshowDuration, slideshowTransition,
        slideshowRandom, triggerRandomStart,
        masterVolume, isMasterMuted, masterPlaybackRate,
        setAppViewMode, previousViewMode,
        slideshowIdle,
        gridColumns, gridRows,
        setCurrentFileIndex,
        setSlideshowDuration
    } = useMediaStore();

    const [isPlaying, setIsPlaying] = useState(true); // Global Play (Video)
    const [isAutoAdvance, setIsAutoAdvance] = useState(true); // Duration Timer

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
            // console.log('[Slideshow] Auto-Advance Triggered');
            useMediaStore.getState().nextFile();
        };
    });

    useEffect(() => {
        if (!isAutoAdvance) return;

        const durationMs = (slideshowDuration || 5) * 1000;
        // console.log(`[Slideshow] Interval set for ${durationMs}ms`);

        const id = setInterval(() => {
            if (advanceRef.current) advanceRef.current();
        }, durationMs);

        return () => clearInterval(id);
    }, [isAutoAdvance, slideshowDuration]);

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

    if (!files || files.length === 0) return <div className="h-full w-full bg-black flex items-center justify-center text-white/20">No media</div>;

    // Transition for Layout Animations
    // We remove the container variant to allow individual items to animate position

    const handleStopAll = () => {
        setIsPlaying(false);
        setIsAutoAdvance(false);
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

                {/* Grid Container */}
                <div
                    className="absolute inset-0 p-4 grid gap-4 transition-all"
                    style={{
                        gridTemplateColumns: `repeat(${gridColumns || 1}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${gridRows || 1}, minmax(0, 1fr))`
                    }}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {visibleFiles.map(({ file, key }, i) => {
                            if (!file) return null;
                            return (
                                <motion.div
                                    layout // Animated layout changes
                                    key={key} // Stable key preserves component instance + state
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }} // Fade out when leaving grid (slot 0 -> gone)
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
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
                            isAutoAdvance={isAutoAdvance}
                            setIsAutoAdvance={setIsAutoAdvance}
                        />
                    </div>
                </div>
            </div>
        </VideoRegistryContext.Provider>
    );
};

const SlideItem = ({ file, masterVolume, isMasterMuted, masterPlaybackRate, isActive, hideControls, forcePlay, slotIndex }) => {
    const [url, setUrl] = useState(null);
    const isVideo = file.type === 'video';

    // We must use a unique ID for the registry that is stable for the FILE, not the SLOT, 
    // because as the video moves slots, we want it to stay registered or re-register properly.
    // VideoPlayer uses `slotIndex` as the key.
    // If we pass a changing slotIndex, it might unregister/register.
    // Actually, `visibleFiles.map((..., i)` passes `i`.
    // As items shift: File A is index 0. Then vanishes. File B is index 1 -> becomes index 0.
    // VideoPlayer receives new slotIndex 0.
    // It will unregister(1) and register(0).
    // This is fine, provided the ref map handles it. 
    // BUT we want to keep playing.
    // `VideoPlayer` component is preserved due to key.
    // `useEffect` for registry has `[slotIndex]`. It will run again.
    // It will register the *same* video element to the *new* slot index.
    // Is that okay? 
    // Yes, handles playAll/pauseAll iterate over values. 
    // Values are the video elements.
    // As long as the video element is in the map, `playAll` works.

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!globalURLCache) {
                console.error("Global URL Cache is missing!");
                return;
            }
            const objectUrl = await globalURLCache.getObjectURL(file);
            if (active) setUrl(objectUrl);
        };
        load();
        return () => { active = false; };
    }, [file]);

    if (!url) return <div className="w-full h-full flex items-center justify-center"><RefreshCw className="animate-spin text-white/20" /></div>;

    if (isVideo) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <VideoPlayer
                    file={file}
                    fileUrl={url}
                    isActive={isActive}
                    masterVolume={isMasterMuted ? 0 : masterVolume}
                    masterPlaybackRate={masterPlaybackRate}
                    forcePlay={forcePlay}
                    slotIndex={slotIndex} // This changes as it moves
                    hideControls={hideControls}
                />
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={file.name}
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
        />
    );
};

export default SlideshowView;
