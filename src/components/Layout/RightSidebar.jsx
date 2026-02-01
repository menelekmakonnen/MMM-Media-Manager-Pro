import React, { useEffect, useState } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { FileType, Calendar, HardDrive, BarChart2, Image as ImageIcon, Film, Filter, ChevronUp, ChevronDown, Check } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const FilterSection = ({ title, expanded = true, children }) => {
    const [isExpanded, setIsExpanded] = useState(expanded);
    return (
        <div className="border-b border-white/5 last:border-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-2 text-[10px] font-bold text-[var(--text-dim)] hover:text-white uppercase tracking-wider hover:bg-white/5 transition-colors"
            >
                {title}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {isExpanded && <div className="p-2 pt-0 space-y-2">{children}</div>}
        </div>
    );
}

const SortToggle = ({ field, label }) => {
    // Single Select Logic: Verify mutual exclusivity
    const { sortStack, setSortStack } = useMediaStore();
    const activeSort = sortStack.find(s => s.field === field);

    // Check if this field is the primary (first) sort
    const isPrimary = sortStack[0]?.field === field;

    const handleClick = () => {
        // Enforce single-select sort behavior as per UI (Radio button style)
        // This calculates the new order (flip if already active) and sets it as the ONLY sort (replacing others)
        const newOrder = activeSort?.order === 'asc' ? 'desc' : 'asc';
        setSortStack([{ field, order: newOrder }]);
    };

    return (
        <button
            onClick={handleClick}
            className={clsx(
                "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all",
                isPrimary ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
            )}
        >
            <span className="font-medium">{label}</span>
            {isPrimary && (
                <span className="text-[9px] font-mono bg-[var(--accent-primary)] text-white px-1 rounded">
                    {activeSort?.order === 'asc' ? 'ASC' : 'DESC'}
                </span>
            )}
        </button>
    );
};

const RightSidebar = () => {
    const {
        getSortedFiles,
        theme, setTheme,
        metadataFilters, setMetadataFilters
    } = useMediaStore();

    return (
        <div className="h-full w-full glass-sidebar border-l border-[var(--glass-border)] flex flex-col text-[10px]">
            {/* --- TOP SECTION: FILTERS & SORT --- */}
            <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col min-h-0 bg-black/10">
                <div className="px-3 py-2 border-b border-white/5 flex items-center bg-black/20 shrink-0 sticky top-0 backdrop-blur-md z-10">
                    <span className="font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-1 uppercase">
                        <Filter size={10} /> Refining
                    </span>
                </div>

                <div className="p-0">
                    {/* METADATA FILTERS */}
                    <FilterSection title="Metadata Filters" expanded={true}>
                        <div className="space-y-3">
                            {/* Aspect Ratio */}
                            <div>
                                <span className="text-[9px] uppercase font-bold text-[var(--text-dim)] mb-1 block">Aspect Ratio</span>
                                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'landscape', label: 'Landscape' },
                                        { id: 'portrait', label: 'Portrait' },
                                        { id: 'square', label: 'Square' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setMetadataFilters({ aspectRatio: opt.id })}
                                            className={clsx(
                                                "px-2 py-1 rounded-full text-[9px] whitespace-nowrap transition-all",
                                                metadataFilters.aspectRatio === opt.id
                                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                    : "bg-white/5 text-[var(--text-dim)] hover:text-white"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Name Length */}
                            <div>
                                <span className="text-[9px] uppercase font-bold text-[var(--text-dim)] mb-1 block">Name Length</span>
                                <div className="flex gap-1">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'short', label: 'Short' },
                                        { id: 'medium', label: 'Med' },
                                        { id: 'long', label: 'Long' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setMetadataFilters({ nameLength: opt.id })}
                                            className={clsx(
                                                "flex-1 py-1 rounded text-[9px] transition-all",
                                                metadataFilters.nameLength === opt.id
                                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                    : "bg-white/5 text-[var(--text-dim)] hover:text-white"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FilterSection>

                    {/* SORTING STACK */}
                    <FilterSection title="Sorting Order" expanded={true}>
                        <div className="space-y-1">
                            <SortToggle field="name" label="Name" />
                            <SortToggle field="date" label="Date Modified" />
                            <SortToggle field="size" label="Size" />
                            <SortToggle field="nameLength" label="Name Length" />
                            <SortToggle field="dimensions" label="Dimensions (Area)" />
                            <SortToggle field="aspectRatio" label="Aspect Ratio" />
                            <div className="h-px bg-white/5 my-1" />
                            <SortToggle field="path" label="Default (Path)" />
                        </div>
                    </FilterSection>
                </div>
            </div>

            {/* --- BOTTOM SECTION: REMOVED (Redundant) --- */}
        </div>
    );
};

export default RightSidebar;
