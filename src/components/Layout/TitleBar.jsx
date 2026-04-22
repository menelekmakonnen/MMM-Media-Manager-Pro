import React from 'react';
import { Minus, Square, X, ChevronRight } from 'lucide-react';
import useMediaStore from '../../stores/useMediaStore';
import BridgeStatus from '../BridgeStatus';
import DarkroomLogo from '../DarkroomLogo';

const TitleBar = () => {
    const { fullscreenMode, currentFolder, setCurrentFolder, setExplorerSearchQuery } = useMediaStore();
    const pathParts = currentFolder ? currentFolder.split('/').filter(Boolean) : [];

    // Hide custom titlebar natively when in true immersive fullscreen
    if (fullscreenMode) return null;

    return (
        <div 
            className="w-full h-8 flex items-center justify-between bg-[#050510] text-white/50 text-xs border-b border-white/5 select-none z-[9999]"
            style={{ WebkitAppRegion: 'drag', flexShrink: 0 }}
        >
            <div className="flex items-center px-3 gap-2 pointer-events-none w-1/4">
                <DarkroomLogo size={14} />
                <span className="font-bold tracking-widest uppercase text-[10px] truncate">MMMedia Darkroom</span>
            </div>
            
            {/* Center: Breadcrumbs Navigation */}
            <div className="flex-1 flex justify-center overflow-hidden">
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' }}>
                    <span
                        className="hover:text-white cursor-pointer transition-colors shrink-0 font-bold uppercase tracking-widest"
                        onClick={() => setExplorerSearchQuery('')}
                    >
                        Library
                    </span>
                    {pathParts.slice(-4).map((part, i, arr) => {
                        const trueIndex = (pathParts.length - arr.length) + i;
                        return (
                            <React.Fragment key={i}>
                                <ChevronRight size={10} className="text-white/20 shrink-0" />
                                <span
                                    className="hover:text-white cursor-pointer transition-colors truncate max-w-[150px] shrink-0 font-medium tracking-wide"
                                    onClick={() => {
                                        const newPath = '/' + pathParts.slice(0, trueIndex + 1).join('/');
                                        setCurrentFolder(newPath);
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
            
            <div className="flex h-full w-1/4 justify-end shrink-0 items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
                {/* Pro Bridge Status */}
                <BridgeStatus compact />
                <button 
                    onClick={() => window.electronAPI?.minimize()}
                    className="h-full px-4 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center pointer-events-auto"
                    title="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button 
                    onClick={() => window.electronAPI?.maximize()}
                    className="h-full px-4 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center pointer-events-auto"
                    title="Maximize / Restore"
                >
                    <Square size={11} strokeWidth={2.5} />
                </button>
                <button 
                    onClick={() => window.electronAPI?.close()}
                    className="h-full px-4 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center pointer-events-auto group"
                    title="Close"
                >
                    <X size={14} className="group-hover:text-white" />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
