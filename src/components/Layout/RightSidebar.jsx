import React, { useEffect, useState } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import clsx from 'clsx';
import { FileType, Calendar, HardDrive, Maximize, RectangleHorizontal, Filter, ChevronUp, ChevronDown, Shuffle, LayoutGrid, Square, Columns, Columns3, Grid2X2, Table, Grid3X3, Star, Target, Wand2, Folder, Clock, Gauge, Activity, MonitorPlay, Ratio, CalendarDays, CalendarPlus, Type } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const FilterSection = ({ title, expanded = false, children }) => {
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

// === Ctrl+Click Multi-Sort SortToggle ===
const SortToggle = ({ field, label, icon: Icon }) => {
    const { sortStack, setSortStack } = useMediaStore();
    const stackIndex = sortStack.findIndex(s => s.field === field);
    const isActive = stackIndex >= 0;
    const isPrimary = stackIndex === 0;
    const activeSort = isActive ? sortStack[stackIndex] : null;

    const handleClick = (e) => {
        if (e.ctrlKey || e.metaKey) {
            // MULTI-SORT: Ctrl+Click to add/remove from stack
            if (isActive) {
                // Remove from stack (but don't remove the last one)
                if (sortStack.length > 1) {
                    setSortStack(sortStack.filter(s => s.field !== field));
                } else {
                    // Flip order on the last remaining sort
                    const newOrder = activeSort.order === 'asc' ? 'desc' : 'asc';
                    setSortStack([{ field, order: newOrder }]);
                }
            } else {
                // Append to stack
                setSortStack([...sortStack, { field, order: 'asc' }]);
            }
        } else {
            // SINGLE-SORT: Normal click replaces the entire stack
            const newOrder = activeSort?.order === 'asc' ? 'desc' : 'asc';
            setSortStack([{ field, order: newOrder }]);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={clsx(
                "w-full flex items-center justify-between p-1.5 rounded text-[11px] transition-all overflow-hidden group/btn",
                isPrimary ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30" 
                    : isActive ? "bg-white/10 text-white border border-white/15" 
                    : "bg-white/5 text-[var(--text-secondary)] border border-white/5 hover:bg-white/10"
            )}
            title={`${label} — Click to sort, Ctrl+Click to stack`}
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Stack position badge */}
                {isActive && sortStack.length > 1 && (
                    <span className="w-4 h-4 flex items-center justify-center bg-[var(--accent-primary)] text-white text-[8px] font-black rounded-full shrink-0">
                        {stackIndex + 1}
                    </span>
                )}
                {Icon && <Icon size={14} className="shrink-0" />}
                <span className="font-medium truncate text-left">{label}</span>
            </div>
            {isActive && (
                <span className={clsx("text-[9px] font-mono px-1 rounded shrink-0 ml-2", isPrimary ? "bg-[var(--accent-primary)] text-white" : "bg-white/20 text-white/70")}>
                    {activeSort?.order === 'asc' ? 'ASC' : 'DSC'}
                </span>
            )}
        </button>
    );
};

// === Animated SVG Icon: Film Reel (for "All in Folder" trailer) ===
const FilmReelIcon = ({ active, className }) => (
    <svg viewBox="0 0 24 24" className={clsx("w-5 h-5 transition-all duration-300", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Reel outer ring */}
        <circle cx="12" cy="12" r="9" className="origin-center group-hover/reel:animate-[spin_2s_linear_infinite]" />
        {/* Center hub */}
        <circle cx="12" cy="12" r="2.5" fill="currentColor" className="opacity-60" />
        {/* Film perforations */}
        <circle cx="12" cy="5" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity" />
        <circle cx="17.95" cy="8.5" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity delay-75" />
        <circle cx="17.95" cy="15.5" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity delay-100" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity delay-150" />
        <circle cx="6.05" cy="15.5" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity delay-200" />
        <circle cx="6.05" cy="8.5" r="1.2" fill="currentColor" className="opacity-40 group-hover/reel:opacity-80 transition-opacity delay-75" />
    </svg>
);

// === Animated SVG Icon: Grid Mosaic (for "Active Grids" trailer) ===
const GridMosaicIcon = ({ active, className }) => (
    <svg viewBox="0 0 24 24" className={clsx("w-5 h-5 transition-all duration-300", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Grid cells with stagger animation */}
        <rect x="3" y="3" width="7" height="7" rx="1.5" className="fill-current opacity-20 group-hover/mosaic:opacity-60 transition-all duration-200" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" className="fill-current opacity-20 group-hover/mosaic:opacity-60 transition-all duration-200 delay-75" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" className="fill-current opacity-20 group-hover/mosaic:opacity-60 transition-all duration-200 delay-100" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" className="fill-current opacity-20 group-hover/mosaic:opacity-60 transition-all duration-200 delay-150" />
        {/* Stroke borders */}
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const RightSidebar = () => {
    const {
        getSortedFiles,
        theme, setTheme,
        metadataFilters, setMetadataFilters,
        shuffleFiles, sortStack, favoritesOnly, setFavoritesOnly,
        // Grid Options
        gridColumns, gridRows, threeGridEqual,
        toggleDual, toggleTriple, toggleQuad, toggleSix, toggleNine, toggleTwelve, setGridLayout,
        setTrailerModalOpen,
        currentFileIndex, processedFiles, pinnedGrids
    } = useMediaStore();

    // Compute what's in the active grids for the "active grids" trailer button
    const handleTrailerWithFolder = () => {
        setTrailerModalOpen(true);
    };

    const handleTrailerWithGrids = () => {
        const totalSlots = gridColumns * gridRows;
        const baseIndex = currentFileIndex < 0 ? 0 : currentFileIndex % Math.max(1, processedFiles.length);
        const gridFiles = [];

        for (let i = 0; i < totalSlots; i++) {
            if (pinnedGrids && pinnedGrids[i]) {
                gridFiles.push(pinnedGrids[i]);
            } else {
                const wrappedIndex = (baseIndex + i) % Math.max(1, processedFiles.length);
                if (processedFiles[wrappedIndex]) {
                    gridFiles.push(processedFiles[wrappedIndex]);
                }
            }
        }

        const store = useMediaStore.getState();
        const paths = new Set(gridFiles.filter(f => f?.path).map(f => f.path));
        store.setExplorerSelectedFiles(paths);
        setTrailerModalOpen(true);
    };

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
                    {/* GENERATORS — Animated SVG Icon Buttons */}
                    <FilterSection title="Make a Trailer" expanded={true}>
                        <div className="flex items-center gap-2">
                            {/* Film Reel: All in Folder */}
                            <button
                                onClick={handleTrailerWithFolder}
                                className="group/reel flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/25 text-purple-300 hover:text-white hover:from-purple-500/40 hover:to-blue-500/40 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95 transition-all duration-200"
                                title="Make Trailer — All Videos in Folder"
                            >
                                <FilmReelIcon className="group-hover/reel:scale-110 group-active/reel:scale-90 transition-transform" />
                            </button>

                            {/* Grid Mosaic: Active Grids */}
                            <button
                                onClick={handleTrailerWithGrids}
                                className="group/mosaic flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/25 text-emerald-300 hover:text-white hover:from-emerald-500/40 hover:to-teal-500/40 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-200 relative"
                                title="Make Trailer — Active Grid Items"
                            >
                                <GridMosaicIcon className="group-hover/mosaic:scale-110 group-active/mosaic:scale-90 transition-transform" />
                                <span className="absolute -top-1 -right-1 text-[8px] font-mono font-black bg-emerald-500/80 text-white w-4 h-4 flex items-center justify-center rounded-full">
                                    {gridColumns * gridRows}
                                </span>
                            </button>
                        </div>
                    </FilterSection>

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

                    {/* SORTING STACK — Ctrl+Click to multi-sort */}
                    <FilterSection title="Sorting Order" expanded={true}>
                        <div className="space-y-1">
                            {sortStack.length > 1 && (
                                <p className="text-[8px] text-white/30 uppercase font-bold tracking-wider px-1 pb-1">
                                    Ctrl+Click to stack sorts
                                </p>
                            )}
                            {/* --- PRIMARY SORTS (Aspect Ratio moved to #3) --- */}
                            <SortToggle field="name" label="Title / Name" icon={Type} />
                            <SortToggle field="folder" label="Folder" icon={Folder} />
                            <SortToggle field="aspectRatio" label="Aspect Ratio" icon={RectangleHorizontal} />
                            <SortToggle field="dateModified" label="Date Modified" icon={Calendar} />
                            <SortToggle field="dateCreated" label="Date Created" icon={CalendarPlus} />
                            <SortToggle field="mediaDate" label="Media Date" icon={CalendarDays} />
                            <SortToggle field="size" label="Size" icon={HardDrive} />
                            <SortToggle field="duration" label="Length / Duration" icon={Clock} />

                            <div className="h-px bg-white/5 my-1" />

                            {/* --- TECHNICAL SORTS --- */}
                            <SortToggle field="dimensions" label="Frame Height × Width" icon={Maximize} />
                            <SortToggle field="framerate" label="Framerate" icon={Gauge} />
                            <SortToggle field="bitrate" label="Bit Rate" icon={Activity} />
                            <SortToggle field="year" label="Year" icon={CalendarDays} />
                            <SortToggle field="type" label="Video / Item Type" icon={MonitorPlay} />


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
                </div>
            </div>

            {/* --- BOTTOM SECTION: REMOVED (Redundant) --- */}
        </div>
    );
};

export default RightSidebar;
