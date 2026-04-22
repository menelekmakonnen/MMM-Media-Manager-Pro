import React, { useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useClipStore } from '../../stores/clipStore';
import useMediaStore from '../../stores/useMediaStore';
import { useViewStore } from '../../stores/editorViewStore';
import { generateManifest } from '../../utils/editorUtils/manifestBridge';
import { Trash2, Film, PlayCircle, HardDriveDownload, Calendar, AlertCircle, Save, FolderUp, Clock, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

/* ── SVG Animated Thumbnail Placeholder ─────────────────────────────
 * Rendered when no thumbnail image/video is available for a saved edit.
 * Features a film-strip motif with animated gradient bands, pulsing
 * clip count indicator, and animated waveform bars. */
const AnimatedThumbnail = ({ clipCount = 0, duration = 0 }) => (
    <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animated-gradient" />

        {/* Film strip perforations */}
        <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col items-center justify-around py-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-2.5 h-3 rounded-sm bg-white/8 border border-white/10" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-5 flex flex-col items-center justify-around py-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-2.5 h-3 rounded-sm bg-white/8 border border-white/10" style={{ animationDelay: `${i * 0.15 + 0.5}s` }} />
            ))}
        </div>

        {/* Animated waveform bars */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-[2px] h-8">
            {Array.from({ length: 16 }).map((_, i) => (
                <div
                    key={i}
                    className="w-[3px] rounded-full bg-[var(--accent-primary)]"
                    style={{
                        height: `${12 + Math.sin(i * 0.7) * 10}px`,
                        opacity: 0.3 + Math.sin(i * 0.5) * 0.2,
                        animation: `waveform-pulse 1.5s ease-in-out ${i * 0.08}s infinite alternate`,
                    }}
                />
            ))}
        </div>

        {/* Pulsing clip count */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <Film size={28} className="text-white/20" style={{ animation: 'icon-pulse 2.5s ease-in-out infinite' }} />
            {clipCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-white/25">{clipCount} cuts</span>
            )}
        </div>

        <style>{`
            .animated-gradient {
                background: linear-gradient(135deg, #0a0a1a 0%, #111 30%, #1a0a2e 60%, #0a0a1a 100%);
                background-size: 300% 300%;
                animation: gradient-shift 8s ease infinite;
            }
            @keyframes gradient-shift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes waveform-pulse {
                0% { transform: scaleY(0.5); }
                100% { transform: scaleY(1.3); }
            }
            @keyframes icon-pulse {
                0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 0.35; transform: translate(-50%, -50%) scale(1.1); }
            }
        `}</style>
    </div>
);


/* ── Re-Link Check Modal ────────────────────────────────────────────
 * When user tries to open an edit, we check if source files exist.
 * This modal shows which files are missing and lets user proceed or cancel. */
const RelinkModal = ({ missingFiles, totalFiles, onProceed, onCancel }) => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0d0d1a] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/20">
                    <AlertTriangle size={20} className="text-amber-400" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white">Missing Source Files</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">{missingFiles.length} of {totalFiles} files could not be found</p>
                </div>
            </div>

            <div className="max-h-48 overflow-y-auto custom-scrollbar mb-4 space-y-1.5">
                {missingFiles.map((path, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-red-400/80 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                        <AlertCircle size={10} className="flex-shrink-0" />
                        <span className="truncate">{path}</span>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-white/30 mb-4">
                Missing files will appear as black clips. You can still load the edit to recover existing media.
            </p>

            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold border border-white/10 transition-colors">
                    Cancel
                </button>
                <button onClick={onProceed} className="flex-1 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors">
                    Load Anyway
                </button>
            </div>
        </motion.div>
    </div>
);


export const EditsTab = () => {
    const { savedEdits, removeEdit, updateEditLastOpened } = useProjectStore();
    const { setClips, clearAllClips } = useClipStore();
    const { setActiveTab } = useViewStore();
    const { currentFolder, files } = useMediaStore();

    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [relinkState, setRelinkState] = useState(null); // { edit, missingFiles }

    const checkFileExists = useCallback(async (filePath) => {
        // In Electron, we can check via IPC. Fallback: try to create a URL
        try {
            if (window.ipcRenderer?.invoke) {
                const result = await window.ipcRenderer.invoke('check-file-exists', filePath);
                return result?.exists !== false;
            }
        } catch {
            // Fallback: assume files exist if we can't check
        }
        return true;
    }, []);

    const handleLoadToTimeline = useCallback(async (edit) => {
        // Media re-linking check: verify source files still exist
        if (edit.clips && edit.clips.length > 0) {
            const uniquePaths = [...new Set(edit.clips.map(c => c.path).filter(Boolean))];
            const checks = await Promise.all(uniquePaths.map(async path => ({
                path,
                exists: await checkFileExists(path)
            })));
            const missing = checks.filter(c => !c.exists).map(c => c.path);

            if (missing.length > 0) {
                setRelinkState({ edit, missingFiles: missing, totalFiles: uniquePaths.length });
                return; // Wait for user decision
            }
        }

        // All files found — proceed directly
        doLoadEdit(edit);
    }, [checkFileExists]);

    const doLoadEdit = useCallback((edit) => {
        clearAllClips();
        setClips(edit.clips);
        // Track last opened timestamp
        if (updateEditLastOpened) updateEditLastOpened(edit.id);
        setActiveTab('timeline');
        setRelinkState(null);
    }, [clearAllClips, setClips, setActiveTab, updateEditLastOpened]);

    const handleExportManifest = async (edit) => {
        if (!window.ipcRenderer) {
            alert('Export is only available in the desktop application.');
            return;
        }

        try {
            const tempProjectData = {
                id: edit.id,
                name: edit.name || 'Untitled_Trailer',
                settings: useProjectStore.getState().settings,
                clips: edit.clips
            };

            const manifestPayload = await generateManifest(
                tempProjectData,
                currentFolder || 'C://Media' 
            );

            const result = await window.ipcRenderer.saveManifest(manifestPayload);

            if (result.success) {
                console.log("Manifest saved successfully:", result.filePath);
            } else {
                console.error('Failed to save manifest:', result.error);
                alert(`Export failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Export Error:', error);
            alert(`An error occurred during export: ${error.message}`);
        }
    };

    const handleSaveMmmdr = async () => {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'edits.mmmdr',
                types: [{
                    description: 'MMMedia Darkroom Project',
                    accept: { 'application/json': ['.mmmdr'] },
                }],
            });
            const writable = await handle.createWritable();
            const payload = JSON.stringify({
                savedEdits: useProjectStore.getState().savedEdits,
                contextPath: currentFolder
            });
            await writable.write(payload);
            await writable.close();
        } catch (err) {
            console.error('Failed to save .mmmdr:', err);
        }
    };

    const handleLoadMmmdr = async () => {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'MMMedia Darkroom Project',
                    accept: { 'application/json': ['.mmmdr'] },
                }],
            });
            const file = await handle.getFile();
            const payload = JSON.parse(await file.text());
            if (payload.savedEdits) {
                useProjectStore.getState().loadEdits(payload.savedEdits);
                if (payload.contextPath !== currentFolder) {
                    alert(`Loaded edits. Note: the original folder for these edits was ${payload.contextPath}. Please ensure that folder is active.`);
                }
            }
        } catch (err) {
            console.error('Failed to load .mmmdr:', err);
        }
    };

    // Sort by most recently opened, then created
    const sortedEdits = [...(savedEdits || [])].sort((a, b) => {
        const aTime = a.lastOpenedAt || a.createdAt || 0;
        const bTime = b.lastOpenedAt || b.createdAt || 0;
        return new Date(bTime) - new Date(aTime);
    });

    const formatDuration = (clips) => {
        if (!clips || clips.length === 0) return '0s';
        const maxFrame = Math.max(...clips.map(c => c.endFrame || 0));
        const secs = Math.round(maxFrame / 30);
        if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
        return `${secs}s`;
    };

    const renderEmptyState = () => (
        <div className="h-full w-full flex flex-col items-center justify-center text-white/20 gap-6">
            <div className="w-24 h-24 rounded-full border border-dashed border-white/20 flex items-center justify-center relative overflow-hidden">
                <Film size={40} className="text-white/30" style={{ animation: 'icon-pulse 3s ease-in-out infinite' }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-primary)]/5 to-transparent" />
            </div>
            <div className="text-center">
                <h3 className="text-xl font-bold text-white/60 mb-2">No Saved Trailers</h3>
                <p className="text-sm font-medium">Use the "Make a Trailer" wand to generate sequence edits.</p>
            </div>
            <style>{`
                @keyframes icon-pulse {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
            `}</style>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col p-8 bg-[#050510] overflow-hidden">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <Film className="text-[var(--accent-primary)]" />
                        Saved Edits & Trailers
                    </h1>
                    <p className="text-white/40 text-sm mt-1 font-medium">
                        {sortedEdits.length > 0
                            ? `${sortedEdits.length} saved edit${sortedEdits.length !== 1 ? 's' : ''} · Click to restore to timeline`
                            : 'Manage and export your procedurally generated sequences.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleLoadMmmdr}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors border border-white/5"
                    >
                        <FolderUp size={14} /> Load .mmmdr
                    </button>
                    <button 
                        onClick={handleSaveMmmdr}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/40 text-[var(--accent-primary)] hover:text-white text-xs font-bold transition-colors border border-[var(--accent-primary)]/30"
                    >
                        <Save size={14} /> Save .mmmdr
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                {sortedEdits.length === 0 ? renderEmptyState() : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {sortedEdits.map((edit, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                                    key={edit.id}
                                    className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl group flex flex-col hover:border-white/15 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all duration-300"
                                >
                                    {/* Thumbnail Area */}
                                    <div className="h-40 relative border-b border-white/5 flex flex-col justify-end overflow-hidden group/thumb cursor-pointer"
                                        onClick={() => handleLoadToTimeline(edit)}>
                                        {/* Background Thumbnail Image/Video or Animated SVG Placeholder */}
                                        {(() => {
                                            const thumbFile = files.find(f => f.path === edit.thumbnailPath);
                                            const thumbUrl = thumbFile?.url;
                                            if (thumbUrl) {
                                                if (edit.thumbnailPath.match(/\.(mp4|webm|mkv|mov)$/i)) {
                                                    return <video src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/thumb:opacity-80 transition-opacity duration-500" muted autoPlay loop playsInline />;
                                                }
                                                return <img src={thumbUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover/thumb:opacity-80 transition-opacity duration-500" alt="Thumbnail" />;
                                            }
                                            return <AnimatedThumbnail clipCount={edit.clips?.length || 0} duration={0} />;
                                        })()}

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                                        {/* Shimmer effect on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ transform: 'skewX(-20deg)', animation: 'shimmer 3s ease-in-out infinite' }} />

                                        {/* Stat Badges */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                            <div className="bg-black/60 px-2 py-1 rounded text-[10px] font-mono font-bold text-white/50 flex items-center gap-1 backdrop-blur-sm border border-white/10">
                                                <Layers size={9} /> {edit.clips?.length || 0}
                                            </div>
                                            <div className="bg-black/60 px-2 py-1 rounded text-[10px] font-mono font-bold text-white/50 flex items-center gap-1 backdrop-blur-sm border border-white/10">
                                                <Clock size={9} /> {formatDuration(edit.clips)}
                                            </div>
                                        </div>

                                        {/* Title overlay */}
                                        <div className="px-5 py-4 relative z-10 w-full">
                                            <h3 className="text-sm font-black text-white truncate drop-shadow-md group-hover/thumb:text-[var(--accent-primary)] transition-colors">
                                                {edit.name || 'Generated Trailer'}
                                            </h3>
                                            <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1.5 mt-1">
                                                <Calendar size={10} />
                                                {new Date(edit.createdAt).toLocaleDateString()}
                                                {edit.lastOpenedAt && (
                                                    <span className="text-white/25 ml-2">
                                                        · opened {new Date(edit.lastOpenedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 flex flex-col gap-2">
                                        <button
                                            onClick={() => handleLoadToTimeline(edit)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)] text-white/80 hover:text-white text-xs font-bold transition-all border border-white/5 group/btn"
                                        >
                                            <Film size={14} className="group-hover/btn:animate-pulse" /> Open in Timeline
                                        </button>
                                        
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleExportManifest(edit)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/30 text-purple-400 hover:text-purple-200 text-xs font-bold transition-all border border-purple-500/20"
                                            >
                                                <HardDriveDownload size={14} /> FCP XML Manifest
                                            </button>

                                            {deleteConfirm === edit.id ? (
                                                <button
                                                    onClick={() => {
                                                        removeEdit(edit.id);
                                                        setDeleteConfirm(null);
                                                    }}
                                                    onMouseLeave={() => setDeleteConfirm(null)}
                                                    className="w-10 flex items-center justify-center rounded-xl bg-red-500/80 hover:bg-red-500 text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                                    title="Click again to confirm"
                                                >
                                                    <AlertCircle size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(edit.id)}
                                                    className="w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Re-link check modal */}
            <AnimatePresence>
                {relinkState && (
                    <RelinkModal
                        missingFiles={relinkState.missingFiles}
                        totalFiles={relinkState.totalFiles}
                        onProceed={() => doLoadEdit(relinkState.edit)}
                        onCancel={() => setRelinkState(null)}
                    />
                )}
            </AnimatePresence>

            <style>{`
                @keyframes shimmer {
                    0% { transform: skewX(-20deg) translateX(-200%); }
                    100% { transform: skewX(-20deg) translateX(200%); }
                }
            `}</style>
        </div>
    );
};
