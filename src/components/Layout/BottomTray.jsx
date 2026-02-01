import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { Film, Image as ImageIcon, Play, Rows, Columns, Square } from 'lucide-react';
import SortingControls from '../SortingControls';
import { getThumbnailUrl, getCachedUrl } from '../../utils/thumbnailCache';
import AutoSizer from 'react-virtualized-auto-sizer';

// Concurrency Limiter
const MAX_CONCURRENT_THUMBS = 2;
const thumbQueue = [];
let activeThumbs = 0;

const processQueue = () => {
    if (activeThumbs >= MAX_CONCURRENT_THUMBS || thumbQueue.length === 0) return;
    const { task, resolve, reject } = thumbQueue.shift();
    activeThumbs++;
    task().then(resolve).catch(reject).finally(() => {
        activeThumbs--;
        processQueue();
    });
};

const enqueueThumbnail = (task) => {
    return new Promise((resolve, reject) => {
        thumbQueue.push({ task, resolve, reject });
        processQueue();
    });
};

// Optimized Video Thumbnail Generator
const VideoThumbnailGenerator = memo(({ file, onThumbnail }) => {
    useEffect(() => {
        let active = true;
        let objectUrl = null;
        let video = null;

        const generate = async () => {
            // Wait for slot in queue
            await enqueueThumbnail(async () => {
                if (!active || !file.handle) return;

                try {
                    const fileData = await file.handle.getFile();
                    objectUrl = URL.createObjectURL(fileData);

                    video = document.createElement('video');
                    video.src = objectUrl;
                    video.muted = true;
                    video.playsInline = true;
                    video.preload = 'metadata'; // Only metadata first

                    await new Promise((resolve, reject) => {
                        // Fast timeout
                        const tm = setTimeout(() => reject(new Error("Timeout")), 3000);
                        video.onloadedmetadata = () => {
                            clearTimeout(tm);
                            // Seek to 1s or 5% to avoid black start frames, but minimal delay
                            video.currentTime = Math.min(1.0, video.duration * 0.1);
                            resolve();
                        };
                        video.onerror = () => { clearTimeout(tm); reject(new Error("Video Error")); };
                    });

                    // Wait for seek with very short timeout
                    await new Promise((resolve) => {
                        const tm = setTimeout(() => resolve(), 800); // If seek takes >800ms, just draw what we have
                        video.onseeked = () => { clearTimeout(tm); resolve(); };
                    });

                    // Low-res Draw
                    const canvas = document.createElement('canvas');
                    canvas.width = 120; // Reduced from 160
                    canvas.height = 68; // 16:9 aspect
                    const ctx = canvas.getContext('2d', { alpha: false }); // No alpha for speed
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    if (active) {
                        onThumbnail(canvas.toDataURL('image/jpeg', 0.5)); // Low quality jpeg
                    }
                } catch {
                    // console.warn("Thumb failed", e);
                } finally {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                        objectUrl = null;
                    }
                    if (video) {
                        video.pause();
                        video.removeAttribute('src');
                        video.load();
                    }
                }
            });
        };

        generate();

        return () => { active = false; };
    }, [file, onThumbnail]);

    return null;
});

// Video Hover Preview with 5-second cycling
const VideoHoverPreview = memo(({ file }) => {
    const videoRef = useRef(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const cycleIntervalRef = useRef(null);

    useEffect(() => {
        let url = null;
        let active = true;

        const loadVideo = async () => {
            if (!file?.handle) return;
            try {
                const blob = await file.handle.getFile();
                if (!active) return;
                url = URL.createObjectURL(blob);
                setVideoUrl(url);
            } catch {
                /* Error ignored */
            }
        };

        loadVideo();

        return () => {
            active = false;
            if (url) {
                URL.revokeObjectURL(url);
                url = null;
            }
        };
    }, [file]);

    useEffect(() => {
        if (videoRef.current && videoUrl) {
            const video = videoRef.current;

            video.onloadedmetadata = () => {
                // Start at random position
                if (video.duration) {
                    video.currentTime = Math.random() * video.duration;
                }
                video.play().catch(() => { });

                // Cycle to new random position every 5 seconds
                cycleIntervalRef.current = setInterval(() => {
                    if (video.duration) {
                        video.currentTime = Math.random() * video.duration;
                    }
                }, 5000);
            };
        }

        return () => {
            if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
        };
    }, [videoUrl]);

    if (!videoUrl) return null;

    return (
        <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover z-10"
            muted
            loop
            playsInline
        />
    );
});

// Image Thumbnail with Intersection Observer + Prefetching support
const ThumbnailImage = React.memo(({ file }) => {
    const [src, setSrc] = useState(null);
    const [videoThumb, setVideoThumb] = useState(null);
    const [loading, setLoading] = useState(true);
    const ref = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Simplified visibility logic
    useEffect(() => {
        if (isVisible) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { rootMargin: '400px', threshold: 0 }
        );

        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
            observer.disconnect();
        };
    }, []); // Only run once to setup observer

    useEffect(() => {
        if (!isVisible || !file) return;
        if (src) return;

        let active = true;
        const load = async () => {
            const cached = getCachedUrl(file);
            if (cached) {
                if (active) {
                    setSrc(cached);
                    setLoading(false);
                }
                return;
            }

            if (file.type === 'video') {
                if (active) setLoading(false);
                return;
            }

            try {
                const url = await getThumbnailUrl(file);
                if (active) {
                    setSrc(url);
                    setLoading(false);
                }
            } catch {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [file, isVisible, src]);

    const handleVideoThumb = useCallback((thumbSrc) => {
        setVideoThumb(thumbSrc);
        setLoading(false);
    }, []);

    return (
        <div
            ref={ref}
            className="w-full h-full relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {file?.type === 'video' && !videoThumb && (
                <VideoThumbnailGenerator file={file} onThumbnail={handleVideoThumb} />
            )}

            {isHovering && file?.type === 'video' && (
                <VideoHoverPreview file={file} />
            )}

            {loading && !videoThumb ? (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <div className="w-3 h-3 rounded-full border border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] animate-spin" />
                </div>
            ) : (src || videoThumb) ? (
                <img
                    src={src || videoThumb}
                    alt={file?.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                    {file?.type === 'video' ? (
                        <div className="relative">
                            <Film size={16} className="text-[var(--accent-secondary)]" />
                            <Play size={8} className="absolute -bottom-1 -right-1 text-white" />
                        </div>
                    ) : (
                        <ImageIcon size={16} className="text-[var(--text-dim)]" />
                    )}
                </div>
            )}
        </div>
    );
});

import { List } from '../../vendor/react-window-patch';

const BottomTray = () => {
    const {
        currentFileIndex, setCurrentFileIndex,
        getSortedFiles
    } = useMediaStore();
    const listRef = useRef(null);

    const sortedFiles = getSortedFiles();

    // Scroll to selected
    useEffect(() => {
        if (listRef.current && currentFileIndex >= 0) {
            listRef.current.scrollToItem(currentFileIndex, 'center');
        }
    }, [currentFileIndex]);

    const maxItems = 10000;
    const displayFiles = sortedFiles.slice(0, maxItems);

    const handleItemClick = (index) => {
        setCurrentFileIndex(index);
    };

    // Standard tray item width (approx 85px for a vertical look in the tray)
    const itemWidth = 85;

    console.log('[BottomTray] Files:', sortedFiles.length);

    // Row Renderer for virtualization
    const Row = ({ index, style }) => {
        const file = displayFiles[index];
        if (!file) return null;
        const isSelected = index === currentFileIndex;

        return (
            <div
                style={style}
                onClick={() => handleItemClick(index)}
                className="px-0.5"
            >
                <div
                    className={clsx(
                        "h-full w-full rounded-lg overflow-hidden cursor-pointer transition-all duration-100 active-press",
                        isSelected
                            ? "ring-2 ring-[var(--accent-primary)] shadow-lg scale-105"
                            : "hover:ring-1 hover:ring-white/30"
                    )}
                >
                    <div className="relative h-full w-full">
                        <ThumbnailImage file={file} />
                        {file?.type === 'video' && (
                            <div className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/70">
                                <Film size={8} className="text-white" />
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/80 to-transparent">
                            <span className="text-[8px] text-white/90 truncate block font-medium">{file?.name}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full glass-panel border-t border-[var(--glass-border)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 shrink-0">
                <span className="text-[10px] text-[var(--text-dim)] font-mono">
                    {sortedFiles.length > maxItems ? `${maxItems}/${sortedFiles.length}` : sortedFiles.length} items
                </span>
            </div>

            {/* Thumbnail strip with virtualization */}
            <div className="flex-1 min-h-0 py-1">
                {sortedFiles.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <span className="text-xs text-[var(--text-dim)]">NO MEDIA ITEMS</span>
                    </div>
                ) : (
                    <div className="h-full w-full px-1">
                        <AutoSizer>
                            {({ height, width }) => {
                                console.log('[BottomTray] AutoSizer:', { width, height });
                                return (
                                    <List
                                        ref={listRef}
                                        height={height}
                                        itemCount={displayFiles.length}
                                        itemSize={itemWidth}
                                        layout="horizontal"
                                        width={width}
                                        rowProps={{}}
                                        cellProps={{}}
                                        className="scrollbar-thin scrollbar-thumb-white/10"
                                    >
                                        {Row}
                                    </List>
                                );
                            }}
                        </AutoSizer>
                    </div>
                )}
            </div>
        </div >
    );
};

export default BottomTray;
