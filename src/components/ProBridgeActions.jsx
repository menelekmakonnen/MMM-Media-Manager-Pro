import React, { useState, useCallback } from 'react';
import { appBridge, useBridgeStore } from '../lib/appBridge';
import { saveProject, loadProject, exportForPro, getProjectSummary } from '../lib/projectController';
import { useClipStore } from '../stores/clipStore';
import useMediaStore from '../stores/useMediaStore';

/**
 * ProBridgeActions — Action buttons for .mmm save/load and sending data to Pro.
 * Can be embedded in Settings, TopBar, or as a floating panel.
 */
export default function ProBridgeActions({ layout = 'row' }) {
    const { status } = useBridgeStore();
    const [feedback, setFeedback] = useState(null);
    const isConnected = status === 'connected';

    const showFeedback = useCallback((message, type = 'success') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }, []);

    // ─── Save Project (.mmm) ────────────────────────────────────────
    const handleSave = useCallback(async () => {
        const result = await saveProject();
        if (result.success) {
            showFeedback(`Saved to ${result.filePath?.split(/[/\\]/).pop() || 'file'}`, 'success');
        } else if (!result.canceled) {
            showFeedback(result.error || 'Save failed', 'error');
        }
    }, [showFeedback]);

    // ─── Load Project (.mmm) ────────────────────────────────────────
    const handleLoad = useCallback(async () => {
        const result = await loadProject();
        if (result.success) {
            showFeedback(`Loaded "${result.projectName}" (${result.clipCount} clips)`, 'success');
        } else if (!result.canceled) {
            showFeedback(result.error || 'Load failed', 'error');
        }
    }, [showFeedback]);

    // ─── Send Clips to Pro ──────────────────────────────────────────
    const handleSendClips = useCallback(() => {
        const clips = useClipStore.getState().clips;
        if (clips.length === 0) {
            showFeedback('No clips to send', 'warn');
            return;
        }
        const sent = appBridge.sendClips(clips);
        if (sent) {
            showFeedback(`Sent ${clips.length} clip(s) to Pro`, 'success');
        } else {
            showFeedback('Not connected to Pro', 'error');
        }
    }, [showFeedback]);

    // ─── Send Current Media Selection to Pro ────────────────────────
    const handleSendMedia = useCallback(() => {
        const store = useMediaStore.getState();
        const processedFiles = store.processedFiles || [];
        const currentIndex = store.currentFileIndex;

        let mediaToSend;
        if (currentIndex >= 0 && currentIndex < processedFiles.length) {
            // Send the currently viewed file
            mediaToSend = [processedFiles[currentIndex]];
        } else if (processedFiles.length > 0) {
            // Fallback: send first file
            mediaToSend = [processedFiles[0]];
        }

        if (!mediaToSend || mediaToSend.length === 0) {
            showFeedback('No media selected to send', 'warn');
            return;
        }

        const sent = appBridge.sendMedia(mediaToSend);
        if (sent) {
            showFeedback(`Sent ${mediaToSend.length} file(s) to Pro`, 'success');
        } else {
            showFeedback('Not connected to Pro', 'error');
        }
    }, [showFeedback]);

    // ─── Send Full Project to Pro ───────────────────────────────────
    const handleSendProject = useCallback(() => {
        const content = exportForPro();
        const sent = appBridge.sendProject(content);
        if (sent) {
            const summary = getProjectSummary();
            showFeedback(`Sent project "${summary.name}" to Pro`, 'success');
        } else {
            showFeedback('Not connected to Pro', 'error');
        }
    }, [showFeedback]);

    // ─── Open Current Folder in MMMedia Pro ─────────────────────────
    const handleSendFolder = useCallback(() => {
        const store = useMediaStore.getState();
        const currentFolder = store.currentFolder;
        const processedFiles = store.processedFiles || [];

        if (!currentFolder) {
            showFeedback('No folder is currently open', 'warn');
            return;
        }

        // Filter to files in the current folder
        const folderFiles = processedFiles.filter(f =>
            f.folderPath === currentFolder || f.path?.startsWith(currentFolder)
        );

        if (folderFiles.length === 0) {
            showFeedback('No media files in current folder', 'warn');
            return;
        }

        const sent = appBridge.sendFolder(currentFolder, folderFiles);
        if (sent) {
            showFeedback(`Sent folder (${folderFiles.length} files) to Pro`, 'success');
        } else {
            showFeedback('Not connected to Pro', 'error');
        }
    }, [showFeedback]);

    const isRow = layout === 'row';

    const buttonStyle = (variant = 'default') => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: isRow ? '6px 12px' : '10px 14px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.02em',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid',
        outline: 'none',
        whiteSpace: 'nowrap',
        ...(variant === 'primary' ? {
            background: 'rgba(99,102,241,0.15)',
            borderColor: 'rgba(99,102,241,0.3)',
            color: '#a5b4fc',
        } : variant === 'bridge' ? {
            background: isConnected ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
            borderColor: isConnected ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)',
            color: isConnected ? '#86efac' : '#6b7280',
            opacity: isConnected ? 1 : 0.5,
            pointerEvents: isConnected ? 'auto' : 'none',
        } : {
            background: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
        })
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: isRow ? 'row' : 'column',
            gap: '6px',
            flexWrap: 'wrap',
            position: 'relative',
        }}>
            {/* File Operations */}
            <button onClick={handleSave} style={buttonStyle('primary')} title="Save project as .mmm file" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-active/btn:scale-90">
                    <path d="M13 14H3a1 1 0 01-1-1V3a1 1 0 011-1h7.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V13a1 1 0 01-1 1z" />
                    <rect x="5" y="2" width="5" height="4" rx="0.5" className="opacity-50" />
                    <rect x="4" y="9" width="8" height="4" rx="0.5" fill="currentColor" className="opacity-20" />
                </svg>
                Save .mmm
            </button>
            <button onClick={handleLoad} style={buttonStyle('default')} title="Load a .mmm project file" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-active/btn:scale-90">
                    <path d="M2 5V13a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H8L6.5 4.5A1 1 0 005.8 4H3a1 1 0 00-1 1z" />
                    <path d="M6 10l2 2 2-2" strokeLinecap="round" className="opacity-60" />
                </svg>
                Load .mmm
            </button>

            {/* Separator */}
            {isRow && <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />}

            {/* Bridge Operations */}
            <button onClick={handleSendClips} style={buttonStyle('bridge')} title="Send editor clips to MMMedia Pro" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-active/btn:scale-90">
                    <rect x="2" y="4" width="12" height="10" rx="1" />
                    <path d="M5 4V2h6v2" />
                    <path d="M2 8h12" className="opacity-40" />
                    <circle cx="8" cy="11" r="1.5" fill="currentColor" className="opacity-30" />
                </svg>
                Send Clips
            </button>
            <button onClick={handleSendMedia} style={buttonStyle('bridge')} title="Send selected media to MMMedia Pro" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-active/btn:scale-90">
                    <path d="M2 5V13a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H8L6.5 4.5A1 1 0 005.8 4H3a1 1 0 00-1 1z" />
                    <path d="M10 10l2-2m0 0l-2-2m2 2H7" strokeLinecap="round" className="opacity-70" />
                </svg>
                Send Media
            </button>
            <button onClick={handleSendFolder} style={buttonStyle('bridge')} title="Open current folder in MMMedia Pro's Media Manager" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-active/btn:scale-90">
                    <path d="M2 5V13a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H8L6.5 4.5A1 1 0 005.8 4H3a1 1 0 00-1 1z" />
                    <path d="M8 9v4M6 11l2 2 2-2" strokeLinecap="round" className="opacity-50" />
                </svg>
                Open in Pro
            </button>
            <button onClick={handleSendProject} style={buttonStyle('bridge')} title="Send full project to MMMedia Pro" className="group/btn">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" className="shrink-0 transition-transform group-hover/btn:scale-110 group-hover/btn:translate-y-[-1px] group-active/btn:scale-90">
                    <path d="M8 12V3" strokeLinecap="round" />
                    <path d="M5 5.5L8 2l3 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 11l1 3h8l1-3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50" />
                </svg>
                Send Project
            </button>

            {/* Feedback Toast */}
            {feedback && (
                <div style={{
                    position: 'absolute',
                    bottom: isRow ? '-36px' : undefined,
                    top: isRow ? undefined : '-36px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    animation: 'feedbackFadeIn 0.2s ease',
                    background: feedback.type === 'success' ? 'rgba(34,197,94,0.15)'
                        : feedback.type === 'error' ? 'rgba(239,68,68,0.15)'
                        : 'rgba(245,158,11,0.15)',
                    color: feedback.type === 'success' ? '#86efac'
                        : feedback.type === 'error' ? '#fca5a5'
                        : '#fcd34d',
                    border: `1px solid ${
                        feedback.type === 'success' ? 'rgba(34,197,94,0.3)'
                        : feedback.type === 'error' ? 'rgba(239,68,68,0.3)'
                        : 'rgba(245,158,11,0.3)'
                    }`,
                    zIndex: 100,
                }}>
                    {feedback.message}
                </div>
            )}

            <style>{`
                @keyframes feedbackFadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>
        </div>
    );
}
