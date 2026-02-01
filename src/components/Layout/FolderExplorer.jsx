import React, { useMemo, useState, useEffect } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { Folder, Film, Rows, Columns, Square, List, Grid3X3 } from 'lucide-react';
import { getCachedUrl, getThumbnailUrl } from '../../utils/thumbnailCache';
import clsx from 'clsx';
import SortingControls from '../SortingControls';

// Component to handle individual folder display (Card or Row)
const FolderItem = ({ folder, coverFile, onClick, orientation, count, viewMode }) => {
    const [coverSrc, setCoverSrc] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // No more expensive filtering here!
    const randomImage = coverFile;

    // Load cover once
    useEffect(() => {
        if (!randomImage) return;

        let active = true;
        const loadCover = async () => {
            try {
                const cached = getCachedUrl(randomImage);
                if (cached) {
                    if (active) {
                        setCoverSrc(cached);
                        setIsLoaded(true);
                    }
                } else if (randomImage.handle) {
                    const url = await getThumbnailUrl(randomImage);
                    if (active && url) {
                        setCoverSrc(url);
                        setIsLoaded(true);
                    }
                }
            } catch (e) {
                console.error("Cover load error", e);
            }
        };
        loadCover();
        return () => { active = false; };
    }, [randomImage]);

    // --- LIST VIEW ---
    if (viewMode === 'list') {
        return (
            <div
                onClick={onClick}
                className="group flex items-center gap-4 bg-white/5 border border-white/5 p-2 rounded-xl hover:bg-white/10 hover:border-[var(--accent-primary)]/30 cursor-pointer transition-all active-press"
            >
                {/* Tiny Thumbnail */}
                <div className="w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-black/50 relative">
                    {coverSrc ? (
                        <img src={coverSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Folder size={20} className="text-white/20" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{folder.name}</h3>
                    <div className="text-xs text-[var(--text-dim)] truncate">{folder.path}</div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    {folder.hasGifs && <span className="text-purple-400 font-bold">GIF</span>}
                    {folder.hasVideos && <Film size={14} className="text-amber-400" />}
                    <span className="bg-white/10 px-2 py-0.5 rounded-full">{count}</span>
                </div>
            </div>
        );
    }

    // --- GRID VIEW ---
    const aspectClass =
        orientation === 'vertical' ? 'aspect-[3/4]' :
            orientation === 'horizontal' ? 'aspect-video' :
                'aspect-square';

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative bg-white/5 border border-white/5 overflow-hidden cursor-pointer hover:border-[var(--accent-primary)] transition-all duration-300 active-press hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-[var(--accent-primary)]/10 rounded-2xl",
                aspectClass
            )}
        >
            {/* Background / Cover */}
            <div className="absolute inset-0 bg-black/60 transition-colors group-hover:bg-black/40" />

            {coverSrc ? (
                <img
                    src={coverSrc}
                    alt={folder.name}
                    loading="lazy"
                    className={clsx(
                        "absolute inset-0 w-full h-full object-cover transition-all duration-500",
                        isLoaded ? "opacity-60 group-hover:opacity-100 group-hover:scale-105" : "opacity-0"
                    )}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Folder size={64} />
                </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

            {/* Content info */}
            <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-lg font-bold text-white truncate drop-shadow-lg mb-1">{folder.name}</h3>

                <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                    <span className="bg-white/10 px-2 py-0.5 rounded backdrop-blur border border-white/5">
                        {count} items
                    </span>
                    {folder.hasGifs && (
                        <span className="bg-purple-500/80 px-1.5 py-0.5 rounded text-white text-[10px] font-bold tracking-wider">
                            GIF
                        </span>
                    )}
                    {folder.hasVideos && <Film size={12} />}
                </div>
            </div>
        </div>
    );
};

const FolderExplorer = () => {
    const {
        folders, files, setCurrentFolder, setGlobalViewMode, fileTypeFilter,
        thumbnailOrientation, setThumbnailOrientation,
        explorerViewMode, setExplorerViewMode,
        explorerGridColumns, setExplorerGridColumns
    } = useMediaStore();

    // 1. Filter files based on global filter
    const filteredFiles = useMemo(() => {
        if (fileTypeFilter === 'all') return files;
        return files.filter(f => {
            if (fileTypeFilter === 'gif') return f.name.toLowerCase().endsWith('.gif');
            return f.type === fileTypeFilter;
        });
    }, [files, fileTypeFilter]);

    // 2. Compute dynamic counts and file index (O(N) instead of O(Folders*Files))
    const { folderCounts, folderCovers } = useMemo(() => {
        const counts = {};
        const index = {};
        filteredFiles.forEach(f => {
            if (!counts[f.folderPath]) {
                counts[f.folderPath] = 0;
                index[f.folderPath] = [];
            }
            counts[f.folderPath]++;
            index[f.folderPath].push(f);
        });

        // Pre-select covers purely
        const covers = {};
        Object.keys(index || {}).forEach(path => {
            const folderFiles = index[path];
            // Use a simple hash of the path to pick a stable "random" cover if we don't want true random on every flux
            // or just use 0 for now for maximum stability, or Math.random here is okay because it's in a memo
            covers[path] = folderFiles.length > 0 ? folderFiles[Math.floor(Math.random() * folderFiles.length)] : null;
        });

        return { folderCounts: counts, folderCovers: covers };
    }, [filteredFiles]);

    const validFolders = useMemo(() => {
        return folders.filter(f => (folderCounts[f.path] || 0) > 0);
    }, [folders, folderCounts]);

    // Dynamic grid columns
    const gridStyle = useMemo(() => {
        if (explorerViewMode === 'list') return { gridTemplateColumns: '1fr' };
        return { gridTemplateColumns: `repeat(${explorerGridColumns}, minmax(0, 1fr))` };
    }, [explorerViewMode, explorerGridColumns]);

    return (
        <div className="h-full w-full bg-[var(--bg-app)] flex flex-col animate-fade-in relative z-0">
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[var(--bg-app)]/95 backdrop-blur z-20 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-display font-bold text-white tracking-tight">
                        Library Folders
                    </h1>
                    <span className="text-xs text-[var(--text-dim)] font-mono bg-white/5 px-2 py-0.5 rounded-full">
                        {validFolders.length} FOLDERS
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <SortingControls compact />

                    <div className="h-4 w-[1px] bg-white/10" />

                    {/* View Modes (Grid/List) */}
                    <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
                        <button
                            onClick={() => setExplorerViewMode('grid')}
                            className={clsx("p-1.5 rounded transition-colors active-press", explorerViewMode === 'grid' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                            title="Grid View"
                        >
                            <Grid3X3 size={14} />
                        </button>
                        <button
                            onClick={() => setExplorerViewMode('list')}
                            className={clsx("p-1.5 rounded transition-colors active-press", explorerViewMode === 'list' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                            title="List View"
                        >
                            <List size={14} />
                        </button>
                    </div>

                    {/* Orientation (Only for Grid) */}
                    {explorerViewMode === 'grid' && (
                        <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5 animate-fade-in">
                            <button
                                onClick={() => setThumbnailOrientation('vertical')}
                                className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'vertical' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                                title="Vertical"
                            >
                                <Rows size={14} />
                            </button>
                            <button
                                onClick={() => setThumbnailOrientation('horizontal')}
                                className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'horizontal' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                                title="Horizontal"
                            >
                                <Columns size={14} />
                            </button>
                            <button
                                onClick={() => setThumbnailOrientation('square')}
                                className={clsx("p-1.5 rounded transition-colors active-press", thumbnailOrientation === 'square' ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-white/10")}
                                title="Square"
                            >
                                <Square size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-white/10">
                <div className="grid gap-4 pb-32 transition-all duration-300" style={gridStyle}>
                    {validFolders.map(folder => {
                        const coverFile = folderCovers[folder.path];

                        return (
                            <FolderItem
                                key={folder.path}
                                folder={folder}
                                coverFile={coverFile}
                                count={folderCounts[folder.path] || 0}
                                onClick={() => {
                                    setCurrentFolder(folder.path);
                                    setGlobalViewMode('normal');
                                }}
                                orientation={thumbnailOrientation}
                                viewMode={explorerViewMode}
                            />
                        );
                    })}
                </div>

                {validFolders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--text-dim)]">
                        <Folder size={48} className="mb-4 opacity-50" />
                        <p>No folders match the current filter.</p>
                    </div>
                )}
            </div>

            {/* Floating Columns Toggle at Bottom */}
            {explorerViewMode === 'grid' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <span className="text-[10px] font-bold text-white/40 ml-2 mr-1 uppercase tracking-widest font-display">Grid Size</span>
                    <div className="flex bg-white/5 rounded-xl p-0.5">
                        <button
                            onClick={() => setExplorerGridColumns(2)}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press",
                                explorerGridColumns === 2 ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            2
                        </button>
                        <button
                            onClick={() => setExplorerGridColumns(3)}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press",
                                explorerGridColumns === 3 ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            3
                        </button>
                        <button
                            onClick={() => setExplorerGridColumns(4)}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all active-press",
                                explorerGridColumns === 4 ? "bg-white/20 text-white shadow-sm" : "text-white/40 hover:text-white"
                            )}
                        >
                            4
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderExplorer;
