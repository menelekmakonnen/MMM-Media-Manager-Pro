import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useClipStore } from '../../stores/clipStore';
import useMediaStore from '../../stores/useMediaStore';
import { useViewStore } from '../../stores/editorViewStore';
import { generateManifest } from '../../utils/editorUtils/manifestBridge';
import { Trash2, Film, PlayCircle, HardDriveDownload, Calendar, AlertCircle, Save, FolderUp } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const EditsTab = () => {
    const { savedEdits, removeEdit } = useProjectStore();
    const { setClips, clearAllClips } = useClipStore();
    const { setActiveTab } = useViewStore();
    const { currentFolder } = useMediaStore();

    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleLoadToTimeline = (edit) => {
        clearAllClips();
        setClips(edit.clips);
        setActiveTab('timeline');
    };

    const handleExportManifest = async (edit) => {
        if (!window.ipcRenderer) {
            alert('Export is only available in the desktop application.');
            return;
        }

        try {
            // Reconstruct a temporary project schema for the manifest engine
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
                // Success feedback
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

    const renderEmptyState = () => (
        <div className="h-full w-full flex flex-col items-center justify-center text-white/20 gap-6">
            <div className="w-24 h-24 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                <Film size={40} className="text-white/30" />
            </div>
            <div className="text-center">
                <h3 className="text-xl font-bold text-white/60 mb-2">No Saved Trailers</h3>
                <p className="text-sm font-medium">Use the "Make a Trailer" wand to generate sequence edits.</p>
            </div>
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
                        Manage and export your procedurally generated sequences.
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
                {(!savedEdits || savedEdits.length === 0) ? renderEmptyState() : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {savedEdits.map(edit => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={edit.id}
                                    className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl group flex flex-col"
                                >
                                    {/* Thumbnail Placeholder Area */}
                                    <div className="h-32 bg-gradient-to-br from-[#111] to-[#0a0a1a] relative border-b border-white/5 px-5 py-4 flex flex-col justify-end">
                                        <div className="absolute top-4 right-4 bg-black/60 px-2 py-1 rounded text-[10px] font-mono font-bold text-white/50 flex items-center gap-1.5 backdrop-blur-sm border border-white/10">
                                            <PlayCircle size={10} /> {edit.clips?.length || 0} Cuts
                                        </div>
                                        <h3 className="text-sm font-black text-white truncate drop-shadow-md">
                                            {edit.name || 'Generated Trailer'}
                                        </h3>
                                        <div className="text-[10px] text-white/50 uppercase tracking-widest font-bold flex items-center gap-1.5 mt-1">
                                            <Calendar size={10} />
                                            {new Date(edit.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-4 flex flex-col gap-2">
                                        <button
                                            onClick={() => handleLoadToTimeline(edit)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-[var(--accent-primary)] text-white/80 hover:text-white text-xs font-bold transition-all border border-white/5"
                                        >
                                            <Film size={14} /> Open in Timeline
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
        </div>
    );
};
