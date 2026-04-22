/**
 * MMMedia .mmm Protocol — Shared schema between Darkroom & Pro
 * 
 * Handles two serialization formats:
 *   1. "Manifest" — structured { manifestVersion, project, clips[] } with timelineIn/Out field names
 *   2. "Raw" — direct store dump { settings, clips } using startFrame/endFrame field names
 * 
 * Darkroom reads/writes both. Pro is the canonical source of truth for the spec.
 */

export const MANIFEST_VERSION = '1.0.0';
export const MMM_FILE_EXTENSION = '.mmm';

// ─── Validation ─────────────────────────────────────────────────────

/**
 * Detect whether a parsed .mmm file is Manifest format or Raw format.
 * @param {object} data - Parsed JSON
 * @returns {'manifest' | 'raw' | 'unknown'}
 */
export function detectFormat(data) {
    if (!data || typeof data !== 'object') return 'unknown';
    if (data.manifestVersion && data.project && Array.isArray(data.clips)) return 'manifest';
    if (data.settings && Array.isArray(data.clips)) return 'raw';
    return 'unknown';
}

/**
 * Validate a parsed .mmm file.
 * @param {object} data - Parsed JSON
 * @returns {{ valid: boolean, errors: string[], format: string }}
 */
export function validateMMMFile(data) {
    const errors = [];
    const format = detectFormat(data);

    if (format === 'unknown') {
        return { valid: false, errors: ['Unrecognized .mmm file format. Expected Manifest or Raw project data.'], format };
    }

    if (format === 'manifest') {
        // Validate Manifest format
        if (!data.project) errors.push("Missing 'project' settings");
        else {
            if (!data.project.name) errors.push("Missing project name");
            if (!data.project.resolution || typeof data.project.resolution.width !== 'number') {
                errors.push("Invalid or missing project resolution");
            }
            if (typeof data.project.fps !== 'number') errors.push("Invalid or missing project FPS");
        }

        if (!Array.isArray(data.clips)) {
            errors.push("'clips' must be an array");
        } else {
            data.clips.forEach((clip, i) => {
                if (!clip.id) errors.push(`Clip[${i}] missing 'id'`);
                if (!clip.file && !clip.filename) errors.push(`Clip[${i}] missing 'file'/'filename'`);
                if (typeof clip.timelineIn !== 'number' && typeof clip.startFrame !== 'number') {
                    errors.push(`Clip[${i}] has no timing fields (timelineIn or startFrame)`);
                }
            });
        }
    }

    if (format === 'raw') {
        // Validate Raw format
        const s = data.settings;
        if (!s) errors.push("Missing 'settings'");
        else {
            if (!s.name && !s.id) errors.push("Settings missing name or id");
            if (!s.resolution) errors.push("Settings missing resolution");
            if (typeof s.fps !== 'number') errors.push("Settings missing or invalid fps");
        }

        if (!Array.isArray(data.clips)) {
            errors.push("'clips' must be an array");
        } else {
            data.clips.forEach((clip, i) => {
                if (!clip.id) errors.push(`Clip[${i}] missing 'id'`);
                if (typeof clip.startFrame !== 'number') errors.push(`Clip[${i}] missing 'startFrame'`);
            });
        }
    }

    return { valid: errors.length === 0, errors, format };
}


// ─── Normalization (any format → Darkroom internal) ─────────────────

/**
 * Normalize a parsed .mmm file into Darkroom's internal representation.
 * Returns { settings, clips } matching Darkroom's store shapes.
 * 
 * @param {object} data - Parsed .mmm file content
 * @returns {{ settings: object, clips: object[] }}
 */
export function normalizeMMMFile(data) {
    const format = detectFormat(data);

    if (format === 'raw') {
        // Already in Darkroom's native format — pass through with defaults
        return {
            settings: normalizeSettings(data.settings),
            clips: (data.clips || []).map(normalizeRawClip)
        };
    }

    if (format === 'manifest') {
        return {
            settings: normalizeManifestProject(data.project),
            clips: (data.clips || []).map(convertManifestClipToDarkroom)
        };
    }

    throw new Error('Cannot normalize unrecognized .mmm format');
}

function normalizeSettings(s) {
    return {
        id: s.id || crypto.randomUUID(),
        name: s.name || 'Imported Project',
        resolution: s.resolution || { width: 1920, height: 1080, label: '16:9 Widescreen' },
        aspectRatio: s.aspectRatio || '16:9',
        fps: s.fps || 30,
        backgroundFillMode: s.backgroundFillMode || 'blur',
        createdAt: s.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        seed: s.seed,
        projectType: s.projectType,
        targetDurationSeconds: s.targetDurationSeconds,
        sequenceLoop: s.sequenceLoop ?? false,
        sequenceViewSplitHeight: s.sequenceViewSplitHeight ?? 50
    };
}

function normalizeManifestProject(proj) {
    const w = proj.resolution?.width || 1920;
    const h = proj.resolution?.height || 1080;
    let aspectRatio = '16:9';
    if (w < h) aspectRatio = '9:16';
    else if (w === h) aspectRatio = '1:1';
    else if (w / h > 2) aspectRatio = '21:9';
    else if (Math.abs(w / h - 4 / 3) < 0.1) aspectRatio = '4:3';

    return {
        id: crypto.randomUUID(),
        name: proj.name || 'Imported from Pro',
        resolution: { width: w, height: h, label: `${w}x${h}` },
        aspectRatio,
        fps: proj.fps || 30,
        backgroundFillMode: 'blur',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        seed: proj.seed
    };
}

function normalizeRawClip(clip) {
    // Raw clips are already in Darkroom format, just ensure defaults
    return {
        id: clip.id || crypto.randomUUID(),
        type: clip.type || 'video',
        path: clip.path || '',
        filename: clip.filename || clip.path?.split(/[/\\]/).pop() || 'unknown',
        startFrame: clip.startFrame ?? 0,
        endFrame: clip.endFrame ?? 150,
        sourceDurationFrames: clip.sourceDurationFrames ?? (clip.endFrame - clip.startFrame) ?? 150,
        trimStartFrame: clip.trimStartFrame ?? 0,
        trimEndFrame: clip.trimEndFrame ?? clip.sourceDurationFrames ?? 150,
        track: clip.track ?? 1,
        speed: clip.speed ?? 1,
        volume: clip.volume ?? 100,
        reversed: clip.reversed ?? false,
        locked: clip.locked ?? false,
        isPinned: clip.isPinned ?? false,
        isMuted: clip.isMuted ?? false,
        origin: clip.origin || 'manual',
        effectIds: clip.effectIds || [],
        speedRampId: clip.speedRampId || null,
        metadata: clip.metadata || null,
        mediaLibraryId: clip.mediaLibraryId || null,
        // Grid support
        ...(clip.type === 'grid' && {
            gridFormat: clip.gridFormat,
            numCells: clip.numCells,
            backgroundMode: clip.backgroundMode,
            cells: clip.cells
        })
    };
}


// ─── Manifest ↔ Darkroom Clip Conversion ────────────────────────────

/**
 * Convert a Manifest clip (Pro format) to Darkroom internal clip.
 */
export function convertManifestClipToDarkroom(mc) {
    return {
        id: mc.id,
        type: mc.type === 'text' ? 'video' : mc.type === 'grid' ? 'grid' : mc.type || 'video',
        path: mc.file || '',
        filename: mc.file || 'unknown',
        startFrame: mc.timelineIn ?? mc.startFrame ?? 0,
        endFrame: mc.timelineOut ?? mc.endFrame ?? 150,
        sourceDurationFrames: mc.metadata?.durationFrames || ((mc.sourceOut ?? mc.trimEndFrame ?? 150) - (mc.sourceIn ?? mc.trimStartFrame ?? 0)),
        trimStartFrame: mc.sourceIn ?? mc.trimStartFrame ?? 0,
        trimEndFrame: mc.sourceOut ?? mc.trimEndFrame ?? 150,
        track: mc.track ?? 1,
        speed: mc.speed ?? 1,
        volume: mc.volume ?? 100,
        reversed: mc.reversed ?? false,
        locked: mc.locked ?? false,
        isPinned: false,
        isMuted: false,
        origin: mc.origin || 'manual',
        effectIds: mc.effects || [],
        speedRampId: mc.speedRampId || null,
        metadata: mc.metadata ? {
            width: mc.metadata.width,
            height: mc.metadata.height,
            fps: mc.metadata.fps,
            format: mc.metadata.format
        } : null,
        // Grid support
        ...(mc.type === 'grid' && {
            gridFormat: mc.gridFormat,
            numCells: mc.numCells,
            backgroundMode: mc.backgroundMode,
            cells: mc.cells
        })
    };
}

/**
 * Convert a Darkroom internal clip to Manifest clip (Pro format).
 */
export function convertDarkroomClipToManifest(clip) {
    return {
        id: clip.id,
        file: clip.filename || clip.path?.split(/[/\\]/).pop() || '',
        type: clip.type || 'video',
        timelineIn: clip.startFrame,
        timelineOut: clip.endFrame,
        sourceIn: clip.trimStartFrame,
        sourceOut: clip.trimEndFrame,
        track: clip.track ?? 1,
        speed: clip.speed ?? 1,
        volume: clip.volume ?? 100,
        reversed: clip.reversed ?? false,
        locked: clip.locked ?? false,
        origin: clip.origin || 'manual',
        effects: clip.effectIds || [],
        speedRampId: clip.speedRampId || null,
        metadata: {
            width: clip.metadata?.width,
            height: clip.metadata?.height,
            durationFrames: clip.sourceDurationFrames
        },
        // Grid support
        ...(clip.type === 'grid' && {
            gridFormat: clip.gridFormat,
            numCells: clip.numCells,
            backgroundMode: clip.backgroundMode,
            cells: (clip.cells || []).map(cell => ({
                id: cell.id,
                x: cell.x,
                y: cell.y,
                width: cell.width,
                height: cell.height,
                clip: cell.clip ? {
                    id: cell.clip.id,
                    file: cell.clip.filename,
                    type: cell.clip.type,
                    timelineIn: cell.clip.startFrame,
                    timelineOut: cell.clip.endFrame,
                    sourceIn: cell.clip.trimStartFrame,
                    sourceOut: cell.clip.trimEndFrame,
                    speed: cell.clip.speed,
                    volume: cell.clip.volume,
                    metadata: { durationFrames: cell.clip.sourceDurationFrames }
                } : null
            }))
        })
    };
}


// ─── Serialization (Darkroom state → .mmm file) ────────────────────

/**
 * Create a spec-compliant .mmm file from Darkroom state.
 * Uses the Manifest format for maximum compatibility with Pro.
 * 
 * @param {object} settings - From projectStore
 * @param {object[]} clips - From clipStore
 * @returns {string} JSON string
 */
export function createMMMFile(settings, clips) {
    const manifest = {
        manifestVersion: MANIFEST_VERSION,
        project: {
            name: settings.name || 'Untitled Project',
            resolution: {
                width: settings.resolution?.width || 1920,
                height: settings.resolution?.height || 1080
            },
            fps: settings.fps || 30,
            seed: settings.seed || null,
            schemaVersion: MANIFEST_VERSION
        },
        clips: clips.map(convertDarkroomClipToManifest),
        textItems: [],
        gridLayouts: [],
        operationLog: [],
        metadata: {
            createdBy: 'MMMedia Darkroom v2.0.0',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        }
    };
    return JSON.stringify(manifest, null, 2);
}
