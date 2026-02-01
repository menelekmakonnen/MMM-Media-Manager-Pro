import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RefreshCw, RotateCcw, FastForward, Rewind, Shuffle } from 'lucide-react';
import { useVideoRegistry } from '../contexts/VideoRegistryContext.js';
import clsx from 'clsx';

const VideoPlayer = ({ file, fileUrl, isActive, onRandomVideo, onShuffleGrid, masterVolume, isMasterMuted, masterPlaybackRate, rotation, onEnded, forcePlay, slotIndex }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [localRate, setLocalRate] = useState(null); // Override master if set
    const { register, unregister } = useVideoRegistry();

    const effectiveRate = localRate !== null ? localRate : (masterPlaybackRate || 1);

    // Register video with parent context
    // Register video with parent context
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            register(video, slotIndex);
            return () => unregister(slotIndex, video);
        }
    }, [register, unregister, slotIndex]);

    // Apply master volume
    useEffect(() => {
        if (videoRef.current && masterVolume !== undefined) {
            videoRef.current.volume = masterVolume;
        }
    }, [masterVolume]);

    // Apply Playback Rate
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = effectiveRate;
        }
    }, [effectiveRate]);

    // FOCUS LOGIC: Decoupled from "isActive".
    // Only "forcePlay" (Movie Mode) automates playback.
    // Otherwise, user manual control (Independent Grid Controls).
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (forcePlay) {
            const tryPlay = () => {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => setIsPlaying(true)).catch(err => {
                        setIsPlaying(false);
                    });
                }
            };
            tryPlay();
            video.addEventListener('canplay', tryPlay, { once: true });

            // CLEANUP: When forcePlay ends (Video finishes in sequence, or Stop Slideshow), pause it.
            // This ensures Movie Mode doesn't leave trails of playing videos, 
            // while preserving manual playback (which doesn't use forcePlay).
            return () => {
                video.removeEventListener('canplay', tryPlay);
                video.pause();
                setIsPlaying(false);
            };
        }
        // We DO NOT auto-pause anymore when !isActive or !forcePlay.
        // This allows multiple videos to play if user starts them.
    }, [forcePlay]);

    // Loop if NOT using onEnded (Movie Mode uses onEnded)
    const shouldLoop = !onEnded;

    // Sync Playback State
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    // HANDLERS
    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
            }
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleReset = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
            setIsPlaying(true);
        }
    };

    const handleSkip = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const handleRandomCheck = (e) => {
        e.stopPropagation();
        if (onRandomVideo) onRandomVideo();
    };

    // Toggle Local Speed
    const cycleSpeed = (e) => {
        e.stopPropagation();
        const speeds = [0.5, 1, 1.5, 2, 4];
        const current = effectiveRate;
        const next = speeds.find(s => s > current) || speeds[0];
        setLocalRate(next);
    };

    return (
        <div className="absolute inset-0 bg-black group-hover:bg-black/90 transition-colors group overflow-hidden">
            <video
                ref={videoRef}
                src={fileUrl}
                className="w-full h-full object-contain transition-transform duration-300"
                style={{ transform: `rotate(${rotation || 0}deg)` }}
                loop={shouldLoop}
                muted={isMuted || isMasterMuted || masterVolume === 0}
                playsInline
                controls={false}
                onEnded={onEnded}
            />

            {/* Hover Controls (Advanced) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-[70] pointer-events-none group-hover:pointer-events-auto w-full px-2">

                {/* Skip Controls Row - Responsive Wrap */}
                <div className="flex flex-wrap justify-center items-center gap-1 bg-black/60 backdrop-blur rounded-full px-2 py-1 mb-1 max-w-[95%]">
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(-300); }} className="p-1 px-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors">-5m</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(-120); }} className="p-1 px-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors">-2m</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(-30); }} className="p-1 px-1.5 text-[9px] text-gray-300 hover:text-white transition-colors">-30s</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(-5); }} className="p-1 px-1.5 text-[9px] text-gray-300 hover:text-white transition-colors">-5s</button>

                    <div className="w-px h-3 bg-white/20 mx-1 hidden sm:block"></div>

                    <button onClick={(e) => { e.stopPropagation(); handleSkip(10); }} className="p-1 px-1.5 text-[9px] text-gray-300 hover:text-white transition-colors">+10s</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(120); }} className="p-1 px-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors">+2m</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(300); }} className="p-1 px-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors">+5m</button>
                    <button onClick={(e) => { e.stopPropagation(); handleSkip(600); }} className="p-1 px-1.5 text-[9px] font-bold text-gray-400 hover:text-white transition-colors">+10m</button>
                </div>

                {/* Main Action Row - Persistent or Easier Access */}
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 shadow-lg border border-white/10">
                    <button onClick={handleReset} className="text-gray-300 hover:text-yellow-400 p-1" title="Reset">
                        <RotateCcw size={14} />
                    </button>

                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="text-white hover:text-[var(--accent-primary)] p-1 transition-colors active:scale-95">
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    {/* Volume */}
                    <button onClick={toggleMute} className="text-gray-300 hover:text-white p-1">
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>

                    {/* Speed */}
                    <button onClick={cycleSpeed} className="flex items-center justify-center w-6 text-[9px] font-bold text-gray-300 hover:text-white border border-white/20 rounded ml-1" title={`Speed: ${effectiveRate}x`}>
                        {effectiveRate}x
                    </button>

                    <div className="w-px h-3 bg-white/20 mx-1"></div>

                    {/* Randomize This Slot (Content) */}
                    <button onClick={handleRandomCheck} className="text-blue-300 hover:text-blue-100 p-1" title="Randomize This Slot">
                        <RefreshCw size={14} />
                    </button>

                    {/* Random Start Point (Time Jump) - Replaces Global Shuffle */}
                    <button onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current && videoRef.current.duration) {
                            videoRef.current.currentTime = Math.random() * videoRef.current.duration;
                        }
                    }} className="text-purple-300 hover:text-purple-100 p-1" title="Random Start Point">
                        <Shuffle size={14} />
                    </button>

                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
