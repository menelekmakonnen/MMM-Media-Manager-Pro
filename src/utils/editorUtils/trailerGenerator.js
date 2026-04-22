/**
 * Trailer Generator — Re-export shim
 * Routes to MMMedia Pro's advanced trailer generation engine.
 * Pro's engine adds: Editing Style Engine, Transitions, Beat Intelligence,
 * Orientation Filtering, Grid support, and Segment-Aware Beat Sync.
 */
export {
    generateTrailerSequence,
    DEFAULT_TRAILER_SETTINGS,
    DEFAULT_STYLE_CONFIG,
} from '@mmm-pro/lib/trailerGenerator';

import { analyzeAudio } from '@mmm-pro/lib/audioAnalysis';

/**
 * Extracts beat timestamps from an audio URL within a trim window.
 * Uses Pro's multi-band spectral analysis for richer beat detection.
 * 
 * @param {string} audioUrl - ObjectURL or path to audio file
 * @param {number} trimStart - Start of trim window in seconds
 * @param {number} trimEnd - End of trim window in seconds
 * @returns {number[]|null} Array of beat times (0-based relative to trimStart)
 */
export const extractBeatTimestamps = async (audioUrl, trimStart = 0, trimEnd = 30) => {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const result = await analyzeAudio(audioBuffer);
        
        // Use Pro's rich beat markers (with type classification) instead of simple peaks
        const beats = result.beats
            .filter(b => b.time >= trimStart && b.time <= trimEnd)
            .map(b => b.time - trimStart); // Normalize to 0-based
        
        // Always add a 0 boundary
        if (beats.length === 0 || beats[0] > 0.5) beats.unshift(0);
        // Always add end boundary
        const duration = trimEnd - trimStart;
        if (beats[beats.length - 1] < duration - 0.5) beats.push(duration);
        
        await audioContext.close();
        return beats;
    } catch (e) {
        console.warn('[TrailerGenerator] Beat extraction failed, falling back to standard mode:', e);
        return null;
    }
};
