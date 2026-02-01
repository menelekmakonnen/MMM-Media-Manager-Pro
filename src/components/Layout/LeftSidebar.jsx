import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { FolderOpen, Folder, ChevronRight, ChevronDown, List, Grid, Search, RefreshCw, BarChart2, Clock, History, Film, Image as ImageIcon, Zap, Plus, XOctagon } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import { clearThumbnailCache, getCachedUrl, getThumbnailUrl } from '../../utils/thumbnailCache';
import { getSavedFolderHandle, verifyPermission } from '../../utils/persistence';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// --- Folder GRID Item (Mini Vertical Thumbnail) ---


// --- Folder TREE Item (List View) ---
const FolderTreeItem = ({ folder, depth = 0, allFolders, filterMode, folderSortMode, expandSignal }) => { // Added props
    const [expanded, setExpanded] = useState(false); // Default false, controlled by effect
    const { currentFolder, activeFolders, setCurrentFolder, toggleActiveFolder } = useMediaStore();

    const children = useMemo(() => {
        const rawChildren = allFolders.filter(f => {
            if (f.path === folder.path) return false;
            const parentPath = f.path.substring(0, f.path.lastIndexOf('/'));
            return parentPath === folder.path;
        });

        // RECURSIVE SORTING
        return rawChildren.sort((a, b) => {
            switch (folderSortMode) {
                case 'count': return (b.fileCount || 0) - (a.fileCount || 0);
                case 'date': return (b.lastModified || 0) - (a.lastModified || 0);
                case 'age': return (a.createdAt || Infinity) - (b.createdAt || Infinity);
                case 'path': return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
                case 'name':
                default:
                    const valA = a.sortKey || a.name.toLowerCase();
                    const valB = b.sortKey || b.name.toLowerCase();
                    if (valA < valB) return -1;
                    if (valA > valB) return 1;
                    return 0;
            }
        });
    }, [allFolders, folder.path, folderSortMode]);

    // EXPANSION SIGNAL HANDLER
    useEffect(() => {
        if (!expandSignal) {
            // Initial Default: Expand only Root (depth 0) to show Level 1
            setExpanded(depth < 1);
            return;
        }
        if (expandSignal.mode === 'all') {
            setExpanded(true);
        } else {
            // "Default" Mode: Expand Root (0) only.
            setExpanded(depth < 1);
        }
    }, [expandSignal, depth]);

    const matchesFilter = useMemo(() => {
        if (filterMode.includes('all')) return true;
        const checkFolder = (f) => {
            if (filterMode.includes('gif') && f.hasGifs) return true;
            if (filterMode.includes('video') && f.hasVideos) return true;
            if (filterMode.includes('image') && f.hasImages) return true;
            return false;
        };
        return checkFolder(folder);
    }, [filterMode, folder]);

    const shouldRender = matchesFilter || children.length > 0;
    const hasChildren = children.length > 0;
    const isSelected = activeFolders && activeFolders.includes(folder.path);
    const isCurrent = currentFolder === folder.path;

    if (!shouldRender) return null;

    const handleClick = (e) => {
        if (e.ctrlKey || e.metaKey) {
            toggleActiveFolder(folder.path);
        } else {
            setCurrentFolder(folder.path);
        }
    };

    return (
        <div>
            <div
                className={clsx(
                    "flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group relative active-press",
                    isSelected
                        ? "bg-[var(--accent-primary)]/20 text-white border-l-2 border-[var(--accent-primary)]"
                        : isCurrent
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/5 text-[var(--text-secondary)] hover:text-white"
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
            >
                {hasChildren ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-0.5 hover:bg-white/10 rounded transition-colors"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="w-5" />
                )}
                {isSelected || isCurrent ? (
                    <FolderOpen size={16} className={clsx(isSelected ? "text-[var(--accent-primary)]" : "text-white", "shrink-0")} />
                ) : (
                    <Folder size={16} className="text-[var(--text-dim)] shrink-0 group-hover:text-[var(--text-secondary)]" />
                )}
                <span className="truncate flex-1 text-sm font-medium">{folder.name}</span>
                <div className="flex items-center gap-1 opacity-60">
                    {folder.hasGifs && <span className="text-[8px] bg-purple-500/20 text-purple-200 px-1 rounded">GIF</span>}
                    {folder.hasVideos && <Film size={10} />}
                </div>
            </div>
            {expanded && hasChildren && (
                <div className="ml-0">
                    {children.map(child => (
                        <FolderTreeItem
                            key={child.path}
                            folder={child}
                            depth={depth + 1}
                            allFolders={allFolders}
                            filterMode={filterMode}
                            folderSortMode={folderSortMode}
                            expandSignal={expandSignal}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const LeftSidebar = () => {
    const {
        folderHandle, setFolderHandle, setFolders, setCurrentFolder,
        folders, currentFolder, files, activeFolders, toggleActiveFolder,
        folderSortMode, setFolderSortMode,
        fileTypeFilter, setFileTypeFilter,
        explorerSearchQuery, setExplorerSearchQuery,
        isScanning, scannedCount, startScan,
        theme, setTheme, themeMode, toggleThemeMode
    } = useMediaStore();

    const themes = [
        { id: 'winter', name: 'Winter', color: 'bg-blue-400' },
        { id: 'spring', name: 'Spring', color: 'bg-pink-400' },
        { id: 'summer', name: 'Summer', color: 'bg-teal-400' },
        { id: 'autumn', name: 'Autumn', color: 'bg-orange-500' },
        { id: 'harmattan', name: 'Harmattan', color: 'bg-yellow-600' }
    ];

    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [pendingHandle, setPendingHandle] = useState(null);
    const [expandSignal, setExpandSignal] = useState({ mode: 'default', id: 0 });

    useEffect(() => {
        const checkRestore = async () => {
            const handle = await getSavedFolderHandle();
            if (handle) {
                setPendingHandle(handle);
                setShowRestorePrompt(true);
            }
        };
        checkRestore();
    }, []);

    const handleRestoreConfirm = async () => {
        if (!pendingHandle) return;
        const hasPerm = await verifyPermission(pendingHandle);
        if (hasPerm) {
            setFolderHandle(pendingHandle);
            setCurrentFolder(`/${pendingHandle.name}`);
            startScan(pendingHandle);
        }
        setShowRestorePrompt(false);
    };

    const sortedFolders = useMemo(() => {
        if (!folders) return [];
        console.log('[LeftSidebar] Folders:', folders.length);
        return [...folders].sort((a, b) => {
            switch (folderSortMode) {
                case 'count':
                    return (b.fileCount || 0) - (a.fileCount || 0);
                case 'date':
                    return (b.lastModified || 0) - (a.lastModified || 0);
                case 'age':
                    return (a.createdAt || Infinity) - (b.createdAt || Infinity);
                case 'path':
                    return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
                case 'name':
                default:
                    const valA = a.sortKey || a.name.toLowerCase();
                    const valB = b.sortKey || b.name.toLowerCase();
                    if (valA < valB) return -1;
                    if (valA > valB) return 1;
                    return 0;
            }
        });
    }, [folders, folderSortMode]);

    const rootFolders = useMemo(() => {
        if (sortedFolders.length === 0) return [];
        const minSlashes = Math.min(...sortedFolders.map(f => f.path.split('/').length));
        return sortedFolders.filter(f => f.path.split('/').length === minSlashes);
    }, [sortedFolders]);

    const handleSmartRescan = useCallback(() => {
        if (folderHandle && startScan) {
            startScan(folderHandle, true); // Append/Update mode
        }
    }, [folderHandle, startScan]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showRestorePrompt) {
                setShowRestorePrompt(false);
                setPendingHandle(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showRestorePrompt]);

    return (
        <div className="h-full w-full glass-sidebar flex flex-col relative">
            {/* Session Restore Prompt */}
            {showRestorePrompt && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <button
                        onClick={() => { setShowRestorePrompt(false); setPendingHandle(null); }}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                        title="Close"
                    >
                        <XOctagon size={24} />
                    </button>
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
                        <FolderOpen size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Restore Session?</h3>
                    <p className="text-sm text-[var(--text-dim)] mb-6">
                        Would you like to continue from where you left off in
                        <span className="text-blue-400 font-mono block mt-1">
                            "{pendingHandle?.name}"
                        </span>
                    </p>
                    <div className="flex flex-col w-full gap-2">
                        <button
                            onClick={handleRestoreConfirm}
                            className="w-full py-3 bg-[var(--accent-primary)] hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg active-press"
                        >
                            YES, RESTORE
                        </button>
                        <button
                            onClick={() => { setShowRestorePrompt(false); setPendingHandle(null); }}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] rounded-xl font-medium transition-all active-press"
                        >
                            START FRESH
                        </button>
                    </div>
                </div>
            )}

            {/* Explorer Controls */}
            <div className="p-3 space-y-3 bg-white/5 border-b border-white/5">
                <div className="flex items-center justify-between gap-2 p-2 bg-black/20 rounded-lg mx-2 mb-2">
                    <div className="flex items-center gap-1.5">
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className={clsx("w-3 h-3 rounded-full transition-transform hover:scale-125 hover:ring-2 hover:ring-white/40", t.color, theme === t.id && "ring-2 ring-white scale-125")}
                                title={t.name}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mx-0.5">
                    {[
                        { id: 'all', label: 'All', icon: List, color: 'blue' },
                        { id: 'video', label: 'Vid', icon: Film, color: 'amber' },
                        { id: 'gif', label: 'Gif', icon: Zap, color: 'purple' },
                        { id: 'image', label: 'Img', icon: ImageIcon, color: 'pink' }
                    ].map(type => {
                        const isActive = fileTypeFilter.includes(type.id);
                        const colors = {
                            blue: isActive ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "text-blue-400/40 hover:text-blue-400 hover:bg-blue-500/10",
                            pink: isActive ? "bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]" : "text-pink-400/40 hover:text-pink-400 hover:bg-pink-500/10",
                            amber: isActive ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "text-amber-400/40 hover:text-amber-400 hover:bg-amber-500/10",
                            purple: isActive ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "text-purple-400/40 hover:text-purple-400 hover:bg-purple-500/10"
                        };

                        return (
                            <button
                                key={type.id}
                                onClick={() => setFileTypeFilter(type.id)}
                                className={clsx(
                                    "flex-1 flex flex-col items-center py-1.5 rounded-md transition-all active-press",
                                    colors[type.color]
                                )}
                            >
                                <type.icon size={11} className={clsx("mb-0.5", isActive ? "scale-110" : "opacity-70 group-hover:opacity-100")} />
                                <span className="text-[8px] font-bold uppercase tracking-tighter">{type.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeFilter"
                                        className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>



                <div className="flex items-center justify-between gap-1 bg-white/5 p-1 rounded-lg border border-white/5 mx-0.5">
                    <span className="text-[8px] font-bold text-[var(--text-dim)] pl-1.5 uppercase tracking-tighter opacity-50">Sort By</span>
                    <div className="flex gap-0.5 flex-1 justify-end">
                        {[
                            { id: 'path', label: 'Default Path', icon: FolderOpen },
                            { id: 'name', label: 'Name', icon: List },
                            { id: 'count', label: 'Item Count', icon: BarChart2 },
                            { id: 'date', label: 'Recently Modified', icon: Clock },
                            { id: 'age', label: 'Oldest Created', icon: History }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFolderSortMode(opt.id)}
                                className={clsx(
                                    "p-1.5 rounded-md text-[10px] transition-all active-press group/btn",
                                    folderSortMode === opt.id
                                        ? "bg-blue-500/20 text-blue-400 shadow-[inset_0_0_8px_rgba(59,130,246,0.1)]"
                                        : "text-[var(--text-dim)] hover:text-white hover:bg-white/5"
                                )}
                                title={opt.label}
                            >
                                <opt.icon size={11} className={clsx(folderSortMode === opt.id ? "scale-110" : "scale-100 group-hover/btn:scale-110", "transition-transform")} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Depth Toggle */}


                {isScanning && (
                    <div className="text-[9px] text-[var(--text-dim)] flex items-center justify-between px-1 animate-fade-in pt-1">
                        <div className="flex items-center gap-1.5 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="font-bold tracking-wider uppercase">Scanning...</span>
                        </div>
                        <span className="font-mono bg-white/5 px-2 py-0.5 rounded-full">{scannedCount} FILES</span>
                    </div>
                )}
            </div>

            {/* Folder Content */}
            <div className="flex-1 min-h-0">
                <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] tracking-widest uppercase">
                            EXPLORER
                        </span>
                        {isScanning && <span className="text-[10px] text-[var(--accent-primary)] animate-pulse">SCANNING...</span>}
                    </div>

                    <div className="flex-1 min-h-0 bg-black/10">
                        {rootFolders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-[var(--text-dim)]">
                                <button
                                    onClick={async () => {
                                        try {
                                            const handle = await window.showDirectoryPicker();
                                            if (handle) {
                                                setFolderHandle(handle);
                                                setCurrentFolder(`/ ${handle.name} `);
                                                startScan(handle);
                                            }
                                        } catch (e) {
                                            console.warn("Folder picker cancelled or failed", e);
                                        }
                                    }}
                                    className="flex flex-col items-center group hover:text-white transition-colors"
                                >
                                    <Folder className="mb-2 opacity-20 group-hover:opacity-60 transition-opacity" size={32} />
                                    <span className="text-xs font-bold uppercase tracking-widest underline decoration-dashed underline-offset-4">Open Library</span>
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-y-auto h-full p-2 scrollbar-thin scrollbar-thumb-white/10">
                                <div className="space-y-0.5">
                                    {rootFolders.map((folder) => (
                                        <FolderTreeItem
                                            key={folder.path}
                                            folder={folder}
                                            allFolders={folders}
                                            filterMode={fileTypeFilter}
                                            folderSortMode={folderSortMode}
                                            expandSignal={expandSignal}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer with Stats & Reload */}
            <div className="px-3 py-2 border-t border-[var(--glass-border)] bg-black/20 text-[10px]">
                <div className="flex items-center justify-between px-1">
                    <div className="text-[var(--text-dim)] font-mono flex flex-col">
                        <span>{folders.length}F · {files.length}I</span>
                        <span className="text-[8px] opacity-50">ICUNI Labs © 2026</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setExpandSignal(s => ({ mode: s.mode === 'all' ? 'default' : 'all', id: Date.now() }))}
                            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-white hover:bg-white/10 transition-colors active-press flex items-center gap-1"
                            title={expandSignal.mode === 'all' ? "Collapse All Folders" : "Expand All Folders"}
                        >
                            {expandSignal.mode === 'all' ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </button>
                        <button
                            onClick={handleSmartRescan}
                            className="p-1 rounded-lg text-[var(--text-dim)] hover:text-green-400 hover:bg-green-400/10 transition-colors active-press"
                            title="Check for new files in library (Smart Add)"
                            disabled={isScanning || !folderHandle}
                        >
                            <RefreshCw size={10} className={clsx(isScanning && "animate-spin")} />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default memo(LeftSidebar);
