import React, { useEffect, useState } from 'react';
import { ChevronRight, RefreshCw, Trash2, FolderOpen, Plus, XOctagon, Layout, Image as ImageIcon, PlayCircle, Maximize, Minimize, Film } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import { clearThumbnailCache } from '../../utils/thumbnailCache';
import { openDirectory } from '../../utils/fileSystem';
import { saveFolderHandle } from '../../utils/persistence';
import clsx from 'clsx';
import { getLogoSvgString } from '../../utils/LogoGenerator';

import WindowControls from './WindowControls';

const TopBar = () => {
    const [logoUrl, setLogoUrl] = useState('');
    const {
        currentFolder, isScanning, startScan, cancelScan, setFolderHandle, setCurrentFolder,
        explorerSearchQuery, setExplorerSearchQuery,
        appViewMode, setAppViewMode, setGlobalViewMode, theme,
        mediaFitMode, toggleMediaFitMode
    } = useMediaStore();

    useEffect(() => {
        // slight delay to allow CSS vars to update in DOM
        setTimeout(() => {
            const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#3b82f6';
            const svgString = getLogoSvgString(accentColor);
            setLogoUrl(`data:image/svg+xml;base64,${btoa(svgString)}`);
        }, 50);
    }, [theme]);

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
                setCurrentFolder('/' + handle.name);
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
                    <button
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        onClick={() => {
                            const modes = ['standard', 'slideshow', 'gallery', 'editor', 'settings'];
                            const next = modes[(modes.indexOf(appViewMode) + 1) % modes.length];
                            setAppViewMode(next);
                        }}
                        style={{ WebkitAppRegion: 'no-drag' }}
                        title="Toggle View Mode"
                    >
                        <img src={logoUrl || "/icon.png"} alt="Mmmedia Darkroom Logo" className="w-8 h-8 object-contain hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
                        <div className="flex flex-col items-start justify-center h-8">
                            <h1 className="text-[1.15rem] font-black tracking-tight leading-none text-white/90 drop-shadow-sm flex items-center gap-1.5 pt-0.5">
                                MMMedia <span className="font-light text-[var(--accent-primary)]/90 tracking-widest uppercase text-xs">Darkroom</span>
                            </h1>
                        </div>
                    </button>
                </div>

                {/* Center: Search & Navigation */}
                <div className="flex-1 max-w-2xl px-8 flex items-center gap-3">
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* Breadcrumbs (Condensed) */}
                    <div className="hidden xl:flex items-center gap-1 text-xs text-[var(--text-secondary)] overflow-hidden" style={{ WebkitAppRegion: 'no-drag' }}>
                        <span
                            className="hover:text-white cursor-pointer transition-colors shrink-0 font-medium"
                            onClick={() => {
                                // "Library" could reset to root or clear search? 
                                // For now, maybe just clear search if already at root, or do nothing?
                                setExplorerSearchQuery('');
                            }}
                        >
                            Library
                        </span>
                        {pathParts.slice(-3).map((part, i, arr) => {
                            // Calculate original index in pathParts
                            // If showing last 3, then arr length is up to 3.
                            // The true index in pathParts is: (pathParts.length - arr.length) + i
                            const trueIndex = (pathParts.length - arr.length) + i;

                            return (
                                <React.Fragment key={i}>
                                    <ChevronRight size={10} className="text-[var(--text-dim)] shrink-0" />
                                    <span
                                        className="hover:text-white cursor-pointer transition-colors truncate max-w-[150px] shrink-0 font-medium"
                                        onClick={() => {
                                            const newPath = '/' + pathParts.slice(0, trueIndex + 1).join('/');
                                            console.log('[TopBar] Navigating to:', newPath);
                                            setCurrentFolder(newPath); // This updates activeFolders and triggers updateProcessedFiles
                                            setExplorerSearchQuery('');
                                        }}
                                        title={`Go to ${part}`}
                                    >
                                        {part}
                                    </span>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* View Switcher (Center-Right) */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mx-4" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button
                        onClick={() => setAppViewMode('standard')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'standard' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Standard Grid View"
                    >
                        <Layout size={14} />
                        <span className="hidden xl:inline">Grid</span>
                    </button>
                    <button
                        onClick={() => setAppViewMode('slideshow')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'slideshow' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Presentation Slideshow View"
                    >
                        <PlayCircle size={14} />
                        <span className="hidden xl:inline">Show</span>
                    </button>
                    <button
                        onClick={() => setAppViewMode('gallery')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'gallery' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Gallery Scroll View"
                    >
                        <ImageIcon size={14} />
                        <span className="hidden xl:inline">Gallery</span>
                    </button>
                    <button
                        onClick={() => setAppViewMode('editor')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'editor' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Timeline Editor View"
                    >
                        <Film size={14} />
                        <span className="hidden xl:inline">Editor</span>
                    </button>
                    <div className="w-px h-5 bg-white/10 mx-1"></div>
                    <button
                        onClick={() => setAppViewMode('settings')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'settings' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="App Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span className="hidden xl:inline">Settings</span>
                    </button>
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
