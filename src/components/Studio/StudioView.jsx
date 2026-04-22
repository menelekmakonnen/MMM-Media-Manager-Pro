import React, { useState, useCallback, memo } from 'react';
import {
    Folder, Film, Image as ImageIcon, HardDrive, Clock,
    ChevronRight, BarChart2, Monitor, Wifi, WifiOff,
    Layers, Activity, Maximize, LayoutGrid, FileText,
    RefreshCw, Gauge, Square, Send, Play, Ratio,
    Database, Zap, Box, ArrowRight, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import useMediaStore from '../../stores/useMediaStore';
import useStudioStats from './useStudioStats';
import { DrillModal, FileListModal, ConsoleLogModal, FolderDetailModal } from './StudioModals';

// --- Reusable Card Shell ---
const Card = memo(({ title, icon: Icon, children, accent = 'var(--accent-primary)', onClick, className }) => (
    <div className={clsx(
        "bg-[#0a0a16] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all",
        onClick && "cursor-pointer hover:bg-white/[0.02]", className
    )} onClick={onClick}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
            {Icon && <Icon size={13} style={{ color: accent }} />}
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/60">{title}</h3>
            {onClick && <ChevronRight size={10} className="ml-auto text-white/20" />}
        </div>
        <div className="p-4">{children}</div>
    </div>
));

// --- Stat Pill (now with drill-down arrow indicator) ---
const Stat = memo(({ icon: Icon, label, value, color = 'white', onClick }) => (
    <button onClick={onClick} className={clsx("flex flex-col items-center p-3 bg-white/[0.03] rounded-lg border border-white/5 min-w-0 flex-1 transition-all group/stat relative", onClick && "hover:bg-white/[0.06] hover:border-white/10 cursor-pointer")}>
        {Icon && <Icon size={14} className="mb-1.5" style={{ color }} />}
        <span className="text-lg font-black text-white leading-none">{value}</span>
        <span className="text-[8px] text-white/40 uppercase font-bold mt-1 tracking-wide">{label}</span>
        {onClick && (
            <ExternalLink size={8} className="absolute top-1.5 right-1.5 text-white/0 group-hover/stat:text-white/30 transition-colors" />
        )}
    </button>
));

// --- Horizontal Bar ---
const HBar = memo(({ items, maxVal }) => (
    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-white/5">
        {items.map((item, i) => (
            <div key={i} className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (item.value / Math.max(1, maxVal)) * 100)}%`, background: item.color }} title={`${item.label}: ${item.value}`} />
        ))}
    </div>
));

// --- Histogram Bar Chart (with drill-to-grid) ---
const Histogram = memo(({ buckets, onBarClick }) => {
    const max = Math.max(1, ...buckets.map(b => b.count));
    return (
        <div className="flex items-end gap-1 h-20">
            {buckets.map((b, i) => (
                <button key={i} onClick={() => onBarClick && onBarClick(b)} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                    <span className="text-[8px] text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{b.count}</span>
                    <div className="w-full rounded-t transition-all group-hover:brightness-125" style={{ height: `${Math.max(2, (b.count / max) * 100)}%`, background: `hsl(${210 + i * 20}, 60%, 50%)` }} />
                    <span className="text-[7px] text-white/30 font-bold truncate w-full text-center">{b.label}</span>
                </button>
            ))}
        </div>
    );
});

// --- Folder Row ---
const FolderRow = memo(({ folder, maxCount, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group text-left">
        <Folder size={12} className="text-white/30 shrink-0" />
        <span className="text-[10px] text-white/60 font-medium truncate flex-1 min-w-0">{folder.name}</span>
        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
            <div className="h-full rounded-full bg-[var(--accent-primary)]/60" style={{ width: `${(folder.computedFileCount / Math.max(1, maxCount)) * 100}%` }} />
        </div>
        <span className="text-[9px] text-white/30 font-mono shrink-0 w-12 text-right">{folder.computedFileCount}</span>
        <ChevronRight size={10} className="text-white/10 group-hover:text-white/40 shrink-0" />
    </button>
));

const StudioView = () => {
    const stats = useStudioStats();
    const { setAppViewMode, setCurrentFolder, setStudioFilter } = useMediaStore();

    // Modal state
    const [activeModal, setActiveModal] = useState(null);
    const [modalData, setModalData] = useState(null);

    const openFileList = useCallback((title, files) => {
        setModalData({ title, files });
        setActiveModal('fileList');
    }, []);

    const openFolder = useCallback((folder) => {
        setModalData({ folder });
        setActiveModal('folder');
    }, []);

    // === DRILL-DOWN: Navigate to Grid view with a studio filter applied ===
    const drillToGrid = useCallback((label, files) => {
        if (!files || files.length === 0) return;
        setStudioFilter({
            type: 'studio-drill',
            label,
            filePaths: files.map(f => f.path)
        });
        setAppViewMode('standard');
    }, [setStudioFilter, setAppViewMode]);

    const handleHistogramBar = useCallback((bucket) => {
        // Drill to grid with the files in this bucket
        drillToGrid(`${bucket.label}`, bucket.files || []);
    }, [drillToGrid]);

    const handleResClick = useCallback((key) => {
        drillToGrid(`Resolution: ${key}`, stats.resFiles[key] || []);
    }, [drillToGrid, stats.resFiles]);

    const navToFolder = useCallback((path) => {
        setCurrentFolder(path);
        setAppViewMode('standard');
    }, [setCurrentFolder, setAppViewMode]);

    // Orientation drill-down
    const handleOrientClick = useCallback((orient) => {
        const orientFiles = stats.files.filter(f => {
            if (!f.width || !f.height) return false;
            const r = f.width / f.height;
            if (orient === 'landscape') return r > 1.05;
            if (orient === 'portrait') return r < 0.95;
            if (orient === 'square') return r >= 0.95 && r <= 1.05;
            return false;
        });
        drillToGrid(`${orient.charAt(0).toUpperCase() + orient.slice(1)} Media`, orientFiles);
    }, [drillToGrid, stats.files]);

    const orientTotal = stats.landscape + stats.portrait + stats.square;

    return (
        <div className="h-full w-full bg-[#050510] overflow-y-auto custom-scrollbar">
            <div className="max-w-[1400px] mx-auto p-6 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center">
                            <LayoutGrid size={16} className="text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Studio</h1>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Library Intelligence Dashboard — Click any stat to drill into Grid</p>
                        </div>
                    </div>
                    <button onClick={() => setAppViewMode('standard')} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-[10px] font-bold transition-colors">
                        <ArrowRight size={12} /> Back to Grid
                    </button>
                </div>

                {/* Row 1: Overview Stats */}
                <Card title="Library Overview" icon={Database}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                        <Stat icon={Folder} label="Folders" value={stats.folders.length} color="#6366f1" />
                        <Stat icon={Film} label="Videos" value={stats.videoCount} color="#f59e0b" onClick={() => drillToGrid('All Videos', stats.files.filter(f => f.type === 'video'))} />
                        <Stat icon={ImageIcon} label="Images" value={stats.imageCount} color="#ec4899" onClick={() => drillToGrid('All Images', stats.files.filter(f => f.type !== 'video'))} />
                        <Stat icon={HardDrive} label="Total Size" value={stats.totalSizeStr} color="#10b981" />
                        <Stat icon={Clock} label="Duration" value={`${Math.floor(stats.totalDuration / 3600)}h ${Math.floor((stats.totalDuration % 3600) / 60)}m`} color="#8b5cf6" />
                        <Stat icon={Layers} label="Total Files" value={stats.totalFiles} color="#06b6d4" onClick={() => drillToGrid('All Files', stats.files)} />
                    </div>

                    {/* Orientation Bar — Clickable segments */}
                    {orientTotal > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] text-white/40 font-bold uppercase">
                                <span>Orientation Distribution — Click to filter</span>
                                <span className="font-mono">{stats.landscape}L / {stats.portrait}P / {stats.square}S</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleOrientClick('landscape')} className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 text-[9px] font-bold transition-all hover:scale-[1.02] active:scale-95" title="View landscape media in Grid">
                                    <svg viewBox="0 0 16 10" className="w-3 h-2"><rect x="0.5" y="0.5" width="15" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
                                    {stats.landscape}
                                </button>
                                <button onClick={() => handleOrientClick('portrait')} className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[9px] font-bold transition-all hover:scale-[1.02] active:scale-95" title="View portrait media in Grid">
                                    <svg viewBox="0 0 10 16" className="w-2 h-3"><rect x="0.5" y="0.5" width="9" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
                                    {stats.portrait}
                                </button>
                                <button onClick={() => handleOrientClick('square')} className="flex items-center gap-1.5 px-2 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-[9px] font-bold transition-all hover:scale-[1.02] active:scale-95" title="View square media in Grid">
                                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><rect x="0.5" y="0.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
                                    {stats.square}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Format Breakdown */}
                    {stats.formatEntries.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {stats.formatEntries.map(([ext, count]) => (
                                <span key={ext} className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-mono text-white/50 border border-white/5">
                                    .{ext} <span className="text-white/30">{count}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Row 2: Histograms — bars drill to grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Duration Distribution" icon={Clock} accent="#8b5cf6">
                        <Histogram buckets={stats.durationHist} onBarClick={handleHistogramBar} />
                    </Card>
                    <Card title="File Size Distribution" icon={HardDrive} accent="#10b981">
                        <Histogram buckets={stats.sizeHist} onBarClick={handleHistogramBar} />
                    </Card>
                </div>

                {/* Row 3: Resolution + Framerate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Resolution Breakdown" icon={Maximize} accent="#f59e0b">
                        <div className="space-y-2">
                            {Object.entries(stats.resolutions).map(([key, count]) => (
                                <button key={key} onClick={() => handleResClick(key)} className="w-full flex items-center gap-2 group hover:bg-white/[0.03] rounded-lg px-1 py-1 transition-colors">
                                    <span className="text-[10px] text-white/50 font-bold w-12 text-left">{key}</span>
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-500/60 transition-all" style={{ width: `${(count / Math.max(1, stats.totalFiles)) * 100}%` }} />
                                    </div>
                                    <span className="text-[9px] text-white/30 font-mono w-8 text-right">{count}</span>
                                    <ExternalLink size={8} className="text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    </Card>
                    <Card title="Framerate Groups" icon={Gauge} accent="#06b6d4">
                        <div className="space-y-2">
                            {Object.entries(stats.fpsGroups).map(([key, count]) => (
                                <div key={key} className="flex items-center gap-2 px-1 py-1">
                                    <span className="text-[10px] text-white/50 font-bold w-12 text-left">{key}fps</span>
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-cyan-500/60" style={{ width: `${(count / Math.max(1, stats.videoCount)) * 100}%` }} />
                                    </div>
                                    <span className="text-[9px] text-white/30 font-mono w-8 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Row 4: Pro Bridge + System */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Pro Bridge" icon={Monitor} accent={stats.bridgeStatus === 'connected' ? '#10b981' : '#6b7280'}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={clsx("w-2.5 h-2.5 rounded-full", stats.bridgeStatus === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-600")} />
                                <span className="text-xs text-white/70 font-medium capitalize">{stats.bridgeStatus}</span>
                                {stats.proAppInfo && <span className="text-[9px] text-white/30 font-mono ml-auto">v{stats.proAppInfo.version}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-white/30">
                                {stats.bridgeStatus === 'connected' ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} />}
                                <span>{stats.messageLog.length} messages in log</span>
                            </div>
                            <button onClick={() => setActiveModal('activity')} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors">
                                <FileText size={12} /> View Transfer Log
                            </button>
                        </div>
                    </Card>
                    <Card title="System Health" icon={Activity} accent="#f43f5e">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                                <p className="text-sm font-black text-white">{stats.activityLog.length}</p>
                                <p className="text-[8px] text-white/40 uppercase font-bold">Actions Logged</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                                <p className="text-sm font-black text-white">{stats.folders.length}</p>
                                <p className="text-[8px] text-white/40 uppercase font-bold">Indexed Folders</p>
                            </div>
                        </div>
                        <button onClick={() => setActiveModal('activity')} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors">
                            <Activity size={12} /> Activity Log
                        </button>
                    </Card>
                </div>

                {/* Row 5: Folder Insights — Click drills to Grid with folder filter */}
                <Card title={`Top Folders (${stats.folderStats.length})`} icon={Folder} accent="#6366f1">
                    <div className="space-y-0.5">
                        {stats.folderStats.map(folder => (
                            <FolderRow key={folder.path} folder={folder} maxCount={stats.folderStats[0]?.computedFileCount || 1} onClick={() => {
                                // Drill to grid filtered to this folder's files
                                const folderFiles = stats.files.filter(f => f.folderPath === folder.path);
                                drillToGrid(`Folder: ${folder.name}`, folderFiles);
                            }} />
                        ))}
                        {stats.folderStats.length === 0 && <p className="text-xs text-white/20 text-center py-4">No folders scanned</p>}
                    </div>
                </Card>

                {/* Row 6: Activity Feed */}
                <Card title="Recent Activity" icon={Clock} accent="#a855f7" onClick={() => setActiveModal('activity')}>
                    <div className="space-y-1">
                        {stats.activityLog.length === 0 && <p className="text-xs text-white/20 text-center py-4">No activity yet this session</p>}
                        {stats.activityLog.slice(0, 8).map(entry => (
                            <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors">
                                <span className="text-[8px] text-white/20 font-mono shrink-0 pt-0.5 w-14">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                <span className="text-[10px] text-white/50 flex-1">{entry.label}</span>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* Modals */}
            <FileListModal open={activeModal === 'fileList'} onClose={() => setActiveModal(null)} title={modalData?.title || ''} files={modalData?.files || []} />
            <FolderDetailModal open={activeModal === 'folder'} onClose={() => setActiveModal(null)} folder={modalData?.folder} files={stats.files} />
            <ConsoleLogModal open={activeModal === 'activity'} onClose={() => setActiveModal(null)} />
        </div>
    );
};

export default memo(StudioView);
