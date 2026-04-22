import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { useProjectStore } from '../../stores/projectStore';
import { useClipStore } from '../../stores/clipStore';
import { useViewStore } from '../../stores/editorViewStore';
import { generateTrailerSequence, extractBeatTimestamps } from '../../utils/editorUtils/trailerGenerator';
import { DEFAULT_FPS } from '../../utils/editorUtils/time';
import { Wand2, RefreshCw, Settings2, Film, Play, Pause, ChevronLeft, Volume2, VolumeX, Maximize, Minimize, Square, Shuffle, Dna, ArrowLeft, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export const TrailerView = () => {
    // Stores
    const { 
        setAppViewMode, setTrailerModalOpen, trailerSettings, setTrailerSettings: updateTrailerSettings,
        explorerSelectedFiles, getSortedFiles, files,
        masterVolume, setMasterVolume,
        trailerDraftSequence: draftSequence, setTrailerDraftSequence: setDraftSequence, clearTrailerDraftSequence
    } = useMediaStore();
    const { addEdit } = useProjectStore();
    const { setClips, nukeLibrary } = useClipStore();
    const { setActiveTab } = useViewStore();

    // Core state
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

    // === STABLE REFS for mutable state (prevents stale closures in RAF) ===
    const clipIndexRef = useRef(currentClipIndex);
    const draftRef = useRef(draftSequence);
    const isPlayingRef = useRef(isPlaying);
    const isGeneratingRef = useRef(isGenerating);
    const speedRef = useRef(speed);
    const isMutedRef = useRef(isMuted);
    const masterVolumeRef = useRef(masterVolume);

    // Keep refs in sync
    useEffect(() => { clipIndexRef.current = currentClipIndex; }, [currentClipIndex]);
    useEffect(() => { draftRef.current = draftSequence; }, [draftSequence]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { isGeneratingRef.current = isGenerating; }, [isGenerating]);
    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);

    // Scrubber state
    const [globalProgress, setGlobalProgress] = useState(0); // 0 to 1
    const rafRef = useRef(null);
    const flipLockRef = useRef(false); // Prevent double-flip

    // Build pool (respects orientation filter from trailer settings)
    const pool = useMemo(() => {
        let p = getSortedFiles();
        if (explorerSelectedFiles.size > 0) {
            p = p.filter(f => explorerSelectedFiles.has(f.path));
        }
        // Apply orientation filter from trailer settings
        const orientFilter = trailerSettings.orientationFilter || 'all';
        if (orientFilter !== 'all') {
            p = p.filter(f => {
                const w = f.width || 0;
                const h = f.height || 0;
                if (w === 0 && h === 0) return true; // No metadata, include
                if (orientFilter === 'horizontal') return w > h;
                if (orientFilter === 'vertical') return h > w;
                if (orientFilter === 'square') return w === h;
                return true;
            });
        }
        return p;
    }, [explorerSelectedFiles, files, trailerSettings.orientationFilter]);

    // Generator
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
        if (!draftSequence || draftSequence.length === 0) generateDraft();
    }, [trailerSettings]);

    // === Stable URL Cache Architecture (using ref to prevent dependency loops) ===
    const [fileUrlCache, setFileUrlCache] = useState({});
    const fileUrlCacheRef = useRef(fileUrlCache);
    useEffect(() => { fileUrlCacheRef.current = fileUrlCache; }, [fileUrlCache]);

    const getFileObject = useCallback(async (path) => {
        const matchedFile = files.find(f => f.path === path);
        if (matchedFile && matchedFile.handle) return await matchedFile.handle.getFile();
        return null;
    }, [files]);

    // Preloader effect: load ObjectURLs by specific clip ID
    // Uses ref for cache check to prevent dependency loop
    useEffect(() => {
        if (draftSequence.length === 0 || isGenerating) return;

        const currentClip = draftSequence[currentClipIndex];
        const nextClip = draftSequence[(currentClipIndex + 1) % draftSequence.length];
        const nextNextClip = draftSequence[(currentClipIndex + 2) % draftSequence.length];

        let active = true;

        const ensureUrl = async (clip) => {
            if (!clip || clip.type !== 'video') return;
            if (fileUrlCacheRef.current[clip.id]) return; // Use ref instead of state
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
        ensureUrl(nextNextClip);

        return () => { active = false; };
    }, [currentClipIndex, draftSequence, isGenerating, getFileObject]); // Removed fileUrlCache dep

    // Cleanup obsolete URLs
    useEffect(() => {
        if (draftSequence.length === 0) return;
        const currentClip = draftSequence[currentClipIndex];
        const nextClip = draftSequence[(currentClipIndex + 1) % draftSequence.length];
        const nextNextClip = draftSequence[(currentClipIndex + 2) % draftSequence.length];
        const neededIds = [currentClip?.id, nextClip?.id, nextNextClip?.id].filter(Boolean);
        
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
    const nextClipData = draftSequence[(currentClipIndex + 1) % draftSequence.length] || null;

    const clipA = isActA ? activeClip : nextClipData;
    const clipB = isActA ? nextClipData : activeClip;

    const urlCacheA = clipA ? fileUrlCache[clipA.id] : '';
    const urlCacheB = clipB ? fileUrlCache[clipB.id] : '';

    // === FLIP: Advance to next clip ===
    const handleClipEnd = useCallback(() => {
        if (flipLockRef.current) return; // Prevent double-flip
        flipLockRef.current = true;

        const seq = draftRef.current;
        const idx = clipIndexRef.current;
        if (!seq || seq.length === 0) { flipLockRef.current = false; return; }

        const nextIndex = (idx + 1) % seq.length;

        // Guard: Only flip if the background video has data ready
        const bgVid = activeVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
        if (bgVid && bgVid.readyState < 2) {
            // Not ready yet — wait for canplay then flip
            const waitAndFlip = () => {
                bgVid.removeEventListener('canplay', waitAndFlip);
                activeVideoRef.current = activeVideoRef.current === 'A' ? 'B' : 'A';
                setCurrentClipIndex(nextIndex);
                flipLockRef.current = false;
            };
            bgVid.addEventListener('canplay', waitAndFlip, { once: true });
            // Safety timeout: if canplay never fires (e.g., already ready), force flip after 500ms
            setTimeout(() => {
                bgVid.removeEventListener('canplay', waitAndFlip);
                if (flipLockRef.current) {
                    activeVideoRef.current = activeVideoRef.current === 'A' ? 'B' : 'A';
                    setCurrentClipIndex(nextIndex);
                    flipLockRef.current = false;
                }
            }, 500);
            return;
        }

        // Flip refs
        activeVideoRef.current = activeVideoRef.current === 'A' ? 'B' : 'A';
        setCurrentClipIndex(nextIndex);
        flipLockRef.current = false;
    }, []); // No deps needed — uses refs

    // === Animation Loop for Gapless Playback (uses refs for stability) ===
    useEffect(() => {
        if (!isPlaying || isGenerating || draftSequence.length === 0) {
            cancelAnimationFrame(rafRef.current);
            return;
        }

        const loop = () => {
            const seq = draftRef.current;
            const idx = clipIndexRef.current;
            if (!seq || seq.length === 0 || !isPlayingRef.current || isGeneratingRef.current) return;

            const currentClip = seq[idx];
            const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
            
            if (activeVid && currentClip && currentClip.type === 'video') {
                const endSeconds = (currentClip.trimEndFrame || 0) / DEFAULT_FPS;
                const actualDuration = activeVid.duration;
                // Video end sentinel: check both trim end AND actual video duration
                // This prevents freeze when trimEndFrame exceeds real video length
                const effectiveEnd = (actualDuration && actualDuration !== Infinity) 
                    ? Math.min(endSeconds, actualDuration - 0.05) 
                    : endSeconds;
                if (activeVid.currentTime >= effectiveEnd || activeVid.ended) {
                    // FLIP!
                    handleClipEnd();
                } else {
                    // Update global progress
                    const globalTime = currentClip.globalStart + Math.max(0, activeVid.currentTime - ((currentClip.trimStartFrame || 0) / DEFAULT_FPS));
                    setGlobalProgress(globalTime / seq.totalDuration);
                }
            }
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, isGenerating, draftSequence, handleClipEnd]);

    const onGlobalProgress = useCallback((percent) => {
        setGlobalProgress(percent);
    }, []);

    // === Handle initial seek & play when clip index changes ===
    // Uses 'seeked' event to ensure play() only fires after seek completes
    useEffect(() => {
        if (isGenerating || draftSequence.length === 0) return;
        const currentClip = draftSequence[currentClipIndex];
        const nextClipIndex = (currentClipIndex + 1) % draftSequence.length;
        const nextClipLocal = draftSequence[nextClipIndex];
        
        const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
        const bgVid = activeVideoRef.current === 'A' ? videoBRef.current : videoARef.current;
        const targetUrl = activeVideoRef.current === 'A' ? urlCacheA : urlCacheB;
        
        if (!targetUrl) return;

        if (activeVid && currentClip && currentClip.type === 'video') {
            const clipSpeed = currentClip.speed || speedRef.current;
            const clipMuted = currentClip.isMuted || isMutedRef.current;
            const clipVol = currentClip.volume !== undefined ? currentClip.volume / 100 : 1;

            const doSeekAndPlay = () => {
                let startSeconds = (currentClip.trimStartFrame || 0) / DEFAULT_FPS;
                let endSeconds = (currentClip.trimEndFrame || 0) / DEFAULT_FPS;
                const len = endSeconds - startSeconds;
                
                const actualDuration = activeVid.duration;
                if (actualDuration && actualDuration !== Infinity) {
                    // CRITICAL FIX: Clamp trimEndFrame to actual video duration
                    // This prevents the generator from setting trim ranges beyond the video
                    if (endSeconds > actualDuration) {
                        endSeconds = actualDuration;
                        currentClip.trimEndFrame = endSeconds * DEFAULT_FPS;
                        // Also adjust localDuration for progress calculation
                        const newLen = endSeconds - startSeconds;
                        if (newLen > 0) {
                            currentClip.localDuration = newLen;
                        }
                    }
                    let maxStart = actualDuration - Math.min(len, actualDuration);
                    if (maxStart < 0) maxStart = 0;
                    if (startSeconds > maxStart) {
                        startSeconds = Math.random() * maxStart;
                        currentClip.trimStartFrame = startSeconds * DEFAULT_FPS;
                        currentClip.trimEndFrame = Math.min((startSeconds + len) * DEFAULT_FPS, actualDuration * DEFAULT_FPS);
                    }
                }

                activeVid.volume = clipMuted ? 0 : (masterVolumeRef.current * clipVol);
                activeVid.playbackRate = clipSpeed;

                const needsSeek = Math.abs(activeVid.currentTime - startSeconds) > 0.1;

                if (needsSeek) {
                    // Wait for seek to complete before playing
                    const onSeeked = () => {
                        activeVid.removeEventListener('seeked', onSeeked);
                        if (isPlayingRef.current) {
                            activeVid.play().catch(() => {});
                        }
                    };
                    activeVid.addEventListener('seeked', onSeeked, { once: true });
                    activeVid.currentTime = startSeconds;
                } else {
                    // Already at the right position
                    if (isPlayingRef.current) {
                        activeVid.play().catch(() => {});
                    } else {
                        activeVid.pause();
                    }
                }
            };

            if (activeVid.readyState >= 1) {
                doSeekAndPlay();
            } else {
                activeVid.addEventListener('loadedmetadata', () => doSeekAndPlay(), { once: true });
            }
        }

        // PRE-SEEK BACKGROUND VIDEO while it is still hidden
        if (bgVid && nextClipLocal && nextClipLocal.type === 'video') {
            const bgUrl = activeVideoRef.current === 'A' ? urlCacheB : urlCacheA;
            if (bgUrl) {
                const preSeek = () => {
                    const bgStart = (nextClipLocal.trimStartFrame || 0) / DEFAULT_FPS;
                    const actualBgDuration = bgVid.duration;
                    let safeStart = bgStart;
                    if (actualBgDuration && actualBgDuration !== Infinity) {
                        const bgLen = ((nextClipLocal.trimEndFrame || 0) - (nextClipLocal.trimStartFrame || 0)) / DEFAULT_FPS;
                        const maxBgStart = Math.max(0, actualBgDuration - bgLen);
                        if (safeStart > maxBgStart) {
                            safeStart = Math.random() * maxBgStart;
                            nextClipLocal.trimStartFrame = safeStart * DEFAULT_FPS;
                            nextClipLocal.trimEndFrame = (safeStart + bgLen) * DEFAULT_FPS;
                        }
                    }
                    bgVid.currentTime = safeStart;
                    bgVid.volume = 0;
                    bgVid.pause();
                };
                if (bgVid.readyState >= 1) preSeek();
                else bgVid.addEventListener('loadedmetadata', () => preSeek(), { once: true });
            }
        }
    }, [currentClipIndex, isPlaying, isGenerating, draftSequence]);

    // === Stall recovery: if video stalls during playback, auto-retry play ===
    useEffect(() => {
        const vidA = videoARef.current;
        const vidB = videoBRef.current;

        const handleStall = (vid) => () => {
            if (isPlayingRef.current && !isGeneratingRef.current) {
                // Retry play after a brief pause
                setTimeout(() => {
                    if (vid && vid.paused && isPlayingRef.current) {
                        vid.play().catch(() => {});
                    }
                }, 100);
            }
        };

        const stallA = handleStall(vidA);
        const stallB = handleStall(vidB);

        if (vidA) {
            vidA.addEventListener('waiting', stallA);
            vidA.addEventListener('stalled', stallA);
        }
        if (vidB) {
            vidB.addEventListener('waiting', stallB);
            vidB.addEventListener('stalled', stallB);
        }

        return () => {
            if (vidA) {
                vidA.removeEventListener('waiting', stallA);
                vidA.removeEventListener('stalled', stallA);
            }
            if (vidB) {
                vidB.removeEventListener('waiting', stallB);
                vidB.removeEventListener('stalled', stallB);
            }
        };
    }, [draftSequence]); // Re-attach when sequence changes

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
        const nextPlaying = !isPlaying;
        setIsPlaying(nextPlaying);

        // Immediately play/pause the active video element
        const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
        if (activeVid) {
            if (nextPlaying) {
                activeVid.play().catch(() => {});
            } else {
                activeVid.pause();
            }
        }
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
            activeVid.pause();
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
            setTimeout(() => {
                const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
                if (activeVid) activeVid.currentTime = targetLocalTime;
            }, 0);
        } else {
            const activeVid = activeVideoRef.current === 'A' ? videoARef.current : videoBRef.current;
            if (activeVid) {
                activeVid.currentTime = targetLocalTime;
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
        // eslint-disable-next-line no-unused-vars
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
        
        const thumbnailPath = allClips.find(c => c.path)?.path || null;

        addEdit({
            id: editId,
            name: `Trailer - ${new Date().toLocaleTimeString()}`,
            clips: allClips,
            createdAt: new Date().toISOString(),
            thumbnailPath
        });
        
        nukeLibrary();
        setClips(allClips);
        setActiveTab('edits');
        if (document.fullscreenElement) document.exitFullscreen();
        setAppViewMode('trailer');
        clearTrailerDraftSequence();
    };

    return (
        <div ref={containerRef} className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden group">
            
            {/* Top Navigation */}
            <div className={clsx("absolute top-0 inset-x-0 p-6 z-50 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between transition-opacity duration-300", isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100")}>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setAppViewMode('standard'); }}
                        className="flex items-center gap-2 border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-xs transition-colors px-4 py-2 rounded-lg backdrop-blur-md"
                    >
                        <ArrowLeft size={16} /> Back to Library
                    </button>
                    <button 
                        onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); clearTrailerDraftSequence(); }}
                        className="flex items-center gap-2 border border-red-500/30 hover:border-red-500/80 bg-red-500/10 hover:bg-red-500/20 text-red-100 font-bold uppercase tracking-wider text-xs transition-colors px-4 py-2 rounded-lg backdrop-blur-md"
                    >
                        <Trash2 size={16} /> Discard
                    </button>
                </div>

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
                                    type="range" min="0" max="4" step="0.05"
                                    value={isMuted ? 0 : masterVolume}
                                    onChange={(e) => { setMasterVolume(Number(e.target.value)); setIsMuted(false); }}
                                    className="w-20 h-1.5 accent-white bg-white/20 rounded-full appearance-none cursor-pointer"
                                />
                                <span className={clsx("text-[9px] font-mono font-bold min-w-[28px]", masterVolume > 1 ? "text-orange-400" : "text-white/40")}>
                                    {Math.round(masterVolume * 100)}%
                                </span>
                            </div>

                            {/* Orientation Filter Pills */}
                            <div className="flex items-center gap-1 ml-3 bg-white/5 rounded-full p-0.5">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'horizontal', label: 'Wide' },
                                    { id: 'vertical', label: 'Tall' },
                                    { id: 'square', label: 'Sq' }
                                ].map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => updateTrailerSettings({ orientationFilter: o.id })}
                                        className={clsx(
                                            "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full transition-all",
                                            trailerSettings.orientationFilter === o.id
                                                ? "bg-white/20 text-white shadow-inner"
                                                : "text-white/30 hover:text-white/60"
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
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
