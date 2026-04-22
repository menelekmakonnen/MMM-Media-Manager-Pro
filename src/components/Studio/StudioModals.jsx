import React, { useState, useMemo } from 'react';
import { X, ChevronRight, Film, Image as ImageIcon, Folder, Play, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import useMediaStore from '../../stores/useMediaStore';

/**
 * Reusable drill-down modal. Supports nested modals via stack.
 * Optimised: no re-renders on parent, lazy content via children-as-function.
 */
export const DrillModal = ({ open, onClose, title, icon: Icon, children, width = 'max-w-2xl' }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={clsx("relative bg-[#0c0c18] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] w-full", width)}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon size={16} className="text-[var(--accent-primary)]" />}
                        <h3 className="text-sm font-bold text-white">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{children}</div>
            </motion.div>
        </div>
    );
};

/**
 * File list modal — shows files matching a filter. Click to navigate.
 */
export const FileListModal = ({ open, onClose, title, files }) => {
    const { setCurrentFileIndex, setAppViewMode, getSortedFiles } = useMediaStore();
    const sortedFiles = getSortedFiles();

    const navigateToFile = (file) => {
        const idx = sortedFiles.findIndex(f => f.path === file.path);
        if (idx >= 0) {
            setCurrentFileIndex(idx);
            setAppViewMode('standard');
            onClose();
        }
    };

    return (
        <DrillModal open={open} onClose={onClose} title={title} icon={Film} width="max-w-3xl">
            <div className="space-y-1">
                {files.length === 0 && <p className="text-white/30 text-xs text-center py-8">No matching files</p>}
                {files.slice(0, 200).map((file, i) => (
                    <button
                        key={file.path || i}
                        onClick={() => navigateToFile(file)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">
                            {file.type === 'video' ? <Film size={12} className="text-amber-400" /> : <ImageIcon size={12} className="text-pink-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white/80 truncate">{file.name}</p>
                            <p className="text-[9px] text-white/30 font-mono truncate">{file.folderPath}</p>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-white/30 font-mono shrink-0">
                            {file.duration > 0 && <span>{Math.floor(file.duration / 60)}:{String(Math.floor(file.duration % 60)).padStart(2, '0')}</span>}
                            {file.size > 0 && <span>{(file.size / 1048576).toFixed(1)}MB</span>}
                        </div>
                        <ChevronRight size={12} className="text-white/20 group-hover:text-white/60 shrink-0" />
                    </button>
                ))}
                {files.length > 200 && <p className="text-[10px] text-white/30 text-center py-2">Showing 200 of {files.length}</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                <button
                    onClick={() => { setAppViewMode('standard'); onClose(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] rounded-lg text-xs font-bold transition-colors"
                >
                    <ExternalLink size={12} /> Open in Grid View
                </button>
            </div>
        </DrillModal>
    );
};

/**
 * Console log viewer modal.
 */
export const ConsoleLogModal = ({ open, onClose }) => {
    const { activityLog } = useMediaStore();
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
        if (filter === 'all') return activityLog;
        return activityLog.filter(e => e.type === filter);
    }, [activityLog, filter]);

    return (
        <DrillModal open={open} onClose={onClose} title="Activity Log" icon={Play} width="max-w-3xl">
            <div className="flex gap-1 mb-4">
                {['all', 'navigation', 'generation', 'export', 'bridge', 'system'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={clsx("px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors",
                            filter === f ? "bg-[var(--accent-primary)] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}>{f}</button>
                ))}
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {filtered.length === 0 && <p className="text-white/30 text-xs text-center py-8">No activity recorded</p>}
                {filtered.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors">
                        <span className="text-[9px] text-white/30 font-mono shrink-0 pt-0.5">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/70">{entry.label}</p>
                            {entry.detail && <p className="text-[9px] text-white/30 mt-0.5">{entry.detail}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </DrillModal>
    );
};

/**
 * Folder detail modal — shows files in a specific folder.
 */
export const FolderDetailModal = ({ open, onClose, folder, files }) => {
    const { setCurrentFolder, setAppViewMode } = useMediaStore();

    const navigateToFolder = () => {
        if (folder) {
            setCurrentFolder(folder.path);
            setAppViewMode('standard');
            onClose();
        }
    };

    const folderFiles = useMemo(() => {
        if (!folder) return [];
        return files.filter(f => f.folderPath === folder.path);
    }, [folder, files]);

    if (!folder) return null;

    return (
        <DrillModal open={open} onClose={onClose} title={folder.name} icon={Folder} width="max-w-3xl">
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-white">{folderFiles.length}</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold">Files</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-white">{folderFiles.filter(f => f.type === 'video').length}</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold">Videos</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-white">{(folderFiles.reduce((s, f) => s + (f.size || 0), 0) / 1073741824).toFixed(2)}GB</p>
                    <p className="text-[9px] text-white/40 uppercase font-bold">Size</p>
                </div>
            </div>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto custom-scrollbar">
                {folderFiles.slice(0, 100).map((file, i) => (
                    <div key={file.path || i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 text-xs text-white/60">
                        {file.type === 'video' ? <Film size={10} className="text-amber-400" /> : <ImageIcon size={10} className="text-pink-400" />}
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-[9px] text-white/30 font-mono">{(file.size / 1048576).toFixed(1)}MB</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                <button onClick={navigateToFolder}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] rounded-lg text-xs font-bold transition-colors">
                    <ExternalLink size={12} /> Open in Grid View
                </button>
            </div>
        </DrillModal>
    );
};
