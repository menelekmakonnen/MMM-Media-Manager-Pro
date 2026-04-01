import React from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { TrailerView } from './TrailerView';
import TrailerModal from './TrailerModal';
import { ChevronLeft } from 'lucide-react';

const TrailerRouter = () => {
    const { trailerDraftSequence, explorerSelectedFiles, setAppViewMode } = useMediaStore();
    const useAllPool = explorerSelectedFiles.size === 0;

    // 1. If we have a sequence array (even empty), show TrailerView explicitly so it can generate.
    if (trailerDraftSequence !== null) {
        return <TrailerView />;
    }

    // 2. Otherwise, we are setting up the generator. Show the TrailerModal full-screen wrapper
    return (
        <div className="w-full h-full relative bg-[#0a0a0f] pattern-grid overflow-y-auto">
            <button 
                onClick={() => setAppViewMode('standard')}
                className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/40 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider backdrop-blur"
            >
                <ChevronLeft size={14} /> Back
            </button>
            <TrailerModal isEmbedded={true} useAllPoolOverride={useAllPool} />
        </div>
    );
};

export default TrailerRouter;
