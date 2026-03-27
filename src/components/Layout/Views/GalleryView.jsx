import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import useMediaStore from '../../../stores/useMediaStore';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import VideoThumbnail from '../../VideoThumbnail';
import { getThumbnailUrl } from '../../../utils/thumbnailCache';
import { Search, Filter, SortAsc, SortDesc, ZoomIn, ZoomOut, Image as ImageIcon, Film, Layers, Grid2X2, LayoutPanelLeft, PlayCircle, Minimize2, ArrowLeftRight, ArrowUp, ArrowDown, Folder, EyeOff } from 'lucide-react';

const GalleryView = () => {
    const {
        getGalleryFiles, galleryZoom, setGalleryZoom,
        currentFolder, setCurrentFolder, metadataFilters, setMetadataFilters,
        setAppViewMode, galleryFilter, setGalleryFilter,
        fileTypeFilter, setFileTypeFilter, setGridLayout,
        folders: allFolders, galleryViewMode, setGalleryViewMode,
        setCurrentFileIndex, files: allFiles,
        galleryOrientation, setGalleryOrientation, isScanning, showJumpButtons
    } = useMediaStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);

    // Infinite Scroll State
    const [visibleCount, setVisibleCount] = useState(40);
    const observerTarget = useRef(null);

    // Selection State
    const [selectedPaths, setSelectedPaths] = useState(new Set());
    const [lastSelectedPath, setLastSelectedPath] = useState(null);
    const [isPaintingSelection, setIsPaintingSelection] = useState(false);

    useEffect(() => {
        const stopPaint = () => setIsPaintingSelection(false);
        window.addEventListener('mouseup', stopPaint);
        return () => window.removeEventListener('mouseup', stopPaint);
    }, []);



    const fullFiles = getGalleryFiles();

    // Apply local search and store filters/sorting
    const filteredItems = useMemo(() => {
        let files = [...fullFiles];
        let items = [];

        // 1. Folders logic
        if (galleryViewMode === 'both') {
            const currentPath = currentFolder;
            const subFolders = allFolders.filter(f => {
                const parentPath = f.path.substring(0, f.path.lastIndexOf('/'));
                return parentPath === currentPath && f.path !== currentPath;
            });

            // Filter folders by media type
            const filteredFolders = subFolders.filter(f => {
                if (fileTypeFilter.includes('all')) return true;
                if (fileTypeFilter.includes('gif') && f.hasGifs) return true;
                if (fileTypeFilter.includes('video') && f.hasVideos) return true;
                if (fileTypeFilter.includes('image') && f.hasImages) return true;
                return false;
            });

            items = filteredFolders.map(f => ({ ...f, isFolder: true }));
        }

        // 2. Type Filter (Sync with Sidebar)
        if (!fileTypeFilter.includes('all')) {
            files = files.filter(f => {
                const isGif = f.name.toLowerCase().endsWith('.gif');
                if (fileTypeFilter.includes('gif') && isGif) return true;
                if (fileTypeFilter.includes('video') && f.type === 'video') return true;
                if (fileTypeFilter.includes('image') && f.type === 'image' && !isGif) return true;
                return false;
            });
        }

        // 3. Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            files = files.filter(f => f.name.toLowerCase().includes(q));
            // Also search in folders if in 'both' mode
            items = items.filter(f => f.name.toLowerCase().includes(q));
        }

        // 4. Sorting (Deferred during massive scans to prevent 50+ UI lockups)
        const { sortBy, sortOrder } = galleryFilter;
        if (!isScanning) {
            files.sort((a, b) => {
                let valA, valB;
                if (sortBy === 'date') { valA = a.lastModified || 0; valB = b.lastModified || 0; }
                else if (sortBy === 'size') { valA = a.size || 0; valB = b.size || 0; }
                else { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return [...items, ...files];
    }, [fullFiles, searchQuery, galleryFilter, fileTypeFilter, galleryViewMode, currentFolder, allFolders, isScanning]);

    const visibleItems = useMemo(() => {
        return filteredItems.slice(0, visibleCount);
    }, [filteredItems, visibleCount]);

    const handleSelect = useCallback((e, item) => {
        e.stopPropagation();
        setSelectedPaths(prev => {
            const next = new Set(prev);
            if (e.ctrlKey || e.metaKey) {
                if (next.has(item.path)) next.delete(item.path);
                else next.add(item.path);
            } else if (e.shiftKey && lastSelectedPath) {
                const mediaItems = visibleItems.filter(f => !f.isFolder);
                const startIdx = mediaItems.findIndex(f => f.path === lastSelectedPath);
                const endIdx = mediaItems.findIndex(f => f.path === item.path);
                if (startIdx !== -1 && endIdx !== -1) {
                    const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
                    for (let i = min; i <= max; i++) {
                        next.add(mediaItems[i].path);
                    }
                } else {
                    next.add(item.path);
                }
            } else {
                next.clear();
                next.add(item.path);
            }
            return next;
        });
        setLastSelectedPath(item.path);
    }, [visibleItems, lastSelectedPath]);

    const handleItemMouseDown = useCallback((e, item) => {
        if (e.button !== 0) return;
        setIsPaintingSelection(true);
        handleSelect(e, item);
    }, [handleSelect]);

    const handleItemMouseEnter = useCallback((item) => {
        if (isPaintingSelection) {
            setSelectedPaths(prev => new Set(prev).add(item.path));
        }
    }, [isPaintingSelection]);

    // Reset visible count when filtered results change
    // Removed direct setVisibleCount to avoid cascading renders

    const loadMore = useCallback(() => {
        setVisibleCount(prev => {
            if (prev < filteredItems.length) return prev + 40;
            return prev;
        });
    }, [filteredItems.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[entries.length - 1].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '400px' } // Increased margin for smoother loading
        );

        const target = observerTarget.current;
        if (target) observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [loadMore]); // loadMore only changes if filteredFiles.length changes


    return (
        <div className="h-full w-full flex flex-col bg-[var(--bg-app)] overflow-hidden">
            {/* Gallery Header / Control Bar */}
            <div className="h-14 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-20">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative group max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[var(--accent-primary)] transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search in folder..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setVisibleCount(40); // Reset count on search
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent-primary)]/50 focus:bg-white/10 transition-all"
                        />
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                            showFilters ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50 text-white" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                        )}
                    >
                        <Filter size={16} />
                        Filters
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <div className="text-xs font-mono text-white/30">
                        {filteredItems.length} items
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2" />

                    <button
                        onClick={() => setAppViewMode('standard')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 transition-all font-black tracking-tighter"
                    >
                        <LayoutPanelLeft size={14} />
                        BACK TO GRID
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    {/* Zoom Slider */}
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <ZoomOut size={14} className="text-white/30" />
                        <input
                            type="range" min="100" max="800" step="10"
                            value={galleryZoom}
                            onChange={(e) => setGalleryZoom(parseInt(e.target.value))}
                            className="w-24 h-1 accent-[var(--accent-primary)] cursor-pointer"
                        />
                        <ZoomIn size={14} className="text-white/30" />
                    </div>
                </div>
            </div>

            {/* Filter Drawer */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-black/95 border-b border-white/5 overflow-hidden backdrop-blur-3xl z-30"
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
                            {/* Media Type */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <Layers size={12} /> Media Type
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {['all', 'image', 'video', 'gif'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFileTypeFilter(t)}
                                            className={clsx(
                                                "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                (fileTypeFilter.includes(t) || (t === 'all' && fileTypeFilter.includes('all'))) ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sort By */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <SortAsc size={12} /> Sort By
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {['name', 'date', 'size'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setGalleryFilter({ ...galleryFilter, sortBy: s })}
                                            className={clsx(
                                                "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                galleryFilter.sortBy === s ? "bg-purple-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                    {[
                                        { id: 'asc', icon: SortAsc },
                                        { id: 'desc', icon: SortDesc }
                                    ].map(o => (
                                        <button
                                            key={o.id}
                                            onClick={() => setGalleryFilter({ ...galleryFilter, sortOrder: o.id })}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-all",
                                                galleryFilter.sortOrder === o.id ? "bg-blue-500 text-white shadow-lg" : "text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            <o.icon size={14} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* View Mode */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <Folder size={12} /> View Mode
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    <button
                                        onClick={() => setGalleryViewMode('media')}
                                        className={clsx("flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", galleryViewMode === 'media' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white")}
                                    >
                                        Media
                                    </button>
                                    <button
                                        onClick={() => setGalleryViewMode('both')}
                                        className={clsx("flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all", galleryViewMode === 'both' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white")}
                                    >
                                        Both
                                    </button>
                                </div>
                            </div>

                            {/* Orientation */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <ArrowLeftRight size={12} /> Orientation
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {[
                                        { id: 'vertical', label: 'Vrt' },
                                        { id: 'horizontal', label: 'Hrz' },
                                        { id: 'square', label: 'Sqr' }
                                    ].map(o => (
                                        <button
                                            key={o.id}
                                            onClick={() => setGalleryOrientation(o.id)}
                                            className={clsx(
                                                "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                galleryOrientation === o.id ? "bg-amber-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <LayoutPanelLeft size={12} /> Aspect Ratio
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {['all', 'landscape', 'portrait', 'square'].map(a => (
                                        <button
                                            key={a}
                                            onClick={() => setMetadataFilters({ aspectRatio: a })}
                                            className={clsx(
                                                "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                metadataFilters.aspectRatio === a ? "bg-emerald-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Length */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <Search size={12} /> Name Length
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {['all', 'short', 'medium', 'long'].map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setMetadataFilters({ nameLength: l })}
                                            className={clsx(
                                                "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                metadataFilters.nameLength === l ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality Filter */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black flex items-center gap-2">
                                    <Minimize2 size={12} /> Quality
                                </span>
                                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                                    {['all', 'low', 'high', '4k'].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setMetadataFilters({ resolution: r })}
                                            className={clsx(
                                                "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                metadataFilters.resolution === r ? "bg-blue-600 text-white shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gallery Grid */}
            <div
                key={currentFolder} // Reset scroll on folder change
                className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar"
                onScroll={(e) => {
                    if (e.target.scrollTop === 0 && visibleCount !== 40) setVisibleCount(40);
                }}
            >
                {/* Click outside to clear selection */}
                <div 
                    className="absolute inset-0 z-0" 
                    onClick={() => setSelectedPaths(new Set())}
                    onMouseDown={(e) => {
                        if (e.button === 0) setSelectedPaths(new Set());
                    }}
                />
                <div
                    className={clsx(
                        "grid gap-4 relative z-10",
                        galleryOrientation === 'square' ? "grid-cols-[repeat(auto-fill,minmax(var(--zoom-size),1fr))]" : ""
                    )}
                    style={{
                        gridTemplateColumns: galleryOrientation !== 'square'
                            ? `repeat(auto-fill, minmax(${galleryZoom}px, 1fr))`
                            : undefined,
                        '--zoom-size': `${galleryZoom}px`,
                        gridAutoRows: 'min-content'
                    }}
                >
                    {visibleItems.map((item, i) => (
                        item.isFolder ? (
                            <GalleryFolderItem key={item.path} folder={item} onOpen={() => setCurrentFolder(item.path)} allFiles={allFiles} />
                        ) : (
                            <GalleryItem 
                                key={item.path + i} 
                                file={item} 
                                galleryOrientation={galleryOrientation} 
                                isSelected={selectedPaths.has(item.path)}
                                onMouseDown={(e) => handleItemMouseDown(e, item)}
                                onMouseEnter={() => handleItemMouseEnter(item)}
                                onOpenStandard={() => {
                                    // SYNC Standard View state with Gallery state
                                    const { sortBy, sortOrder } = galleryFilter;
                                    const store = useMediaStore.getState();

                                    store.setSortStack([{ field: sortBy, order: sortOrder }]);
                                    store.setExplorerSearchQuery(searchQuery);
                                    store.updateProcessedFiles(true); // Force immediate update

                                    // Now find the index in the synchronized list
                                    const updatedFiles = store.processedFiles;
                                    const index = updatedFiles.findIndex(f => f.path === item.path);

                                    setGridLayout(1, 1);
                                    setAppViewMode('standard');
                                    if (index !== -1) setCurrentFileIndex(index);
                                }} 
                            />
                        )
                    ))}

                    {/* Infinite Scroll Trigger */}
                    <div ref={observerTarget} className="h-10 w-full flex items-center justify-center col-span-full">
                        {visibleCount < filteredItems.length && (
                            <div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent-primary)] rounded-full animate-spin" />
                        )}
                    </div>
                </div>

                {filteredItems.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                        <Layers size={64} strokeWidth={1} />
                        <p className="text-lg font-light italic">No matching media found</p>
                    </div>
                )}
            </div>

            {/* Selection ActionBar */}
            <AnimatePresence>
                {selectedPaths.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[var(--accent-primary)] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 pointer-events-auto"
                    >
                        <span className="font-bold">{selectedPaths.size} selected</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const selectedFiles = filteredItems.filter(f => selectedPaths.has(f.path) && f.type === 'video');
                                    let currentFrame = 0;
                                    selectedFiles.forEach(file => {
                                        useMediaStore.getState().sendToEditor(file, currentFrame, true);
                                    });
                                    setSelectedPaths(new Set());
                                }}
                                className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                            >
                                Add to Editor
                            </button>
                            <button 
                                onClick={() => setSelectedPaths(new Set())}
                                className="bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-lg text-sm transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Jump Buttons */}
            {showJumpButtons && (
                <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-50">
                    <button
                        onClick={() => {
                            const grid = document.querySelector('.overflow-y-auto');
                            if (grid) grid.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-white/60 hover:text-white transition-all shadow-2xl group"
                        title="Jump to Top"
                    >
                        <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => {
                            const grid = document.querySelector('.overflow-y-auto');
                            if (grid) grid.scrollTo({ top: grid.scrollHeight, behavior: 'smooth' });
                        }}
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-white/60 hover:text-white transition-all shadow-2xl group"
                        title="Jump to Bottom"
                    >
                        <ArrowDown size={24} className="group-hover:translate-y-1 transition-transform" />
                    </button>
                </div>
            )}
        </div>
    );
};

const GalleryItem = ({ file, onOpenStandard, galleryOrientation, isSelected, onMouseDown, onMouseEnter }) => {
    const [thumbUrl, setThumbUrl] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [previewTime, setPreviewTime] = useState(1);
    const { mediaFitMode } = useMediaStore();
    const isVideo = file.type === 'video';

    useEffect(() => {
        let active = true;
        const load = async () => {
            const url = await getThumbnailUrl(file);
            if (active) setThumbUrl(url);
        };
        load();
        return () => { active = false; };
    }, [file]);

    // Hover Preview Logic
    useEffect(() => {
        if (!isHovered || !isVideo) return;
        const interval = setInterval(() => {
            setPreviewTime(prev => (prev + 5)); // Skip 5s every half second
        }, 500);
        return () => clearInterval(interval);
    }, [isHovered, isVideo]);

    return (
        <motion.div
            layout
            onMouseEnter={(e) => {
                 setIsHovered(true);
                 if (onMouseEnter) onMouseEnter(e);
            }}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={onMouseDown}
            onDoubleClick={(e) => {
                e.stopPropagation();
                useMediaStore.getState().setGridLayout(1, 1);
                useMediaStore.getState().setAppViewMode('standard');
                onOpenStandard();
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={clsx(
                "group relative bg-black/40 rounded-xl border overflow-hidden shadow-lg transition-all cursor-pointer gallery-item",
                isSelected ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-black" : "border-white/5 hover:shadow-2xl hover:border-[var(--accent-primary)]/30",
                galleryOrientation === 'horizontal' ? "aspect-video" :
                    galleryOrientation === 'square' ? "aspect-square" : "aspect-[2/3]"
            )}
            onClick={(e) => {
                // Relying on onMouseDown for painting/selection. 
                // But for a normal click (without drag), it should select or we map it from the container. 
                // Wait, onMouseDown triggered selection logic already! So no onClick logic needed.
                e.preventDefault();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                useMediaStore.getState().setMediaContextMenu({ x: e.clientX, y: e.clientY, file, currentTime: file.type === 'video' ? previewTime : 0 });
            }}
        >
            {isHovered && isVideo ? (
                <div className="w-full h-full relative">
                    <VideoHoverPreview file={file} startTime={previewTime} />
                </div>
            ) : thumbUrl ? (
                <img
                    src={thumbUrl}
                    alt={file.name}
                    className={clsx("w-full h-full transition-transform duration-700 group-hover:scale-110 select-none", mediaFitMode === 'cover' ? 'object-cover' : 'object-contain')}
                    loading="lazy"
                    draggable={false}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse select-none" draggable={false}>
                    {isVideo ? <Film className="text-white/10" size={32} /> : <ImageIcon className="text-white/10" size={32} />}
                </div>
            )}

            {/* Overlay Info */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white text-[11px] font-medium truncate mb-1">{file.name}</p>
                <div className="flex items-center justify-between text-[9px] text-white/40 uppercase tracking-widest font-bold">
                    <span>{file.type}</span>
                    {file.size && <span>{Math.round(file.size / 1024 / 1024)} MB</span>}
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenStandard(); }}
                    className="p-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/20 text-white hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all shadow-xl"
                    title="Open in Standard View"
                >
                    <LayoutPanelLeft size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useMediaStore.getState().setGridLayout(1, 1);
                        useMediaStore.getState().startSlideshowAt(file.path);
                    }}
                    className="p-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/20 text-white hover:bg-blue-500 hover:border-blue-400 transition-all shadow-xl"
                    title="Play Slideshow"
                >
                    <PlayCircle size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useMediaStore.getState().toggleItemExclusion(file.path);
                    }}
                    className="p-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/20 text-white hover:bg-amber-500 hover:border-amber-400 transition-all shadow-xl mt-4"
                    title="Exclude Item"
                >
                    <EyeOff size={16} />
                </button>
            </div>
        </motion.div>
    );
};

const VideoHoverPreview = ({ file, startTime }) => {
    const [url, setUrl] = useState(null);
    const videoRef = useRef(null);

    useEffect(() => {
        let active = true;
        let objectUrl = null;
        const load = async () => {
            const fileData = await file.handle.getFile();
            if (active) {
                objectUrl = URL.createObjectURL(fileData);
                setUrl(objectUrl);
            }
        };
        load();
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    useEffect(() => {
        if (videoRef.current && url) {
            const v = videoRef.current;
            v.currentTime = startTime % (v.duration || 100);
        }
    }, [startTime, url]);

    return (
        <video
            ref={videoRef}
            src={url}
            muted
            className={`w-full h-full object-${useMediaStore().mediaFitMode}`}
        />
    );
};

const GalleryFolderItem = ({ folder, onOpen, allFiles, galleryOrientation }) => {
    const [coverSrc, setCoverSrc] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [thumbIndex, setThumbIndex] = useState(0);

    const folderMedia = useMemo(() => {
        if (!isHovered) return [];
        return allFiles.filter(f => f.folderPath === folder.path).slice(0, 10);
    }, [isHovered, folder.path, allFiles]);

    // Folder cycling logic on hover
    useEffect(() => {
        if (!isHovered || folderMedia.length === 0) return;
        const interval = setInterval(() => {
            setThumbIndex(prev => (prev + 1));
        }, 800);
        return () => clearInterval(interval);
    }, [isHovered, folderMedia.length]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            let targetFile = folder.coverFile;
            if (isHovered && folderMedia.length > 0) {
                targetFile = folderMedia[thumbIndex % folderMedia.length];
            }

            if (targetFile) {
                const url = await getThumbnailUrl(targetFile);
                if (active) setCoverSrc(url);
            }
        };
        load();
        return () => { active = false; };
    }, [folder, isHovered, thumbIndex, folderMedia]);

    return (
        <motion.div
            layout
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onOpen}
            className={clsx(
                "group relative bg-black/60 rounded-xl border-2 border-white/5 overflow-hidden shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition-all cursor-pointer",
                galleryOrientation === 'horizontal' ? "aspect-video" :
                    galleryOrientation === 'square' ? "aspect-square" : "aspect-[2/3]"
            )}
        >
            <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-10" />
            {coverSrc ? (
                <img src={coverSrc} alt={folder.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <Folder size={48} className="text-white/10" />
                </div>
            )}

            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-transparent z-20">
                <div className="flex items-center gap-2 mb-1">
                    <Folder size={14} className="text-blue-400" />
                    <p className="text-white text-xs font-black truncate">{folder.name}</p>
                </div>
                <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                    {folder.fileCount} items
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-30">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useMediaStore.getState().toggleFolderExclusion(folder.path);
                    }}
                    className="p-1.5 bg-black/60 backdrop-blur rounded-lg border border-white/20 text-white hover:bg-amber-500 hover:border-amber-400 transition-all shadow-xl"
                    title="Exclude Folder"
                >
                    <EyeOff size={16} />
                </button>
            </div>
        </motion.div>
    );
};

export default GalleryView;
