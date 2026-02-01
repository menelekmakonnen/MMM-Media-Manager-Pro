import React, { useState, memo, useEffect, useRef, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { Film, Image as ImageIcon, ZoomIn, X, Rows, Columns, Square, Play } from 'lucide-react';
import SortingControls from '../SortingControls';
import { getThumbnailUrl, getCachedUrl } from '../../utils/thumbnailCache';
import { Grid } from '../../vendor/react-window-patch';
import AutoSizer from 'react-virtualized-auto-sizer';

// Video Thumbnail Generator - Creates actual frame thumbnail
const VideoThumbnailGenerator = memo(({ file, onThumbnail }) => {
    useEffect(() => {
        let active = true;
        let objectUrl = null;
        let video = null;

        const generateThumbnail = async () => {
            try {
                if (!file.handle) return;
                const fileData = await file.handle.getFile();
                if (!active) return;

                objectUrl = URL.createObjectURL(fileData);

                video = document.createElement('video');
                video.src = objectUrl;
                video.muted = true;
                video.playsInline = true;
                video.preload = 'metadata';

                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => {
                        video.currentTime = Math.random() * (video.duration || 1);
                        resolve();
                    };
                    video.onerror = reject;
                    const tm = setTimeout(reject, 3000);
                    video._timeout = tm;
                });

                if (!active) return;
                await new Promise(r => { video.onseeked = r; });

                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (active) {
                    onThumbnail(canvas.toDataURL('image/jpeg', 0.7));
                }
            } catch {
                // Silent fail
            } finally {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                if (video) {
                    if (video._timeout) clearTimeout(video._timeout);
                    video.pause();
                    video.src = "";
                    video.load();
                }
            }
        };

        generateThumbnail();
        return () => {
            active = false;
        };
    }, [file, onThumbnail]);

    return null;
});

// Grid thumbnail with video support and orientation awareness
const GridThumbnail = memo(({ file, onClick, isSelected, orientation }) => {
    const [src, setSrc] = useState(() => getCachedUrl(file));
    const [videoThumb, setVideoThumb] = useState(null);
    const [loading, setLoading] = useState(!src && !videoThumb);
    const ref = useRef(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        const cached = getCachedUrl(file);
        if (cached) return;

        const observer = new IntersectionObserver(
            async (entries) => {
                if (entries[0].isIntersecting && !loadingRef.current && !src) {
                    loadingRef.current = true;

                    try {
                        if (file?.type === 'image') {
                            const url = await getThumbnailUrl(file);
                            if (url) setSrc(url);
                        }
                        // Videos handled by VideoThumbnailGenerator
                    } catch (e) {
                        console.error('Grid thumb error:', e);
                    }

                    setLoading(false);
                    loadingRef.current = false;
                }
            },
            { rootMargin: '300px', threshold: 0 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [file, src]);

    const handleVideoThumb = useCallback((thumbSrc) => {
        setVideoThumb(thumbSrc);
        setLoading(false);
    }, []);

    // Orientation classes
    const orientationClass =
        orientation === 'vertical' ? 'aspect-[3/4]' :
            orientation === 'horizontal' ? 'aspect-video' :
                'aspect-square';

    const displaySrc = src || videoThumb;

    return (
        <div
            ref={ref}
            className={clsx(
                "rounded-lg overflow-hidden cursor-pointer transition-all duration-150 relative group",
                orientationClass,
                isSelected ? "ring-2 ring-[var(--accent-primary)] shadow-lg" : "hover:ring-1 hover:ring-white/40"
            )}
            onClick={onClick}
        >
            {/* Video thumbnail generator */}
            {file?.type === 'video' && !videoThumb && (
                <VideoThumbnailGenerator file={file} onThumbnail={handleVideoThumb} />
            )}

            {loading && !displaySrc ? (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <div className="w-4 h-4 rounded-full border border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] animate-spin" />
                </div>
            ) : displaySrc ? (
                <img src={displaySrc} alt={file?.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                    {file?.type === 'video' ? (
                        <div className="relative">
                            <Film size={20} className="text-[var(--accent-secondary)]" />
                            <Play size={10} className="absolute -bottom-1 -right-1 text-white" />
                        </div>
                    ) : (
                        <ImageIcon size={20} className="text-[var(--text-dim)]" />
                    )}
                </div>
            )}

            {file?.type === 'video' && (
                <div className="absolute top-1 right-1 p-1 rounded bg-black/70">
                    <Film size={10} className="text-white" />
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-white truncate block">{file?.name}</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <ZoomIn size={20} className="text-white drop-shadow-lg" />
            </div>
        </div>
    );
});

// Lightbox
const Lightbox = ({ file, onClose }) => {
    const [fileUrl, setFileUrl] = useState(null);

    useEffect(() => {
        let url = null;
        let active = true;

        const loadFile = async () => {
            if (!file?.handle) return;
            try {
                const blob = await file.handle.getFile();
                if (!active) return;
                url = URL.createObjectURL(blob);
                setFileUrl(url);
            } catch (err) {
                console.error("Lightbox load failed", err);
            }
        };

        loadFile();

        return () => {
            active = false;
            if (url) {
                URL.revokeObjectURL(url);
                url = null;
            }
        };
    }, [file]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    if (!file) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
            <button type="button" className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" onClick={onClose}>
                <X size={24} />
            </button>
            <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                {fileUrl && file.type === 'image' && <img src={fileUrl} alt={file.name} className="max-w-full max-h-[90vh] object-contain" />}
                {fileUrl && file.type === 'video' && <video src={fileUrl} controls autoPlay className="max-w-full max-h-[90vh]" />}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-white font-medium">{file.name}</span>
                </div>
            </div>
        </div>
    );
};



const FullGridView = () => {
    const {
        currentFileIndex, setCurrentFileIndex,
        thumbnailSize, setThumbnailSize,
        getSortedFiles, thumbnailOrientation, setThumbnailOrientation,
        getAllProcessedFiles, showMoreItems
    } = useMediaStore();

    const sortedFiles = getSortedFiles();
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const openLightbox = (index) => {
        setCurrentFileIndex(index);
        setLightboxIndex(index);
    };

    // Default to larger size if too small
    useEffect(() => {
        if (thumbnailSize < 100) {
            setThumbnailSize(150);
        }
    }, [thumbnailSize, setThumbnailSize]);

    if (sortedFiles.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center">
                <h2 className="text-2xl font-display font-bold text-[var(--text-secondary)] mb-2">No Media Found</h2>
                <p className="text-[var(--text-dim)]">Select a folder from the explorer</p>
            </div>
        );
    }

    // Calculate dimensions based on orientation
    const itemWidth = thumbnailOrientation === 'vertical' ? thumbnailSize * 0.75 :
        thumbnailOrientation === 'horizontal' ? thumbnailSize * 1.5 :
            thumbnailSize;

    // We'll use a slightly taller height for info overlay
    const itemHeight = (thumbnailOrientation === 'vertical' ? thumbnailSize :
        thumbnailOrientation === 'horizontal' ? thumbnailSize * 0.85 :
            thumbnailSize) + 20;

    const columnGap = 8;
    const rowGap = 8;

    const Cell = ({ columnIndex, rowIndex, style, data }) => {
        const { columnCount, files } = data;
        const index = rowIndex * columnCount + columnIndex;
        const file = files[index];

        if (!file) return null;

        return (
            <div style={{
                ...style,
                left: style.left + columnGap,
                top: style.top + rowGap,
                width: style.width - columnGap,
                height: style.height - rowGap
            }}>
                <GridThumbnail
                    file={file}
                    isSelected={index === currentFileIndex}
                    onClick={() => openLightbox(index)}
                    orientation={thumbnailOrientation}
                />
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)] shrink-0">
                <div className="flex items-center gap-3">
                    <SortingControls />
                    <span className="text-xs text-[var(--text-dim)] font-mono">
                        {sortedFiles.length} items
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
                        <button
                            type="button"
                            onClick={() => setThumbnailOrientation('vertical')}
                            className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'vertical' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                            title="Vertical"
                        >
                            <Rows size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setThumbnailOrientation('horizontal')}
                            className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'horizontal' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                            title="Horizontal"
                        >
                            <Columns size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setThumbnailOrientation('square')}
                            className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'square' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                            title="Square"
                        >
                            <Square size={14} />
                        </button>
                    </div>

                    <span className="text-xs text-[var(--text-dim)]">Size</span>
                    <input
                        type="range"
                        min="100"
                        max="400"
                        step="20"
                        value={thumbnailSize}
                        onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
                        className="w-24 h-1 accent-[var(--accent-primary)] cursor-pointer"
                    />
                    <span className="text-xs text-[var(--text-dim)] w-8">{thumbnailSize}</span>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <AutoSizer>
                    {({ height, width }) => {
                        const columnCount = Math.max(1, Math.floor(width / (itemWidth + columnGap)));
                        const rowCount = Math.ceil(sortedFiles.length / columnCount);

                        return (
                            <Grid
                                columnCount={columnCount}
                                columnWidth={Math.floor(width / columnCount)}
                                height={height}
                                rowCount={rowCount}
                                rowHeight={itemHeight + rowGap}
                                width={width}
                                itemData={{ files: sortedFiles, columnCount }}
                                cellProps={{}}
                                className="scrollbar-thin scrollbar-thumb-white/10"
                            >
                                {Cell}
                            </Grid>
                        );
                    }}
                </AutoSizer>
            </div>

            {/* Load More Button */}
            {getSortedFiles().length < getAllProcessedFiles().length && (
                <div className="p-6 flex justify-center bg-gradient-to-t from-black/20 to-transparent shrink-0">
                    <button
                        onClick={showMoreItems}
                        className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg active-press flex items-center gap-2 group"
                    >
                        <span>LOAD MORE ITEMS</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </button>
                </div>
            )}

            {lightboxIndex !== null && (
                <Lightbox file={sortedFiles[lightboxIndex]} onClose={() => setLightboxIndex(null)} />
            )}
        </div>
    );
};

export default FullGridView;
