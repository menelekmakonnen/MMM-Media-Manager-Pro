import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import LeftSidebar from './LeftSidebar';
import CenterView from './CenterView';
import RightSidebar from './RightSidebar';

import FullGridView from './FullGridView';
import FolderExplorer from './FolderExplorer';
import TopBar from './TopBar';
import useMediaStore from '../../stores/useMediaStore';

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
    const { globalViewMode } = useMediaStore();

    if (globalViewMode === 'fullGrid') return <FullGridView />;
    if (globalViewMode === 'folderGrid') return <FolderExplorer />;

    return <CenterView />;
};

const MainLayout = () => {
    const {
        nextFile, prevFile, firstFile, lastFile,
        toggleSlideshow, slideshowActive,
        fullscreenMode, toggleFullscreen,
        movieMode, toggleMovieMode,
        theme, themeMode
    } = useMediaStore();

    React.useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-mode', themeMode);
    }, [theme, themeMode]);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowRight', 'ArrowLeft', 'Home', 'End', ' ', 'Escape', 'f', 'F', 'm', 'M'].includes(e.key)) {
                // e.preventDefault(); 
            }
            if (e.key === 'ArrowRight') nextFile();
            if (e.key === 'ArrowLeft') prevFile();
            if (e.key === 'Home') firstFile();
            if (e.key === 'End') lastFile();
            if (e.key === ' ') toggleSlideshow();
            if (e.key === 'Escape') {
                if (fullscreenMode) toggleFullscreen();
                if (movieMode) toggleMovieMode();
            }
            if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey) toggleFullscreen();
            if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey) toggleMovieMode();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextFile, prevFile, firstFile, lastFile, toggleSlideshow, slideshowActive, fullscreenMode, toggleFullscreen, movieMode, toggleMovieMode]);

    // FULLSCREEN or MOVIE MODE: Immersive viewing
    if (fullscreenMode || (movieMode && slideshowActive)) {
        return (
            <div className="h-full w-full bg-black relative group">
                <CenterView />
                {/* Minimal Overlay for Movie Mode when active */}
                <div className="absolute top-0 inset-x-0 h-1 z-50 hover:h-12 transition-all opacity-0 hover:opacity-100 bg-gradient-to-b from-black/80 to-transparent flex items-center px-4 overflow-hidden">
                    <button onClick={toggleMovieMode} className="text-[var(--text-secondary)] hover:text-white text-xs font-bold uppercase tracking-widest">Exit Movie Mode [M]</button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans relative">
            {/* 1. Top Bar (Hidable in Movie Mode) */}
            {!movieMode && <TopBar />}

            {/* 2. Main Workspace (Resizable) */}
            <div className="flex-1 overflow-hidden relative">
                <PanelGroup direction="vertical">

                    {/* Upper Section: Sidebar + Content */}
                    <Panel minSize={movieMode ? 100 : 50}>
                        <PanelGroup direction="horizontal">
                            {/* Left Sidebar */}
                            {!movieMode && (
                                <>
                                    <Panel defaultSize={18} minSize={15} maxSize={25} collapsible={true} className="z-10">
                                        <LeftSidebar />
                                    </Panel>
                                    <ResizeHandleVertical />
                                </>
                            )}

                            {/* Center + Right */}
                            <Panel minSize={50}>
                                <MainContentPanel />
                            </Panel>

                            {/* Right Sidebar (Optional) */}
                            {!movieMode && (
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
        </div>
    );
};

export default MainLayout;
