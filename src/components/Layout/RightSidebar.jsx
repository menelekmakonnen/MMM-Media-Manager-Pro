import React, { useEffect, useState } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { FileType, Calendar, HardDrive, Maximize, RectangleHorizontal, Film, Filter, ChevronUp, ChevronDown, Shuffle, LayoutGrid, Square, Columns, Columns3, Grid2X2, Table, Grid3X3, Star, Target } from 'lucide-react';

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

const SortToggle = ({ field, label, icon: Icon }) => {
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
                "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all overflow-hidden group/btn",
                isPrimary ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
            )}
            title={label}
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {Icon && <Icon size={14} className="shrink-0" />}
                <span className="font-medium truncate text-left">{label}</span>
            </div>
            {isPrimary && (
                <span className="text-[9px] font-mono bg-[var(--accent-primary)] text-white px-1 rounded shrink-0 ml-2">
                    {activeSort?.order === 'asc' ? 'ASC' : 'DSC'}
                </span>
            )}
        </button>
    );
};

const RightSidebar = () => {
    const {
        getSortedFiles,
        theme, setTheme,
        metadataFilters, setMetadataFilters,
        shuffleFiles, sortStack, favoritesOnly, setFavoritesOnly,
        showJumpButtons, toggleJumpButtons,
        // Grid Options
        gridColumns, gridRows, threeGridEqual,
        toggleDual, toggleTriple, toggleQuad, toggleSix, toggleNine, toggleTwelve, setGridLayout
    } = useMediaStore();

    return (
        <div className="h-full w-full glass-sidebar border-l border-[var(--glass-border)] flex flex-col text-[10px]">
            {/* --- TOP SECTION: FILTERS & SORT --- */}
            <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col min-h-0 bg-black/10 @container">
                <div className="px-3 py-2 border-b border-white/5 flex items-center bg-black/20 shrink-0 sticky top-0 backdrop-blur-md z-10">
                    <span className="font-bold text-[var(--text-secondary)] tracking-wider flex items-center gap-1 uppercase">
                        <Filter size={10} /> Refining
                    </span>
                </div>

                <div className="p-0">
                    {/* METADATA FILTERS */}
                    <FilterSection title="Metadata Filters" expanded={true}>
                        <div className="space-y-3">
                            {/* Favorites Filter */}
                            <button
                                onClick={() => setFavoritesOnly(!favoritesOnly)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all",
                                    favoritesOnly 
                                        ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 shadow-[inset_0_0_8px_rgba(234,179,8,0.2)]" 
                                        : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
                                )}
                            >
                                <span className="font-bold flex items-center gap-2"><Star size={12} fill={favoritesOnly ? "currentColor" : "none"} /> Favorites Only</span>
                            </button>
                        </div>
                    </FilterSection>

                    {/* UI SETTINGS */}
                    <FilterSection title="UI Settings" expanded={true}>
                        <div className="space-y-3">
                            <button
                                onClick={toggleJumpButtons}
                                className={clsx(
                                    "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all",
                                    showJumpButtons 
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]" 
                                        : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
                                )}
                            >
                                <span className="font-bold flex items-center gap-2">
                                    <div className={clsx("w-2 h-2 rounded-full", showJumpButtons ? "bg-blue-400" : "bg-white/20")} />
                                    Show Jump Bubble
                                </span>
                            </button>
                        </div>
                    </FilterSection>

                    {/* SORTING STACK */}
                    <FilterSection title="Sorting Order" expanded={true}>
                        <div className="space-y-1">
                            <SortToggle field="name" label="Name" icon={FileType} />
                            <SortToggle field="date" label="Date Modified" icon={Calendar} />
                            <SortToggle field="size" label="Size" icon={HardDrive} />
                            <SortToggle field="dimensions" label="Dimensions (Area)" icon={Maximize} />
                            <SortToggle field="aspectRatio" label="Aspect Ratio" icon={RectangleHorizontal} />
                            <div className="h-px bg-white/5 my-1" />
                            <SortToggle field="path" label="Default (Path)" icon={Film} />
                            
                            <button
                                onClick={() => shuffleFiles()}
                                className={clsx(
                                    "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all overflow-hidden",
                                    sortStack[0]?.field === 'random' ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
                                )}
                                title="Randomize"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Shuffle size={14} className="shrink-0" />
                                    <span className="font-medium truncate text-left">Randomize</span>
                                </div>
                                {sortStack[0]?.field === 'random' && (
                                    <span className="text-[9px] font-mono bg-[var(--accent-primary)] text-white px-1 rounded shrink-0 ml-2">
                                        RND
                                    </span>
                                )}
                            </button>
                        </div>
                    </FilterSection>

                    {/* GRID LAYOUT */}
                    <FilterSection title="Grid Layout" expanded={true}>
                        <div className="grid grid-cols-2 lg:grid-cols-2 gap-1.5 overflow-hidden">
                            <button onClick={() => setGridLayout(1, 1)} title="Single Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns === 1 && gridRows === 1) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Square size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Single</span>
                            </button>
                            <button onClick={toggleDual} title="Dual Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns * gridRows === 2) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Columns size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Dual</span>
                            </button>
                            <button onClick={toggleTriple} title="Triple Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns * gridRows === 3) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Columns3 size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Triple</span>
                            </button>
                            <button onClick={toggleQuad} title="Quad Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns * gridRows === 4) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Grid2X2 size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Quad (4)</span>
                            </button>
                            <button onClick={toggleSix} title="Six Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns * gridRows === 6) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Table size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Six (6)</span>
                            </button>
                            <button onClick={toggleNine} title="Nine Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden", (gridColumns === 3 && gridRows === 3) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <Grid3X3 size={14} className="shrink-0" />
                                <span className="font-medium truncate text-left text-[10px] hidden @min-w-[10rem]:block">Nine (9)</span>
                            </button>
                            <button onClick={toggleTwelve} title="Twelve Grid" className={clsx("flex items-center gap-2 p-1.5 rounded text-[11px] transition-all overflow-hidden col-span-full justify-center", (gridColumns * gridRows === 12) ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10")}>
                                <LayoutGrid size={14} className="shrink-0" />
                                <span className="font-medium truncate text-[10px]">Twelve (12)</span>
                            </button>
                        </div>
                    </FilterSection>
                </div>
            </div>

            {/* --- BOTTOM SECTION: REMOVED (Redundant) --- */}
        </div>
    );
};

export default RightSidebar;
