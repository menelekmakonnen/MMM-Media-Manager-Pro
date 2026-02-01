import React, { useEffect } from 'react';
import { ChevronRight, RefreshCw, Trash2, FolderOpen, Plus, XOctagon } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import { clearThumbnailCache } from '../../utils/thumbnailCache';
import { openDirectory } from '../../utils/fileSystem';
import { saveFolderHandle } from '../../utils/persistence';
import clsx from 'clsx';

import WindowControls from './WindowControls';

const TopBar = () => {
    const {
        currentFolder, isScanning, startScan, cancelScan, setFolderHandle, setCurrentFolder,
        explorerSearchQuery, setExplorerSearchQuery
    } = useMediaStore();

    // Format path for breadcrumbs
    const pathParts = currentFolder ? currentFolder.split('/').filter(Boolean) : [];

    const handleClearCacheAndReload = () => {
        clearThumbnailCache();
        window.location.reload();
    };

    useEffect(() => {
        console.log('[TopBar] Mounted. Checking APIs...');
        if ('showDirectoryPicker' in window) {
            console.log('[TopBar] window.showDirectoryPicker is AVAILABLE.');
        } else {
            console.error('[TopBar] window.showDirectoryPicker is MISSING!');
        }
    }, []);

    const handleOpenFolder = async () => {
        console.log('[TopBar] Open button clicked.');
        try {
            console.log('[TopBar] Requesting directory...');
            const handle = await openDirectory();
            console.log('[TopBar] Handle received:', handle);
            if (handle) {
                setFolderHandle(handle);
                setCurrentFolder(handle.name);
                saveFolderHandle(handle);
                console.log('[TopBar] Starting scan...', handle.name);
                startScan(handle);
            } else {
                console.warn('[TopBar] No handle returned (cancelled?)');
            }
        } catch (error) {
            console.error('[TopBar] Error opening folder:', error);
        }
    };
    const handleAddFolder = async () => {
        const handle = await openDirectory();
        if (handle) {
            startScan(handle, true);
        }
    };



    return (
        <div className="h-12 w-full glass-panel border-b border-[var(--glass-border)] flex items-center justify-between pl-4 pr-0 z-50 select-none" style={{ WebkitAppRegion: 'drag' }}>
            {/* Left: Branding & Breadcrumbs */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-[#0F1115] border-b border-white/5 select-none"
                style={{ WebkitAppRegion: 'drag' }}
            >
                {/* Left: Branding & Window Controls */}
                <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'drag' }}>

                    {/* Branding */}
                    <div className="flex items-center gap-3">
                        <img src="/icon.png" alt="Logo" className="w-8 h-8 object-contain hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tighter leading-none bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent filter drop-shadow-sm">
                                MMM <span className="text-[var(--accent-primary)]">Media</span>
                            </h1>
                            <span className="text-[8px] font-bold tracking-[0.2em] text-[var(--accent-primary)]/80 uppercase">Media Manager Pro v2.0.0</span>
                        </div>
                    </div>
                </div>

                {/* Center: Search & Navigation */}
                <div className="flex-1 max-w-2xl px-8 flex items-center gap-3">
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* Breadcrumbs (Condensed) */}
                    <div className="hidden xl:flex items-center gap-1 text-xs text-[var(--text-secondary)] overflow-hidden">
                        <span className="hover:text-white cursor-pointer transition-colors shrink-0">Library</span>
                        {pathParts.slice(-2).map((part, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight size={10} className="text-[var(--text-dim)] shrink-0" />
                                <span className="hover:text-white cursor-pointer transition-colors truncate max-w-[100px] shrink-0">
                                    {part}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' }}>

                {/* Scan Controls */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
                    <button
                        onClick={handleOpenFolder}
                        disabled={isScanning}
                        className="p-2 rounded-lg bg-[var(--accent-primary)] hover:bg-blue-500 text-white transition-all active-press flex items-center gap-2 group disabled:opacity-50"
                        title="Open New Folder (Clears current)"
                    >
                        <FolderOpen size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden lg:inline">Open</span>
                    </button>
                    <button
                        onClick={handleAddFolder}
                        disabled={isScanning}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/5 transition-all active-press disabled:opacity-50"
                        title="Add Another Folder"
                    >
                        <Plus size={16} />
                    </button>
                    {isScanning && (
                        <button
                            onClick={cancelScan}
                            className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all active-press animate-pulse"
                            title="Cancel Scanning"
                        >
                            <XOctagon size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={handleClearCacheAndReload}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-dim)] hover:text-red-400 border border-white/5 transition-all active-press flex items-center gap-2 group mr-2"
                    title="Clear Cache & Reload"
                >
                    <div className="relative">
                        <Trash2 size={16} />
                        <RefreshCw size={8} className="absolute -bottom-1 -right-1 group-hover:rotate-180 transition-transform duration-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Refresh Cache</span>
                </button>

                {/* Custom Window Controls */}
                <WindowControls />
            </div>
        </div>
    );
};

export default TopBar;
