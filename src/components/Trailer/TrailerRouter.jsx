import React, { useState, useEffect } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { TrailerView } from './TrailerView';
import TrailerModal from './TrailerModal';
import { ChevronLeft, Wand2, Play, Bookmark, Download } from 'lucide-react';
import clsx from 'clsx';

// Lazy-load editor sub-tabs with named export resolution
const EditsTab = React.lazy(() => import('../../features/Edits/EditsTab').then(m => ({ default: m.EditsTab })));
const ExportTab = React.lazy(() => import('../../features/Export/ExportTab').then(m => ({ default: m.ExportTab })));

const TRAILER_TABS = [
    { id: 'wizard', label: 'Wizard', icon: Wand2 },
    { id: 'player', label: 'Player', icon: Play },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'export', label: 'Export', icon: Download },
];

const SuspenseFallback = ({ label }) => (
    <div className="w-full h-full flex items-center justify-center text-white/20">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/10 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Loading {label}...</span>
        </div>
    </div>
);

const TrailerRouter = () => {
    const { trailerDraftSequence, explorerSelectedFiles, setAppViewMode } = useMediaStore();
    const useAllPool = explorerSelectedFiles.size === 0;
    const [activeTab, setActiveTab] = useState(trailerDraftSequence !== null ? 'player' : 'wizard');

    // Auto-switch to Player tab when a draft sequence is generated
    useEffect(() => {
        if (trailerDraftSequence !== null) {
            setActiveTab('player');
        }
    }, [trailerDraftSequence]);

    const renderContent = () => {
        switch (activeTab) {
            case 'wizard':
                return (
                    <div className="w-full h-full relative overflow-y-auto">
                        <TrailerModal isEmbedded={true} useAllPoolOverride={useAllPool} />
                    </div>
                );
            case 'player':
                if (trailerDraftSequence !== null) {
                    return <TrailerView />;
                }
                return (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                        <div className="text-center">
                            <Play size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm font-bold uppercase tracking-wider">No trailer generated yet</p>
                            <p className="text-xs mt-2 text-white/20">Use the Wizard tab to create a trailer first</p>
                        </div>
                    </div>
                );

            case 'saved':
                return (
                    <React.Suspense fallback={<SuspenseFallback label="Saved Edits" />}>
                        <EditsTab />
                    </React.Suspense>
                );
            case 'export':
                return (
                    <React.Suspense fallback={<SuspenseFallback label="Export" />}>
                        <ExportTab />
                    </React.Suspense>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full flex bg-[#0a0a0f]">
            {/* Left Sidebar Navigation */}
            <div className="w-14 hover:w-36 transition-all duration-200 flex flex-col border-r border-white/10 bg-black/60 backdrop-blur-md shrink-0 overflow-hidden group/sidebar">
                {/* Back Button */}
                <button 
                    onClick={() => setAppViewMode('standard')}
                    className="flex items-center gap-2 px-4 py-3 text-white/30 hover:text-white hover:bg-white/5 transition-all border-b border-white/5"
                    title="Back to Standard View"
                >
                    <ChevronLeft size={16} className="shrink-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity">Back</span>
                </button>

                {/* Tab Buttons */}
                <div className="flex-1 flex flex-col py-2 gap-0.5">
                    {TRAILER_TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-r-2 border-[var(--accent-primary)]"
                                        : "text-white/40 hover:bg-white/5 hover:text-white"
                                )}
                                title={tab.label}
                            >
                                <Icon size={16} className="shrink-0" />
                                <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 relative">
                {renderContent()}
            </div>
        </div>
    );
};

export default TrailerRouter;
