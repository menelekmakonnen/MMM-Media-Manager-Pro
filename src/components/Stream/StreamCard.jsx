import React, { useState, useRef, useEffect } from 'react';
import { PlayCircle, Info, MoreHorizontal, ImageIcon, Film } from 'lucide-react';
import clsx from 'clsx';
import useMediaStore from '../../stores/useMediaStore';
import { getThumbnailUrl } from '../../utils/thumbnailCache';
import { getMediaUrl } from '../../utils/mediaUrl';

const StreamCard = ({ file, isVertical }) => {
    const [thumbUrl, setThumbUrl] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [inView, setInView] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);

    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const hoverTimeoutRef = useRef(null);

    // Lazy Loading Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        const currentRef = containerRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
            observer.disconnect();
        };
    }, []);

    // Fetch Thumbnail
    useEffect(() => {
        if (!inView) return;
        let active = true;
        const load = async () => {
            const url = await getThumbnailUrl(file);
            if (active) setThumbUrl(url);
        };
        load();
        return () => { active = false; };
    }, [file, inView]);

    // Hover delay logic to prevent accidental loading of videos while scrolling rapidly
    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(true);
        }, 500); // 500ms hover delay
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setIsHovered(false);
        setIsVideoReady(false);
    };

    // When hovering a video, resolve its blob URL
    useEffect(() => {
        if (!isHovered || file.type !== 'video') {
            setVideoUrl(null);
            return;
        }
        let active = true;
        getMediaUrl(file).then(url => {
            if (active) setVideoUrl(url);
        });
        return () => { active = false; };
    }, [isHovered, file]);

    // When we start hovering and mounting the video, seed a random start time
    useEffect(() => {
        if (isHovered && file.type === 'video' && videoRef.current && videoUrl && file.duration) {
            // Pick a random time between 10% and 80% of the video to start
            const minStart = file.duration * 0.1;
            const maxStart = file.duration * 0.8;
            videoRef.current.currentTime = Math.max(0, minStart + Math.random() * (maxStart - minStart));
            
            // Try to play
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsVideoReady(true);
                }).catch(err => {
                    console.log("[StreamCard] Autoplay prevented or aborted:", err);
                });
            }
        } else if (!isHovered && videoRef.current && file.type === 'video') {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsVideoReady(false);
        }
    }, [isHovered, file, videoUrl]);

    const handleClickWrapper = () => {
        // Find this file in the global list and jump to viewer
        useMediaStore.getState().startSlideshowAt(file.path);
    };

    const aspectRatioClass = isVertical 
        ? "aspect-[9/16] w-[180px] sm:w-[220px] md:w-[260px] lg:w-[300px]" 
        : "aspect-video w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]";

    return (
        <div 
            ref={containerRef}
            className={clsx(
                "relative shrink-0 rounded-md overflow-visible transition-all duration-300 group/card bg-[#1a1a1a] border border-white/5",
                aspectRatioClass,
                isHovered ? "z-50 shadow-2xl scale-[1.05] md:scale-125 hover:border-white/20 -translate-y-2 md:-translate-y-4" : "z-10 hover:z-20 scale-100"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* The Image Wrapper */}
            <div className="w-full h-full relative overflow-hidden rounded-md bg-black">
                {/* Always show the thumbnail initially */}
                {thumbUrl ? (
                    <img 
                        src={thumbUrl} 
                        alt={file.name} 
                        className={clsx(
                            "absolute inset-0 w-full h-full transition-opacity duration-700 object-cover",
                            (file.type === 'video' && isVideoReady) ? "opacity-0" : "opacity-100"
                        )}
                        loading="lazy"
                        draggable="false"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse">
                        {file.type === 'video' ? <Film size={32} className="text-white/10" /> : <ImageIcon size={32} className="text-white/10" />}
                    </div>
                )}

                {/* The Video Preview (Only mounted/active if hovering) */}
                {isHovered && file.type === 'video' && videoUrl && (
                    <video 
                        ref={videoRef}
                        src={videoUrl}
                        className={clsx(
                            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
                            isVideoReady ? "opacity-100" : "opacity-0"
                        )}
                        muted
                        playsInline
                        loop
                        onPlaying={() => setIsVideoReady(true)}
                    />
                )}
                
                {/* Meta details that slide up on hover */}
                <div 
                    className={clsx(
                        "absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2 transition-all duration-300 transform",
                        isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    )}
                >
                    <div className="flex items-center justify-between gap-2 z-10">
                        <div className="flex gap-2 shrink-0">
                            <button 
                                onClick={handleClickWrapper}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/80 active:scale-95 transition-all shadow-xl"
                            >
                                <PlayCircle size={20} fill="currentColor" className="ml-0.5" />
                            </button>
                            <button className="w-8 h-8 rounded-full border border-white/40 bg-black/40 text-white flex items-center justify-center hover:border-white/80 hover:bg-black/80 transition-all backdrop-blur-sm">
                                <Info size={16} />
                            </button>
                        </div>
                        <button className="w-8 h-8 rounded-full border border-white/40 bg-black/40 text-white flex items-center justify-center hover:border-white/80 hover:bg-black/80 transition-all backdrop-blur-sm shrink-0">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    <div className="text-left w-full truncate z-10 pt-1">
                        <h4 className="font-bold text-white text-sm truncate drop-shadow-md">
                            {file.name.replace(/\.[^/.]+$/, "")}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            {file.type === 'image' ? (
                                <span className={clsx("text-[10px] uppercase font-bold px-1 border rounded", file.name.toLowerCase().endsWith('.gif') ? "text-purple-400 border-purple-500/40 bg-purple-500/10" : "text-[var(--accent-primary)] border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10")}>
                                    {file.name.toLowerCase().endsWith('.gif') ? 'GIF' : 'IMAGE'}
                                </span>
                            ) : null}
                            {file.duration && (
                                <span className="text-[10px] font-bold tracking-wider text-green-500 uppercase">
                                    {Math.round(file.duration)}s
                                </span>
                            )}
                            {file.resolution && file.type === 'video' && (
                                <span className="text-[10px] uppercase font-bold text-white/40 px-1 border border-white/20 rounded">
                                    {file.resolution.height > 1080 ? '4K' : 'HD'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreamCard;
