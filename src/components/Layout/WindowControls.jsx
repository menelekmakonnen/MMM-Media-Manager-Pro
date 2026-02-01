import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const WindowControls = () => {
    const isElectron = !!window.electronAPI;

    return (
        <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
            {/* Minimize */}
            <button
                onClick={() => isElectron ? window.electronAPI.minimize() : console.log('Minimize (Web Mode)')}
                className="w-12 h-full flex items-center justify-center hover:bg-white/5 text-[var(--text-dim)] hover:text-white transition-all duration-200"
                title={isElectron ? "Minimize" : "Minimize (Simulation)"}
            >
                <Minus size={16} strokeWidth={1.5} />
            </button>

            {/* Maximize/Restore */}
            <button
                onClick={() => isElectron ? window.electronAPI.maximize() : console.log('Maximize (Web Mode)')}
                className="w-12 h-full flex items-center justify-center hover:bg-white/5 text-[var(--text-dim)] hover:text-white transition-all duration-200"
                title={isElectron ? "Maximize" : "Maximize (Simulation)"}
            >
                <Square size={12} strokeWidth={1.5} />
            </button>

            {/* Close */}
            <button
                onClick={() => isElectron ? window.electronAPI.close() : alert('Close button clicked. In a browser, please close the tab manually.')}
                className="w-12 h-full flex items-center justify-center hover:bg-red-500/80 text-[var(--text-dim)] hover:text-white transition-all duration-200"
                title={isElectron ? "Close" : "Close (Simulation)"}
            >
                <X size={18} strokeWidth={1.5} />
            </button>
        </div>
    );
};

export default WindowControls;
