import React from 'react';
import useMediaStore from '../stores/useMediaStore';
import clsx from 'clsx';
import {
    ArrowUpDown, ArrowUp, ArrowDown, FileText, Calendar, HardDrive,
    Image as ImageIcon, Layers, Shuffle, Filter, Play, RefreshCw
} from 'lucide-react';

const SortingControls = ({ compact = false }) => {
    const {
        sortStack, toggleSort, shuffleFiles,
        fileTypeFilter, setFileTypeFilter,
        metadataFilters, setMetadataFilters,
        slideshowActive, toggleSlideshow, slideshowRandom, setSlideshowRandom
    } = useMediaStore();

    const sortBy = sortStack[0]?.field || 'name';
    const sortOrder = sortStack[0]?.order || 'asc';

    const sortOptions = [
        { value: 'name', label: 'Name', icon: FileText },
        { value: 'date', label: 'Date', icon: Calendar },
        { value: 'size', label: 'Size', icon: HardDrive },
        { value: 'type', label: 'Type', icon: ImageIcon },
        { value: 'nameLength', label: 'Length', icon: FileText },
        { value: 'random', label: 'Random', icon: Shuffle },
    ];

    const mediaTypes = [
        { value: 'video', label: 'Video', icon: Play, color: 'text-blue-400', activeBg: 'bg-blue-500' },
        { value: 'image', label: 'Image', icon: ImageIcon, color: 'text-pink-400', activeBg: 'bg-pink-500' },
        { value: 'gif', label: 'GIF', icon: RefreshCw, color: 'text-purple-400', activeBg: 'bg-purple-500' },
    ];

    if (compact) {
        return (
            <div className="flex items-center gap-1.5">
                <button onClick={shuffleFiles} className="p-1 px-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors border border-white/10 active-press"><Shuffle size={12} /></button>
                <select value={sortBy} onChange={(e) => toggleSort(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-[var(--accent-primary)] cursor-pointer">
                    {sortOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>)}
                </select>
                <button onClick={() => toggleSort(sortBy)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors active-press">
                    {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            {/* Media Type Toggles */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                {mediaTypes.map(type => {
                    const isActive = fileTypeFilter.includes(type.value) || fileTypeFilter.includes('all');
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.value}
                            onClick={() => setFileTypeFilter(type.value)}
                            className={clsx(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 active-press",
                                isActive ? `${type.activeBg} text-white shadow-lg` : `text-gray-400 hover:bg-white/5 ${type.color}`
                            )}
                        >
                            <Icon size={14} fill={isActive ? "currentColor" : "none"} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sorting */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
                <button onClick={shuffleFiles} className="p-2 text-gray-400 hover:text-white transition-colors" title="Shuffle Randomly"><Shuffle size={14} /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <div className="flex gap-0.5">
                    {sortOptions.map(opt => {
                        const Icon = opt.icon;
                        const isActive = sortBy === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => toggleSort(opt.value)}
                                className={clsx(
                                    "p-2 rounded-lg transition-all active-press",
                                    isActive ? "bg-[var(--accent-primary)] text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                                title={opt.label}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
                <button onClick={() => toggleSort(sortBy)} className="p-2 ml-1 text-gray-400 hover:text-white border-l border-white/10 pl-3">
                    {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </button>
            </div>

            {/* Metadata Filters */}
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                <div className="flex items-center gap-1.5 px-2 border-r border-white/10">
                    <Filter size={12} className="text-gray-500" />
                    <select
                        value={metadataFilters.aspectRatio}
                        onChange={(e) => setMetadataFilters({ aspectRatio: e.target.value })}
                        className="bg-transparent text-[10px] text-gray-300 outline-none cursor-pointer hover:text-white"
                    >
                        <option value="all" className="bg-gray-900">Ratio: All</option>
                        <option value="horizontal" className="bg-gray-900">Horizontal</option>
                        <option value="vertical" className="bg-gray-900">Vertical</option>
                        <option value="square" className="bg-gray-900">Square</option>
                    </select>
                </div>
                <div className="flex items-center gap-1.5 px-2">
                    <select
                        value={metadataFilters.nameLength}
                        onChange={(e) => setMetadataFilters({ nameLength: e.target.value })}
                        className="bg-transparent text-[10px] text-gray-300 outline-none cursor-pointer hover:text-white"
                    >
                        <option value="all" className="bg-gray-900">Name: All</option>
                        <option value="short" className="bg-gray-900">Short</option>
                        <option value="medium" className="bg-gray-900">Medium</option>
                        <option value="long" className="bg-gray-900">Long</option>
                    </select>
                </div>
            </div>

            {/* Slideshow */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                    onClick={toggleSlideshow}
                    className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all active-press",
                        slideshowActive ? "bg-green-500 text-white shadow-lg animate-pulse" : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Play size={12} fill={slideshowActive ? "currentColor" : "none"} />
                    <span className="text-[10px] font-bold uppercase">{slideshowActive ? 'Running' : 'Slideshow'}</span>
                </button>
            </div>
        </div>
    );
};

export default SortingControls;
