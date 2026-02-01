import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { getThumbnailUrl, getCachedUrl } from '../../utils/thumbnailCache';
import { Play, FileType } from 'lucide-react';

const MasonryItem = memo(({ file, index, onClick }) => {
    const [src, setSrc] = useState(() => getCachedUrl(file));

    useEffect(() => {
        if (src) return;
        let active = true;
        const load = async () => {
            if (!file?.handle) return;
            try {
                const url = await getThumbnailUrl(file);
                if (active && url) setSrc(url);
            } catch (err) {
                // Silently fail for individual thumbnails
            }
        };
        load();
        return () => { active = false; };
    }, [file, src]);

    return (
        <div
            onClick={() => onClick(index)}
            className="mb-4 break-inside-avoid relative group rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-[var(--accent-primary)] transition-all cursor-pointer active-press"
            style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '200px 300px'
            }}
        >
            {/* Image */}
            <div className="w-full relative" style={{ minHeight: '100px' }}>
                {src ? (
                    <img src={src} alt={file.name} className="w-full h-auto object-cover block" loading="lazy" />
                ) : (
                    <div className="w-full h-32 flex items-center justify-center text-[var(--text-dim)]">
                        <FileType size={24} />
                    </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                {/* Type Badge */}
                {file.type === 'video' && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1 rounded-full text-white">
                        <Play size={10} fill="currentColor" />
                    </div>
                )}
                {file.name.toLowerCase().endsWith('.gif') && (
                    <div className="absolute top-2 right-2 bg-purple-500/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase">
                        GIF
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-2 bg-black/40">
                <div className="text-xs text-[var(--text-primary)] truncate font-medium">{file.name}</div>
                <div className="text-[10px] text-[var(--text-dim)] flex justify-between mt-1">
                    <span>{file.type}</span>
                    {file.size && <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
                </div>
            </div>
        </div>
    );
});

const MasonryView = () => {
    const { getSortedFiles, setCurrentFileIndex, setViewMode } = useMediaStore();
    const files = getSortedFiles();
    const containerRef = useRef(null);

    // Pagination / Virtualization Logic
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 100;
    const loadMoreRef = useRef(null);

    // Reset page when sorting/files change
    useEffect(() => {
        setPage(1);
    }, [files]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPage(prev => (prev * PAGE_SIZE < files.length ? prev + 1 : prev));
            }
        }, { root: containerRef.current, rootMargin: '400px' });

        const currentTarget = loadMoreRef.current;
        if (currentTarget) observer.observe(currentTarget);
        return () => {
            if (currentTarget) observer.unobserve(currentTarget);
        };
    }, [files.length]);

    const visibleFiles = useMemo(() => files.slice(0, page * PAGE_SIZE), [files, page]);

    return (
        <div className="h-full w-full overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10" ref={containerRef}>
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4">
                {visibleFiles.map((file, index) => (
                    <MasonryItem
                        key={file.path || index}
                        file={file}
                        index={index}
                        onClick={(idx) => {
                            setCurrentFileIndex(idx);
                            setViewMode('single');
                        }}
                    />
                ))}
            </div>

            {/* Load More Trigger */}
            {visibleFiles.length < files.length && (
                <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-4">
                    <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
};

export default memo(MasonryView);
