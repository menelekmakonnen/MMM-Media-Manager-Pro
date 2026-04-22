import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import LeftSidebar from './LeftSidebar';
import CenterView from './CenterView';
import RightSidebar from './RightSidebar';

import FullGridView from './FullGridView';
import FolderExplorer from './FolderExplorer';
import TopBar from './TopBar';
import TitleBar from './TitleBar';
import useMediaStore from '../../stores/useMediaStore';
import GalleryView from './Views/GalleryView';
import SlideshowView from './Views/SlideshowView';
import EditorView from './Views/EditorView';
import SettingsView from './Views/SettingsView';
import StudioView from '../Studio/StudioView';
import { updateAppIcons } from '../../utils/LogoGenerator';
import { useKeyboardBindings } from '../../hooks/useKeyboardBindings';
import TrailerModal from '../Trailer/TrailerModal';
import TrailerRouter from '../Trailer/TrailerRouter';

const ResizeHandleVertical = () => (
    <PanelResizeHandle className="w-1 hover:w-1.5 bg-transparent hover:bg-[var(--accent-glow)] transition-all duration-300 flex flex-col justify-center items-center outline-none z-50 group">
        <div className="h-8 w-0.5 bg-[var(--glass-border)] group-hover:bg-[var(--accent-primary)] rounded-full transition-colors duration-300" />
    </PanelResizeHandle>
);

const ResizeHandleHorizontal = () => (
    <PanelResizeHandle className="h-1 hover:h-1.5 bg-transparent hover:bg-[var(--accent-glow)] transition-all duration-300 flex justify-center items-center outline-none z-50 group">
        <div className="w-8 h-0.5 bg-[var(--glass-border)] group-hover:bg-[var(--accent-primary)] rounded-full transition-colors duration-300" />
    </PanelResizeHandle>
);

const MainContentPanel = () => {
    const { appViewMode, globalViewMode } = useMediaStore();

    if (appViewMode === 'gallery') return <GalleryView />;
    if (appViewMode === 'settings') return <SettingsView />;
    if (appViewMode === 'trailer') return <TrailerRouter />;
    if (appViewMode === 'studio') return <StudioView />;

    if (globalViewMode === 'fullGrid') return <FullGridView />;
    if (globalViewMode === 'folderGrid') return <FolderExplorer />;

    return <CenterView />;
};

const MainLayout = () => {
    const {
        nextFile, prevFile, firstFile, lastFile,
        toggleSlideshow, slideshowActive,
        appViewMode,
        fullscreenMode, toggleFullscreen,
        movieMode, toggleMovieMode,
        cinemaMode, // New
        theme, themeMode,
        setAppViewMode,
        slideshowIdle,
        mediaContextMenu, setMediaContextMenu,
        isTrailerModalOpen
    } = useMediaStore();

    React.useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-mode', themeMode);

        // Force correct window title for Windows taskbar
        document.title = 'MMMedia Darkroom';
        
        // Update the dynamic SVG application icon and taskbar icon using the new computed accent color
        setTimeout(() => {
            const accentColor = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim() || '#3b82f6';
            updateAppIcons(accentColor);
        }, 50);
    }, [theme, themeMode]);

    // === KEYBOARD BINDINGS ===
    useKeyboardBindings();

    // Sync Fullscreen with Electron (Side Effect)
    React.useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.toggleFullscreen();
        }
    }, [fullscreenMode]);

    // SLIDESHOW VIEW (Highest Priority)
    if (appViewMode === 'slideshow') {
        return (
            <div className="h-full w-full flex flex-col bg-black relative">
                <TitleBar />
                <div className="flex-1 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 z-[60] transition-opacity duration-300 ${slideshowIdle ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
                        <TopBar />
                    </div>
                    <SlideshowView />
                </div>
            </div>
        );
    }

    // FULLSCREEN or MOVIE MODE: Immersive viewing (Standard Grid)
    if (fullscreenMode || (movieMode && slideshowActive)) {
        return (
            <div className="h-full w-full flex flex-col bg-black relative group">
                <TitleBar />
                <div className="flex-1 relative overflow-hidden">
                    <CenterView />
                    {/* Minimal Overlay for Movie Mode when active */}
                    <div className="absolute top-0 inset-x-0 h-1 z-50 hover:h-12 transition-all opacity-0 hover:opacity-100 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 overflow-hidden">
                        <button onClick={toggleMovieMode} className="text-[var(--text-secondary)] hover:text-white text-xs font-bold uppercase tracking-widest">Exit Movie Mode [M]</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-transparent text-[var(--text-primary)] font-sans relative">
            <TitleBar />
            {/* 1. Top Bar (Hidable in Movie Mode) */}
            {!movieMode && <TopBar />}

            {/* 2. Main Workspace (Resizable) */}
            <div className="flex-1 overflow-hidden relative">
                <PanelGroup direction="vertical">

                    {/* Upper Section: Sidebar + Content */}
                    <Panel minSize={movieMode ? 100 : 50}>
                        <PanelGroup direction="horizontal">
                            {/* Left Sidebar */}
                            {!movieMode && !cinemaMode && appViewMode !== 'gallery' && appViewMode !== 'editor' && appViewMode !== 'settings' && appViewMode !== 'trailer' && appViewMode !== 'stream' && (
                                <>
                                    <Panel defaultSize={18} minSize={15} maxSize={25} collapsible={true} className="z-10">
                                        <LeftSidebar />
                                    </Panel>
                                    <ResizeHandleVertical />
                                </>
                            )}

                            {/* Center + Right */}
                            <Panel minSize={50} className="relative z-0 bg-transparent">
                                <MainContentPanel />
                            </Panel>

                            {/* Right Sidebar (Optional) */}
                            {!movieMode && !cinemaMode && appViewMode !== 'gallery' && appViewMode !== 'editor' && appViewMode !== 'settings' && appViewMode !== 'trailer' && appViewMode !== 'stream' && (
                                <>
                                    <ResizeHandleVertical />
                                    <Panel defaultSize={12} minSize={8} maxSize={18} collapsible={true} className="z-10">
                                        <RightSidebar />
                                    </Panel>
                                </>
                            )}
                        </PanelGroup>
                    </Panel>



                </PanelGroup>

                {/* SLIDE-OUT Navigation Trigger for Movie Mode */}
                {movieMode && (
                    <div className="absolute bottom-0 inset-x-0 h-1 z-50 hover:h-24 transition-all opacity-0 hover:opacity-100 bg-gradient-to-t from-black/90 to-transparent">
                        <div className="h-full flex flex-col justify-end p-2 px-6">
                            <div className="flex items-center justify-between">
                                <button onClick={toggleMovieMode} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white">
                                    <span className="text-xs font-bold uppercase">Exit Movie Mode [M]</span>
                                </button>
                                <div className="flex gap-4">
                                    <button onClick={prevFile} className="text-white hover:text-[var(--accent-primary)] transition-colors">PREV</button>
                                    <button onClick={toggleSlideshow} className="text-white font-bold hover:text-[var(--accent-primary)] transition-colors">{slideshowActive ? 'PAUSE' : 'PLAY'}</button>
                                    <button onClick={nextFile} className="text-white hover:text-[var(--accent-primary)] transition-colors">NEXT</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Context Menu */}
            {mediaContextMenu && (
                <div 
                    className="fixed inset-0 z-[9999]" 
                    onContextMenu={(e) => { e.preventDefault(); setMediaContextMenu(null); }}
                    onClick={() => setMediaContextMenu(null)}
                >
                    <div 
                        className="absolute bg-[#11111a] border border-white/10 shadow-2xl rounded-lg py-1 flex flex-col min-w-[200px] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                        style={{ 
                            left: Math.min(mediaContextMenu.x, window.innerWidth - 250), 
                            top: Math.min(mediaContextMenu.y, window.innerHeight - 100) 
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-[var(--accent-primary)] hover:text-white transition-colors text-white/80"
                            onClick={() => {
                                useMediaStore.getState().sendToEditor(mediaContextMenu.file, 0, true);
                                setMediaContextMenu(null);
                            }}
                        >
                            Add to Edit (Entire Clip)
                        </button>
                        <button 
                            className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-[var(--accent-primary)] hover:text-white transition-colors text-white/80"
                            onClick={() => {
                                const frame = Math.floor(mediaContextMenu.currentTime * 30);
                                useMediaStore.getState().sendToEditor(mediaContextMenu.file, frame, false);
                                setMediaContextMenu(null);
                            }}
                        >
                            Add to Edit (From current playback)
                        </button>
                        <div className="h-px bg-white/10 my-1 mx-2" />
                        <button 
                            className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-purple-600 hover:text-white transition-colors text-purple-300 flex items-center justify-between"
                            onClick={() => {
                                const store = useMediaStore.getState();
                                // Ensure this file is selected if no others are
                                if (store.explorerSelectedFiles.size === 0) {
                                    store.setExplorerSelectedFiles(new Set([mediaContextMenu.file.path]));
                                }
                                store.setAppViewMode('trailer');
                                setMediaContextMenu(null);
                            }}
                        >
                            <span>Make a Trailer</span>
                            <span>🪄</span>
                        </button>
                        <div className="h-px bg-white/10 my-1 mx-2" />
                        {/* Open in Windows File Explorer */}
                        <button 
                            className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-colors text-emerald-300 flex items-center justify-between"
                            onClick={() => {
                                const filePath = mediaContextMenu.file?.path || mediaContextMenu.file?.folderPath;
                                if (filePath && window.electronAPI?.showItemInFolder) {
                                    window.electronAPI.showItemInFolder(filePath);
                                }
                                setMediaContextMenu(null);
                            }}
                        >
                            <span>Open in File Explorer</span>
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0">
                                <path d="M2 5V13a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H8L6.5 4.5A1 1 0 005.8 4H3a1 1 0 00-1 1z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Trailer Modal Overlay */}
            {isTrailerModalOpen && <TrailerModal />}
        </div>
    );
};

export default MainLayout;
