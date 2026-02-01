import React, { useRef, useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import MenuBar from './MenuBar'; // Replaces TopBar
import LeftSidebar from './LeftSidebar';
import CenterView from './CenterView';
import BottomTray from './BottomTray';
import useMediaStore from '../../stores/useMediaStore';
import UserGuide from '../UserGuide'; // New Modal

const Layout = () => {
    const theme = useMediaStore((state) => state.theme);
    const themeMode = useMediaStore((state) => state.themeMode);
    const fullscreenMode = useMediaStore((state) => state.fullscreenMode);
    const [guideOpen, setGuideOpen] = useState(false);

    // THEME ENGINE
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-mode', themeMode);
    }, [theme, themeMode]);

    return (
        <div className="h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-display flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* New Menu Bar */}
            {!fullscreenMode && <MenuBar onOpenGuide={() => setGuideOpen(true)} />}

            {/* Main Content Area */}
            <div className="flex-1 w-full overflow-hidden relative">
                {fullscreenMode ? (
                    <CenterView />
                ) : (
                    <PanelGroup direction="horizontal" autoSaveId="mmm-layout-h" className="h-full w-full">
                        {/* Sidebar */}
                        <Panel defaultSize={20} minSize={15} maxSize={30} className="glass-sidebar z-20">
                            <LeftSidebar />
                        </Panel>

                        <PanelResizeHandle className="w-px bg-[var(--glass-border)] hover:bg-[var(--accent-primary)] transition-colors" />

                        {/* Center & Bottom */}
                        <Panel minSize={50} className="flex flex-col bg-[var(--bg-primary)] relative z-10">
                            <PanelGroup direction="vertical" autoSaveId="mmm-layout-v">
                                <Panel minSize={50} className="relative">
                                    <CenterView />
                                </Panel>

                                <PanelResizeHandle className="h-px bg-[var(--glass-border)] hover:bg-[var(--accent-primary)] transition-colors" />

                                <Panel defaultSize={25} minSize={10} maxSize={40} className="glass-panel z-20">
                                    <BottomTray />
                                </Panel>
                            </PanelGroup>
                        </Panel>
                    </PanelGroup>
                )}
            </div>

            {/* Modals */}
            <UserGuide isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
        </div>
    );
};

export default Layout;
