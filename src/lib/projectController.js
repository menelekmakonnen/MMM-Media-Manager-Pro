/**
 * MMMedia Darkroom — Project Controller
 * 
 * Handles .mmm file save/load operations and inter-app bridge communication.
 * Mirrors Pro's projectController.ts pattern.
 */

import { useProjectStore } from '../stores/projectStore';
import { useClipStore } from '../stores/clipStore';
import {
    createMMMFile,
    validateMMMFile,
    normalizeMMMFile,
    convertDarkroomClipToManifest
} from './mmmProtocol';

/**
 * Save the current project as a .mmm file.
 * Uses Electron IPC if available, otherwise falls back to browser download.
 */
export async function saveProject() {
    try {
        const settings = useProjectStore.getState().settings;
        const clips = useClipStore.getState().clips;

        const mmmContent = createMMMFile(settings, clips);

        // Validate before saving
        const parsed = JSON.parse(mmmContent);
        const validation = validateMMMFile(parsed);
        if (!validation.valid) {
            console.error('[ProjectController] Validation failed:', validation.errors);
            // Still allow saving — just warn
        }

        if (window.electronAPI?.saveMMMProject) {
            const result = await window.electronAPI.saveMMMProject(mmmContent);
            if (result.success) {
                console.log('[ProjectController] Project saved to:', result.filePath);
                return { success: true, filePath: result.filePath };
            } else {
                console.error('[ProjectController] Save failed:', result.error);
                return { success: false, error: result.error };
            }
        } else {
            // Browser fallback — download as file
            const safeName = (settings.name || 'project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const blob = new Blob([mmmContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.mmm`;
            a.click();
            URL.revokeObjectURL(url);
            return { success: true, filePath: `${safeName}.mmm` };
        }
    } catch (e) {
        console.error('[ProjectController] Save exception:', e);
        return { success: false, error: String(e) };
    }
}

/**
 * Load a .mmm project file.
 * Returns true if load was successful.
 */
export async function loadProject() {
    try {
        let content;

        if (window.electronAPI?.loadMMMProject) {
            const result = await window.electronAPI.loadMMMProject();
            if (result.canceled) return { success: false, canceled: true };
            if (!result.success || !result.content) {
                return { success: false, error: result.error || 'No content' };
            }
            content = result.content;
        } else {
            // Browser fallback — file picker
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.mmm,.json';
                input.onchange = async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) { resolve({ success: false, canceled: true }); return; }
                    const text = await file.text();
                    const result = processLoadedContent(text);
                    resolve(result);
                };
                input.click();
            });
        }

        return processLoadedContent(content);
    } catch (e) {
        console.error('[ProjectController] Load exception:', e);
        return { success: false, error: String(e) };
    }
}

/**
 * Process loaded .mmm content — validate, normalize, hydrate stores.
 */
function processLoadedContent(content) {
    try {
        const data = JSON.parse(content);
        const validation = validateMMMFile(data);

        if (!validation.valid) {
            console.warn('[ProjectController] Validation warnings:', validation.errors);
            // Continue loading despite warnings
        }

        console.log(`[ProjectController] Loading ${validation.format} format project`);

        const { settings, clips } = normalizeMMMFile(data);

        // Hydrate stores
        const projectStore = useProjectStore.getState();
        projectStore.updateSettings(settings);

        const clipStore = useClipStore.getState();
        clipStore.setClips(clips);

        console.log(`[ProjectController] Loaded: "${settings.name}" with ${clips.length} clips`);
        return {
            success: true,
            projectName: settings.name,
            clipCount: clips.length,
            format: validation.format,
            warnings: validation.errors
        };
    } catch (e) {
        console.error('[ProjectController] Parse error:', e);
        return { success: false, error: `Failed to parse project file: ${e.message}` };
    }
}

/**
 * Import content received from Pro via the live bridge.
 */
export function importFromPro(mmmContent) {
    return processLoadedContent(
        typeof mmmContent === 'string' ? mmmContent : JSON.stringify(mmmContent)
    );
}

/**
 * Export current state for sending to Pro via the live bridge.
 * Returns the Manifest-format JSON string.
 */
export function exportForPro() {
    const settings = useProjectStore.getState().settings;
    const clips = useClipStore.getState().clips;
    return createMMMFile(settings, clips);
}

/**
 * Export current state with full source media file references for Pro.
 * Returns an object containing both the edit payload AND source file metadata.
 * This enables Pro to locate and import the actual media files.
 */
export function exportForProWithMedia() {
    const settings = useProjectStore.getState().settings;
    const clips = useClipStore.getState().clips;

    // Collect unique source media files from clips
    const fileMap = new Map();
    clips.forEach(clip => {
        if (!clip.path || fileMap.has(clip.path)) return;
        fileMap.set(clip.path, {
            path: clip.path,
            filename: clip.filename || clip.path.split('/').pop() || clip.path.split('\\').pop(),
            type: clip.type || 'video',
            duration: clip.sourceDurationFrames ? clip.sourceDurationFrames / 30 : null,
            orientation: clip.sourceOrientation || null,
        });
    });

    const editPayload = createMMMFile(settings, clips);

    return {
        type: 'darkroom-export',
        version: '2.0',
        editPayload,                          // Full .mmm project JSON string
        sourceFiles: Array.from(fileMap.values()), // Array of { path, filename, type, duration, orientation }
        project: {
            name: settings.name,
            clipCount: clips.length,
            uniqueFileCount: fileMap.size,
            resolution: settings.resolution,
            fps: settings.fps,
            totalFrames: clips.reduce((max, c) => Math.max(max, c.endFrame || 0), 0),
        },
        exportedAt: new Date().toISOString(),
    };
}

/**
 * Get a summary of the current project for bridge handshake.
 */
export function getProjectSummary() {
    const settings = useProjectStore.getState().settings;
    const clips = useClipStore.getState().clips;

    // Count unique source files
    const uniquePaths = new Set(clips.map(c => c.path).filter(Boolean));

    return {
        name: settings.name,
        clipCount: clips.length,
        uniqueFileCount: uniquePaths.size,
        resolution: settings.resolution,
        fps: settings.fps,
        totalFrames: clips.reduce((max, c) => Math.max(max, c.endFrame || 0), 0)
    };
}
