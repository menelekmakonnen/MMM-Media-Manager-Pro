import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { useProjectStore } from '../../stores/projectStore';
import { useClipStore } from '../../stores/clipStore';
import { useViewStore } from '../../stores/editorViewStore';
import { generateTrailerSequence, extractBeatTimestamps } from '../../utils/editorUtils/trailerGenerator';
import { DEFAULT_FPS } from '../../utils/editorUtils/time';
import { Wand2, RefreshCw, Settings2, Film, Play, Pause, ChevronLeft, Volume2, VolumeX, Maximize, Minimize, Square, Shuffle, Dna } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export const TrailerView = () => {
    // Stores
    const { 
        setAppViewMode, previousViewMode, setTrailerModalOpen, trailerSettings,
        explorerSelectedFiles, getSortedFiles, files,
        masterVolume, setMasterVolume
    } = useMediaStore();
    const { addEdit } = useProjectStore();
    const { setClips, nukeLibrary } = useClipStore();
    const { setActiveTab } = useViewStore();

    // Core state
    const [draftSequence, setDraftSequence] = useState([]);
    const [currentClipIndex, setCurrentClipIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isGenerating, setIsGenerating] = useState(true);
    
    // Player settings state
    const [speed, setSpeed] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    
    // Refs
    const containerRef = useRef(null);
    const videoARef = useRef(null);
    const videoBRef = useRef(null);
    const activeVideoRef = useRef('A');
    const audioPlayerRef = useRef(null); // Trailer audio guide

    // Scrubber state
    const [globalProgress, setGlobalProgress] = useState(0); // 0 to 1
    const rafRef = useRef(null);

    // Build pool
    const pool = useMemo(() => {
        let p = getSortedFiles();
        if (explorerSelectedFiles.size > 0) {
            p = p.filter(f => explorerSelectedFiles.has(f.path));
        }
        return p;
    }, [explorerSelectedFiles, files]);

    // Randomize entire pool (Flux All)    // Generator
    const generateDraft = async () => {
        setIsGenerating(true);
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setGlobalProgress(0);
        
        // If audio guided, extract beats first
        let beatTimestamps = null;
        if (trailerSettings.useAudioGuide && trailerSettings.audioUrl) {
            beatTimestamps = await extractBeatTimestamps(
                trailerSettings.audioUrl,
                trailerSettings.audioTrimStart || 0,
                trailerSettings.audioTrimEnd || trailerSettings.targetDuration
            );
        }

        setTimeout(() => {
            const seq = generateTrailerSequence(pool, { ...trailerSettings, beatTimestamps });
            let accumulated = 0;
            const embellishedSeq = seq.map(clip => {
                const duration = (clip.trimEndFrame - clip.trimStartFrame) / DEFAULT_FPS;
                const c = { ...clip, globalStart: accumulated, globalEnd: accumulated + duration, localDuration: duration };
                accumulated += duration;
                return c;
            });
            embellishedSeq.totalDuration = accumulated;

            setDraftSequence(embellishedSeq);
            setIsGenerating(false);
            if (embellishedSeq.length > 0) setIsPlaying(true);
        }, 300);
    };

    const handleShuffleOrder = () => {
        if (isGenerating || draftSequence.length === 0) return;
        setIsGenerating(true);
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setGlobalProgress(0);
        setTimeout(() => {
            const shuffled = [...draftSequence];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            let accumulated = 0;
            const embellishedSeq = shuffled.map(clip => {
                const c = { ...clip, globalStart: accumulated, globalEnd: accumulated + clip.localDuration };
                accumulated += clip.localDuration;
                return c;
            });
            embellishedSeq.totalDuration = accumulated;
            setDraftSequence(embellishedSeq);
            setIsGenerating(false);
            if (embellishedSeq.length > 0) setIsPlaying(true);
        }, 300);
    };

    const handleRandomizeTrims = () => {
        if (isGenerating || draftSequence.length === 0) return;
        setIsGenerating(true);
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setGlobalProgress(0);
        setTimeout(() => {
            const uniquePaths = new Set(draftSequence.map(c => c.path));
            const uniquePool = files.filter(f => uniquePaths.has(f.path));
            const seq = generateTrailerSequence(uniquePool, trailerSettings);
            
            let accumulated = 0;
            const embellishedSeq = seq.map(clip => {
                const duration = (clip.trimEndFrame - clip.trimStartFrame) / DEFAULT_FPS;
                const c = { ...clip, globalStart: accumulated, globalEnd: accumulated + duration, localDuration: duration };
                accumulated += duration;
                return c;
            });
            embellishedSeq.totalDuration = accumulated;
            setDraftSequence(embellishedSeq);
            setIsGenerating(false);
            if (embellishedSeq.length > 0) setIsPlaying(true);
        }, 300);
    };

    useEffect(() => {
        if (draftSequence.length === 0) generateDraft();
    }, [trailerSettings]);

    // Stable URL Cache Architecture
    const [fileUrlCache, setFileUrlCache] = useState({});

    const getFileObject = useCallback(async (path) => {
        const matchedFile = files.find(f => f.path === path);
        if (matchedFile && matchedFile.handle) return await matchedFile.handle.getFile();
        return null;
    }, [files]);

    // Preloader effect: load ObjectURLs by specific clip ID so they persist across A/B toggles
    useEffect(() => {
        if (draftSequence.length === 0 || isGenerating) return;

        const currentClip = draftSequence[currentClipIndex];
        const nextClip = draftSequence[(currentClipIndex + 1) % draftSequence.length];

        let active = true;

        const ensureUrl = async (clip) => {
            if (!clip || clip.type !== 'video') return;
            if (fileUrlCache[clip.id]) return;
            try {
                const fileObj = clip.fileHandle ? await clip.fileHandle.getFile() : await getFileObject(clip.path);
                if (fileObj && active) {
                    const url = URL.createObjectURL(fileObj);
                    setFileUrlCache(prev => ({ ...prev, [clip.id]: url }));
                }
            } catch (e) { console.warn(e); }
        };

        ensureUrl(currentClip);
        ensureUrl(nextClip);

        return () => { active = false; };
    }, [currentClipIndex, draftSequence, isGenerating, getFileObject, fileUrlCache]);

    // Cleanup obsolete URLs
    useEffect(() => {
        if (draftSequence.length === 0) return;
        const currentClip = draftSequence[currentClipIndex];
        const nextClip = draftSequence[(currentClipIndex + 1) % draftSequence.length];
        const neededIds = [currentClip?.id, nextClip?.id].filter(Boolean);
        
        setFileUrlCache(prev => {
            let changed = false;
            const nextCache = { ...prev };
            for (const key of Object.keys(nextCache)) {
                if (!neededIds.includes(key)) {
                    URL.revokeObjectURL(nextCache[key]);
                    delete nextCache[key];
                    changed = true;
                }
            }
            return changed ? nextCache : prev;
        });
    }, [currentClipIndex, draftSequence]);

    const isActA = activeVideoRef.current === 'A';
    const activeClip = draftSequence[currentClipIndex] || null;
    const nextClip = draftSequence[(currentClipIndex + 1) % draftSequence.length] || null;

    const clipA = isActA ? activeClip : nextClip;
    const clipB = isActA ? nextClip : activeClip;

    const urlCacheA = clipA ? fileUrlCache[clipA.id] : '';
    const urlCacheB = clipB ? fileUrlCache[clipB.id] : '';


    // Animation Loop for Gapless Playback
    useEffect(() => {
        if (!isPlaying || isGenerating || draftSequence.length === 0) {
            cancelAnimationFrame(rafRef.current);
            return;
        }

        const loop = () => {
            const currentClip = draftSequence[currentClipIndex];
            const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
            
            if (activeVid && currentClip && currentClip.type === 'video') {
                const endSeconds = (currentClip.trimEndFrame || 0) / DEFAULT_FPS;
                if (activeVid.currentTime >= endSeconds || activeVid.ended) {
                    // FLIP!
                    handleClipEnd();
                } else {
                    // Update global progress
                    const globalTime = currentClip.globalStart + Math.max(0, activeVid.currentTime - ((currentClip.trimStartFrame || 0) / DEFAULT_FPS));
                    onGlobalProgress(globalTime / draftSequence.totalDuration);
                }
            }
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, isGenerating, currentClipIndex, draftSequence]);

    const onGlobalProgress = useCallback((percent) => {
        setGlobalProgress(percent);
    }, []);

    const handleClipEnd = useCallback(() => {
        const nextIndex = (currentClipIndex + 1) % draftSequence.length;
        // Flip refs
        activeVideoRef.current = activeVideoRef.current === 'A' ? 'B' : 'A';
        setCurrentClipIndex(nextIndex);
    }, [currentClipIndex, draftSequence]);

    // Handle initial seek & play when clip index changes
    // KEY FIX FOR 0ms FLASH: We ALSO pre-seek the BACKGROUND (hidden) video
    // so it is already painted to the correct frame before it flips to visible.
    useEffect(() => {
        if (isGenerating || draftSequence.length === 0) return;
        const currentClip = draftSequence[currentClipIndex];
        const nextClipIndex = (currentClipIndex + 1) % draftSequence.length;
        const nextClip = draftSequence[nextClipIndex];
        
        const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
        const bgVid = activeVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
        const targetUrl = activeVideoRef.current === 'A' ? urlCacheA : urlCacheB;
        
        if (!targetUrl) return;

        if (activeVid && currentClip && currentClip.type === 'video') {
            const clipSpeed = currentClip.speed || speed;
            const clipMuted = currentClip.isMuted || isMuted;
            const clipVol = currentClip.volume !== undefined ? currentClip.volume / 100 : 1;

            const doPlay = () => {
                let startSeconds = (currentClip.trimStartFrame || 0) / DEFAULT_FPS;
                let endSeconds = (currentClip.trimEndFrame || 0) / DEFAULT_FPS;
                const len = endSeconds - startSeconds;
                
                const actualDuration = activeVid.duration;
                if (actualDuration && actualDuration !== Infinity) {
                    let maxStart = actualDuration - len;
                    if (maxStart < 0) maxStart = 0;
                    if (startSeconds > maxStart) {
                        startSeconds = Math.random() * maxStart;
                        currentClip.trimStartFrame = startSeconds * DEFAULT_FPS;
                        currentClip.trimEndFrame = (startSeconds + len) * DEFAULT_FPS;
                    }
                }

                if (activeVid.currentTime < startSeconds - 0.1 || activeVid.currentTime > endSeconds + 0.1) {
                   activeVid.currentTime = startSeconds;
                }
                activeVid.volume = clipMuted ? 0 : (masterVolume * clipVol);
                activeVid.playbackRate = clipSpeed;
                if (isPlaying) activeVid.play().catch(() => {});
                else activeVid.pause();
            };

            if (activeVid.readyState >= 1) {
                doPlay();
            } else {
                activeVid.onloadedmetadata = () => {
                    doPlay();
                    activeVid.onloadedmetadata = null;
                };
            }
        }

        // PRE-SEEK BACKGROUND VIDEO while it is still hidden
        // so the first frame is already painted when it flips to active.
        if (bgVid && nextClip && nextClip.type === 'video') {
            const bgUrl = activeVideoRef.current === 'A' ? urlCacheB : urlCacheA;
            if (bgUrl) {
                const preSeek = () => {
                    const bgStart = (nextClip.trimStartFrame || 0) / DEFAULT_FPS;
                    const actualBgDuration = bgVid.duration;
                    let safeStart = bgStart;
                    if (actualBgDuration && actualBgDuration !== Infinity) {
                        const bgLen = ((nextClip.trimEndFrame || 0) - (nextClip.trimStartFrame || 0)) / DEFAULT_FPS;
                        const maxBgStart = Math.max(0, actualBgDuration - bgLen);
                        if (safeStart > maxBgStart) {
                            safeStart = Math.random() * maxBgStart;
                            // Preemptively correct the clip trim so they aren't rerolled later and cause flashes
                            nextClip.trimStartFrame = safeStart * DEFAULT_FPS;
                            nextClip.trimEndFrame = (safeStart + bgLen) * DEFAULT_FPS;
                        }
                    }
                    bgVid.currentTime = safeStart;
                    bgVid.volume = 0; // Keep silent until it flips
                    bgVid.pause(); // Ensure browser doesn't try to play it
                };
                if (bgVid.readyState >= 1) preSeek();
                else bgVid.onloadedmetadata = () => { preSeek(); bgVid.onloadedmetadata = null; };
            }
        }
    }, [currentClipIndex, isPlaying, isGenerating, draftSequence]); // Removed volume, isMuted, speed to prevent looping

    // Separate effect for volume/speed/mute changes mid-playback
    useEffect(() => {
        const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
        const currentClip = draftSequence[currentClipIndex];
        if (activeVid && currentClip) {
            const clipSpeed = currentClip.speed || speed;
            const clipMuted = currentClip.isMuted || isMuted;
            const clipVol = currentClip.volume !== undefined ? currentClip.volume / 100 : 1;
            
            activeVid.volume = clipMuted ? 0 : (masterVolume * clipVol);
            activeVid.playbackRate = clipSpeed;
        }
    }, [isMuted, speed, masterVolume, currentClipIndex, draftSequence]);

    // Audio guide synchronization
    useEffect(() => {
        const audio = audioPlayerRef.current;
        if (!audio) return;
        if (trailerSettings.useAudioGuide && trailerSettings.audioUrl) {
            audio.src = trailerSettings.audioUrl;
        } else {
            audio.src = '';
        }
    }, [trailerSettings.audioUrl, trailerSettings.useAudioGuide]);

    useEffect(() => {
        const audio = audioPlayerRef.current;
        if (!audio || !trailerSettings.useAudioGuide) return;
        if (isPlaying && !isGenerating) {
            audio.volume = isMuted ? 0 : Math.min(masterVolume, 1);
            if (audio.paused) {
                const startOffset = trailerSettings.audioTrimStart || 0;
                audio.currentTime = startOffset + (globalProgress * (draftSequence.totalDuration || 0));
                audio.play().catch(() => {});
            }
        } else {
            audio.pause();
        }
    }, [isPlaying, isGenerating, globalProgress, trailerSettings, isMuted, masterVolume, draftSequence]);

    // Handle Play/Pause
    const togglePlay = (e) => {
        if(e) e.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    const handleStop = (e) => {
        if(e) e.stopPropagation();
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setGlobalProgress(0);
        const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
        if(activeVid) {
            const startSeconds = (draftSequence[0]?.trimStartFrame || 0) / DEFAULT_FPS;
            activeVid.currentTime = startSeconds;
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.warn(err));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Handle Scrubber Seek
    const handleScrub = (e) => {
        if (draftSequence.length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setGlobalProgress(percent);
        
        const targetGlobalTime = percent * draftSequence.totalDuration;

        // Find which clip this falls into
        let foundIndex = 0;
        for (let i = 0; i < draftSequence.length; i++) {
            if (targetGlobalTime >= draftSequence[i].globalStart && targetGlobalTime <= draftSequence[i].globalEnd) {
                foundIndex = i;
                break;
            }
        }

        const targetClip = draftSequence[foundIndex];
        const localOffset = targetGlobalTime - targetClip.globalStart;
        const targetLocalTime = ((targetClip.trimStartFrame || 0) / DEFAULT_FPS) + localOffset;

        // If index changes, we update the state and the effects handle the rest
        if (foundIndex !== currentClipIndex) {
            setCurrentClipIndex(foundIndex);
            // We need a tiny timeout so the new video has time to be set as the active ref before we seek it
            setTimeout(() => {
                const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
                if (activeVid) activeVid.currentTime = targetLocalTime;
            }, 0);
        } else {
            const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
            if (activeVid) {
                activeVid.currentTime = targetLocalTime;
                // Force progress update instantly so scrubber doesn't snap back a frame before raf loops
                setGlobalProgress(percent);
            }
        }

        // Sync audio track if active
        if (trailerSettings.useAudioGuide && audioPlayerRef.current) {
            const startOffset = trailerSettings.audioTrimStart || 0;
            audioPlayerRef.current.currentTime = startOffset + targetGlobalTime;
        }
    };

    // Export Logic
    const handleSaveToEditor = () => {
        const cleanSequence = draftSequence.map(({ globalStart, globalEnd, localDuration, ...clip }) => clip);
        const editId = uuidv4();

        let audioTracks = [];
        if (trailerSettings.useAudioGuide && trailerSettings.audioUrl) {
            const startSecs = trailerSettings.audioTrimStart || 0;
            const endSecs = trailerSettings.audioTrimEnd || 0;
            const targetSecs = trailerSettings.targetDuration;
            const segmentSecs = endSecs - startSecs;
            
            const baseAudio = {
                type: 'audio',
                path: trailerSettings.audioFile || 'audio-guide',
                filename: trailerSettings.audioFile || 'Audio Guide',
                audioUrl: trailerSettings.audioUrl,
                track: 101, speed: 1, volume: 100, reversed: false,
                isMuted: false, isPinned: false, origin: 'trailer-audio', locked: false
            };

            if (trailerSettings.matchAudioDuration || trailerSettings.audioTimelineStrategy === 'fade') {
                // One static clip that just dies
                audioTracks.push({
                    ...baseAudio,
                    id: uuidv4(),
                    startFrame: 0,
                    endFrame: Math.round(segmentSecs * DEFAULT_FPS),
                    sourceDurationFrames: Math.round(endSecs * DEFAULT_FPS),
                    trimStartFrame: Math.round(startSecs * DEFAULT_FPS),
                    trimEndFrame: Math.round(endSecs * DEFAULT_FPS)
                });
            } else if (trailerSettings.audioTimelineStrategy === 'continue') {
                // One clip that continues past the bracket until target duration
                const endCapSecs = startSecs + targetSecs;
                audioTracks.push({
                    ...baseAudio,
                    id: uuidv4(),
                    startFrame: 0,
                    endFrame: Math.round(targetSecs * DEFAULT_FPS),
                    sourceDurationFrames: Math.round(endCapSecs * DEFAULT_FPS),
                    trimStartFrame: Math.round(startSecs * DEFAULT_FPS),
                    trimEndFrame: Math.round(endCapSecs * DEFAULT_FPS)
                });
            } else if (trailerSettings.audioTimelineStrategy === 'loop') {
                // Mathematically drop looped instances back to back
                const targetFrames = Math.round(targetSecs * DEFAULT_FPS);
                const segmentFrames = Math.round(segmentSecs * DEFAULT_FPS);
                let currStart = 0;
                
                while (currStart < targetFrames) {
                    let framesLeft = targetFrames - currStart;
                    let clipFrames = Math.min(segmentFrames, framesLeft);
                    
                    audioTracks.push({
                        ...baseAudio,
                        id: uuidv4(),
                        startFrame: currStart,
                        endFrame: currStart + clipFrames,
                        sourceDurationFrames: Math.round(endSecs * DEFAULT_FPS),
                        trimStartFrame: Math.round(startSecs * DEFAULT_FPS),
                        trimEndFrame: Math.round(startSecs * DEFAULT_FPS) + clipFrames
                    });
                    
                    currStart += clipFrames;
                }
            }
        }

        const allClips = [...cleanSequence, ...audioTracks];

        addEdit({
            id: editId,
            name: `Trailer - ${new Date().toLocaleTimeString()}`,
            clips: allClips,
            createdAt: new Date().toISOString()
        });
        
        nukeLibrary();
        setClips(allClips);
        setActiveTab('edits');
        if (document.fullscreenElement) document.exitFullscreen();
        setAppViewMode('editor');
    };

    return (
        <div ref={containerRef} className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden group">
            
            {/* Top Navigation */}
            <div className={clsx("absolute top-0 inset-x-0 p-6 z-50 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between transition-opacity duration-300", isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100")}>
                <button 
                    onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setAppViewMode(previousViewMode || 'standard'); }}
                    className="flex items-center gap-2 text-white/60 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md"
                >
                    <ChevronLeft size={16} /> Close Trailer
                </button>

                <div className="flex gap-2">
                    <button onClick={() => { setIsPlaying(false); setTrailerModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all">
                        <Settings2 size={14} /> Settings
                    </button>
                    <button onClick={handleShuffleOrder} title="Shuffle Clip Order" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/40 backdrop-blur-md border border-orange-500/30 text-orange-300 hover:text-orange-100 text-xs font-bold transition-all hover:scale-105 active:scale-95">
                        <Shuffle size={14} />
                    </button>
                    <button onClick={handleRandomizeTrims} title="Randomize Trims & Durations" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 backdrop-blur-md border border-emerald-500/30 text-emerald-300 hover:text-emerald-100 text-xs font-bold transition-all hover:scale-105 active:scale-95">
                        <Dna size={14} />
                    </button>
                    <button onClick={generateDraft} title="Shuffle + Flux Everything" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 backdrop-blur-md border border-purple-500/30 text-purple-300 hover:text-purple-100 text-xs font-bold transition-all hover:scale-105 active:scale-95">
                        <RefreshCw size={14} className={clsx(isGenerating && "animate-spin")} /> Flux All
                    </button>
                    <button onClick={handleSaveToEditor} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] text-xs font-black uppercase tracking-wider transition-all">
                        <Film size={14} /> Keep Edit
                    </button>
                </div>
            </div>

            {/* Main Player */}
            <div className="w-full h-full flex items-center justify-center relative bg-[#050505]" onClick={togglePlay}>
            {/* Hidden audio guide player */}
            <audio ref={audioPlayerRef} style={{ display: 'none' }} />
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                        <Wand2 size={48} className="text-purple-500/50" />
                        <span className="text-white/50 font-bold uppercase tracking-widest text-xs">Generating Sequence...</span>
                    </div>
                ) : (
                    <>
                        {/* Video A */}
                        <video
                            ref={videoARef}
                            src={urlCacheA || ''}
                            className={clsx("absolute inset-0 w-full h-full object-contain pointer-events-none transition-none", isActA ? "z-20 opacity-100" : "z-0 opacity-0")}
                            playsInline
                            muted={draftSequence[currentClipIndex]?.isMuted || isMuted}
                            preload="auto"
                        />

                        {/* Video B */}
                        <video
                            ref={videoBRef}
                            src={urlCacheB || ''}
                            className={clsx("absolute inset-0 w-full h-full object-contain pointer-events-none transition-none", !isActA ? "z-20 opacity-100" : "z-0 opacity-0")}
                            playsInline
                            muted={draftSequence[currentClipIndex]?.isMuted || isMuted}
                            preload="auto"
                        />

                        {/* Image Fallback Overlay (If active clip is an image) */}
                        {activeClip && activeClip.type === 'image' && (
                            <img
                                src={isActA ? urlCacheA : urlCacheB}
                                className="absolute inset-0 w-full h-full object-contain animate-in fade-in zoom-in-95 duration-200 z-20"
                                alt="slideshow"
                            />
                        )}

                        {!urlCacheA && !urlCacheB && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <div className="w-12 h-12 border-2 border-white/10 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                            </div>
                        )}
                    </>
                )}

                {/* Invisible Image Timer (If current clip is image) */}
                {activeClip && activeClip.type === 'image' && isPlaying && (
                    <ImageTimer duration={activeClip.localDuration} onEnd={handleClipEnd} />
                )}
            </div>

            {/* Bottom Controls Overlay */}
            {!isGenerating && (
                <div 
                    className={clsx(
                        "absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-12 z-50 flex flex-col gap-4 transition-all duration-300",
                        isPlaying ? "opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0" : "opacity-100 translate-y-0"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    {/* Interactive Scrubber */}
                    <div className="w-full h-3 bg-white/10 rounded-full cursor-pointer relative group/scrubber flex items-center" onMouseDown={handleScrub}>
                        {/* Progress Fill */}
                        <div 
                            className="absolute left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)] pointer-events-none"
                            style={{ width: `${globalProgress * 100}%` }}
                        />
                        {/* Scrubber thumb */}
                        <div 
                            className="absolute h-4 w-4 bg-white rounded-full shadow outline outline-2 outline-black/50 opacity-0 group-hover/scrubber:opacity-100 transition-opacity pointer-events-none"
                            style={{ left: `calc(${globalProgress * 100}% - 8px)` }}
                        />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        {/* Play/Stop */}
                        <div className="flex items-center gap-3">
                            <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                            </button>
                            <button onClick={handleStop} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                <Square size={16} className="fill-current" />
                            </button>
                            
                            {/* Volume */}
                            <div className="flex items-center gap-2 ml-4">
                                <button onClick={() => setIsMuted(!isMuted)} className="p-1 hover:text-white text-white/70 transition-colors">
                                    {isMuted || masterVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                                <input 
                                    type="range" min="0" max="1" step="0.05"
                                    value={isMuted ? 0 : masterVolume}
                                    onChange={(e) => { setMasterVolume(Number(e.target.value)); setIsMuted(false); }}
                                    className="w-20 h-1.5 accent-white bg-white/20 rounded-full appearance-none cursor-pointer"
                                />
                            </div>
                            
                            <div className="text-xs font-mono text-white/50 ml-2">
                                {(globalProgress * (draftSequence?.totalDuration || 0)).toFixed(1)}s / {(draftSequence?.totalDuration || 0).toFixed(1)}s
                            </div>
                        </div>

                        {/* Right tools (Speed, Fullscreen) */}
                        <div className="flex items-center gap-4">
                            <select 
                                value={speed} 
                                onChange={(e) => setSpeed(Number(e.target.value))}
                                className="bg-transparent border border-white/20 text-white/80 text-xs font-bold rounded-md px-2 py-1 outline-none cursor-pointer hover:bg-white/5"
                            >
                                <option className="bg-black" value={0.5}>0.5x</option>
                                <option className="bg-black" value={1}>1.0x</option>
                                <option className="bg-black" value={1.5}>1.5x</option>
                                <option className="bg-black" value={2}>2.0x</option>
                            </select>

                            <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Giant Play Overlay if Paused */}
            {!isPlaying && !isGenerating && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/80 border border-white/20 pointer-events-auto cursor-pointer hover:bg-black/70 hover:scale-105 transition-all shadow-2xl" onClick={togglePlay}>
                        <Play size={40} className="ml-2" />
                    </div>
                </div>
            )}

        </div>
    );
};

// Helper for image duration looping
const ImageTimer = ({ duration, onEnd }) => {
    useEffect(() => {
        const t = setTimeout(onEnd, duration * 1000);
        return () => clearTimeout(t);
    }, [duration, onEnd]);
    return null;
};
