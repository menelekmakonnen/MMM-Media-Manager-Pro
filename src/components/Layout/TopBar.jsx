import React, { useEffect, useState } from 'react';
import { ChevronRight, RefreshCw, Trash2, FolderOpen, Plus, XOctagon, Layout, Image as ImageIcon, PlayCircle, Maximize, Minimize, Film, Wand2, LayoutDashboard } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import { clearThumbnailCache } from '../../utils/thumbnailCache';
import { openDirectory } from '../../utils/fileSystem';
import { saveFolderHandle } from '../../utils/persistence';
import clsx from 'clsx';
import DarkroomLogo from '../DarkroomLogo';

import WindowControls from './WindowControls';

const TopBar = () => {
    const {
        currentFolder, isScanning, startScan, cancelScan, setFolderHandle, setCurrentFolder,
        explorerSearchQuery, setExplorerSearchQuery,
        appViewMode, setAppViewMode, setGlobalViewMode, theme,
        mediaFitMode, toggleMediaFitMode,
        trailerDraftSequence, trailerUnsavedPromptEnabled, clearTrailerDraftSequence
    } = useMediaStore();
    
    const [showTrailerWarning, setShowTrailerWarning] = useState(false);

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

    const executeFolderOpen = async () => {
        try {
            const handle = await openDirectory();
            if (handle) {
                setFolderHandle(handle);
                setCurrentFolder('/' + handle.name);
                saveFolderHandle(handle);
                startScan(handle);
                if (trailerDraftSequence && trailerDraftSequence.length > 0) {
                    clearTrailerDraftSequence();
                }
            }
        } catch (error) {
            console.error('[TopBar] Error opening folder:', error);
        }
    };

    const handleOpenFolder = () => {
        if (trailerDraftSequence && trailerDraftSequence.length > 0 && trailerUnsavedPromptEnabled) {
            setShowTrailerWarning(true);
        } else {
            executeFolderOpen();
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
            {/* Safety Modal overlay for Trailer */}
            {showTrailerWarning && (
                <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-[#11111a] border border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.2)] rounded-2xl p-6 text-center">
                        <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-4 outline outline-red-500/20">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2 tracking-tight">Discard Unsaved Trailer?</h2>
                        <p className="text-sm text-white/50 mb-6 font-medium leading-relaxed">
                            Opening a new library will completely wipe your current unsaved Trailer Draft. Are you sure you wish to proceed? You can save it as an Edit first via the Trailer menu.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => setShowTrailerWarning(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all shadow border border-white/5 hover:border-white/20 active-press"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={() => {
                                    setShowTrailerWarning(false);
                                    executeFolderOpen();
                                }}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 hover:bg-red-400 text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] active-[0.98]"
                            >
                                DISCARD IT
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Left: Branding & Breadcrumbs */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-[#0F1115] border-b border-white/5 select-none"
                style={{ WebkitAppRegion: 'drag' }}
            >
                {/* Left: Branding & Window Controls */}
                <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'drag' }}>

                    {/* Branding */}
                    <button
                        className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                        onClick={() => {
                            const modes = ['standard', 'studio', 'slideshow', 'gallery', 'trailer', 'settings'];
                            const next = modes[(modes.indexOf(appViewMode) + 1) % modes.length];
                            setAppViewMode(next);
                        }}
                        style={{ WebkitAppRegion: 'no-drag' }}
                        title="Toggle View Mode"
                    >
                        <DarkroomLogo size={32} title="MMMedia Darkroom" />
                        <div className="flex flex-col items-start justify-center h-8">
                            <h1 className="text-[1.15rem] font-black tracking-tight leading-none text-white/90 drop-shadow-sm flex items-center gap-1.5 pt-0.5">
                                MMMedia <span className="font-light text-[var(--accent-primary)]/90 tracking-widest uppercase text-xs">Darkroom</span>
                            </h1>
                        </div>
                    </button>
                </div>

                <div className="flex-1 max-w-2xl px-8 flex items-center gap-3">
                    {/* Spacer */}
                    <div className="flex-1" />
                </div>

                {/* View Switcher (Center-Right) */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 mx-4" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button
                        onClick={() => setAppViewMode('studio')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex-shrink-0",
                            appViewMode === 'studio' ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Studio Dashboard"
                    >
                        <LayoutDashboard size={14} />
                        <span className="hidden xl:inline">Studio</span>
                    </button>
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
                        onClick={() => setAppViewMode('trailer')}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            appViewMode === 'trailer' ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                        title="Trailer Generator"
                    >
                        <Wand2 size={14} />
                        <span className="hidden xl:inline">Trailer</span>
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
                </button>
            </div>
        </div>
    );
};

export default TopBar;
