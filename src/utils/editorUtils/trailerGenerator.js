import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_FPS } from './time';
import { analyzeAudio } from './audioAnalysis';

/**
 * Generates a procedural sequence of media clips based on dynamic constraints.
 * 
 * @param {Array} pool - The active media files to pull from.
 * @param {Object} settings - { targetDuration, shortestClip, longestClip, allowDuplicates, allowSameSegment, mediaType, useAllClips, useAudioGuide, beatTimestamps }
 * @returns {Array} A sequence array of Clip objects
 */
export const generateTrailerSequence = (pool, settings) => {
    if (!pool || pool.length === 0) return [];
    
    let {
        targetDuration = 30,
        shortestClip = 0.2,
        longestClip = 1.0,
        allowDuplicates = true,
        allowSameSegment = false,
        mediaType = 'video',
        useAllClips = false,
        useAudioGuide = false,
        beatTimestamps = null,
        audioMixStrategy = 'muted',
        slowmoPolicy = 'none',
    } = settings;

    // 1. Filter Pool
    let validPool = pool.filter(f => {
        if (mediaType === 'video') return f.type === 'video';
        if (mediaType === 'image') return f.type === 'image';
        if (mediaType === 'gif') return f.name.toLowerCase().endsWith('.gif');
        return true;
    });

    if (validPool.length === 0) validPool = pool;

    // Force chop behavior if there's exactly one video
    if (validPool.length === 1) {
        allowDuplicates = true;
    }

    // Add source durations (in frames)
    validPool = validPool.map(f => {
        let durationFrames = 9000; // Assume 5 min if unknown
        if (f.duration) durationFrames = Math.floor(f.duration * DEFAULT_FPS);
        if (mediaType !== 'video') durationFrames = 900; // Images act as 30s clips
        return { ...f, sourceDurationFrames: durationFrames };
    });

    const targetFrames = Math.floor(targetDuration * DEFAULT_FPS);
    const minFrames = Math.max(1, Math.floor(shortestClip * DEFAULT_FPS));
    const maxFrames = Math.max(minFrames + 1, Math.floor(longestClip * DEFAULT_FPS));

    let accumulatedFrames = 0;
    const sequence = [];
    const usedFiles = new Set();
    const usedSegments = new Map();

    let consecutiveFailures = 0;
    let lastDurationFrames = -1;

    // Helper for true uniform shuffle
    const shuffleArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    // Helper for generating dynamic cinematic attributes per clip
    const getSpeedAndVolume = () => {
        let speed = 1.0;
        if (slowmoPolicy === 'all') speed = 0.5;
        else if (slowmoPolicy === 'mixed' && Math.random() > 0.6) speed = 0.5;

        let volume = 100;
        let isMuted = false;
        
        if (useAudioGuide) {
            if (audioMixStrategy === 'muted') {
                volume = 0;
                isMuted = true;
            } else if (audioMixStrategy === 'subtle') {
                volume = 20;
            } else if (audioMixStrategy === 'ducking') {
                volume = (Math.random() > 0.8) ? 100 : 15;
            }
        }
        
        return { speed, volume, isMuted };
    };

    // Helper to find the most visually distinct timestamp furthest from previously used clips
    const getBestTrimStart = (maxStart, sourceReq, history) => {
        const START_OFFSET_FRAMES = Math.floor(1.0 * DEFAULT_FPS); // Skip first 1 second to avoid black fades
        const actualMaxStart = maxStart > START_OFFSET_FRAMES ? maxStart - START_OFFSET_FRAMES : maxStart;
        const baseOffset = maxStart > START_OFFSET_FRAMES ? START_OFFSET_FRAMES : 0;

        if (!history || history.length === 0 || actualMaxStart <= 0) {
            return baseOffset + Math.floor(Math.random() * Math.max(0, actualMaxStart));
        }
        
        let bestTrimStart = baseOffset + Math.floor(Math.random() * actualMaxStart);
        let maxDistance = -1;
        const numCandidates = 15;

        for (let i = 0; i < numCandidates; i++) {
            const candidate = baseOffset + Math.floor(Math.random() * actualMaxStart);
            const candEnd = candidate + sourceReq;
            let minDist = Infinity;
            
            for (const range of history) {
                const [s, e] = range.split('-').map(Number);
                let dist = 0;
                if (candEnd < s) dist = s - candEnd;
                else if (candidate > e) dist = candidate - e;
                else dist = 0; // Overlap
                
                if (dist < minDist) minDist = dist;
            }
            
            if (minDist > maxDistance) {
                maxDistance = minDist;
                bestTrimStart = candidate;
            }
        }
        return bestTrimStart;
    };

    // === AUDIO BEAT MODE ===
    // If beat timestamps supplied, generate clips that fill the gaps between beats
    // using clips whose durations respect the user's pacing sliders.
    if (useAudioGuide && beatTimestamps && beatTimestamps.length > 1) {
        const shuffledPool = shuffleArray(validPool);
        let poolIndex = 0;

        for (let b = 0; b < beatTimestamps.length - 1; b++) {
            const beatGapSeconds = beatTimestamps[b + 1] - beatTimestamps[b];
            const beatGapFrames = Math.floor(beatGapSeconds * DEFAULT_FPS);

            // Fill this beat gap with clips from [shortestClip, longestClip]
            let gapFilled = 0;
            let gapFailures = 0;

            while (gapFilled < beatGapFrames && gapFailures < 20) {
                const remaining = beatGapFrames - gapFilled;
                let clipDuration = Math.floor(Math.random() * (maxFrames - minFrames + 1)) + minFrames;
                if (clipDuration > remaining) clipDuration = remaining;
                if (clipDuration < Math.floor(0.05 * DEFAULT_FPS)) { gapFilled = beatGapFrames; break; }

                const file = shuffledPool[poolIndex % shuffledPool.length];
                poolIndex++;

                const { speed, volume, isMuted } = getSpeedAndVolume();
                const sourceReq = Math.max(1, Math.ceil(clipDuration * speed));

                const maxStart = Math.max(0, file.sourceDurationFrames - sourceReq);
                const history = usedSegments.get(file.path) || [];
                const trimStart = getBestTrimStart(maxStart, sourceReq, history);
                const trimEnd = trimStart + sourceReq;
                
                if (!usedSegments.has(file.path)) usedSegments.set(file.path, []);
                usedSegments.get(file.path).push(`${trimStart}-${trimEnd}`);

                sequence.push({
                    id: uuidv4(),
                    mediaLibraryId: file.id || file.path,
                    type: file.type,
                    path: file.path,
                    filename: file.name || file.filename,
                    startFrame: accumulatedFrames + gapFilled,
                    endFrame: accumulatedFrames + gapFilled + clipDuration,
                    sourceDurationFrames: file.sourceDurationFrames,
                    trimStartFrame: trimStart,
                    trimEndFrame: trimEnd,
                    track: 1, speed, volume,
                    reversed: false, isMuted, isPinned: false,
                    origin: 'trailer', locked: false
                });
                gapFilled += clipDuration;
            }
            accumulatedFrames += beatGapFrames;
        }
        return sequence;
    }

    // === STANDARD MODE ===

    // If useAllClips: first pass guarantees every file appears at least once
    if (useAllClips && validPool.length > 0) {
        const shuffledEnsure = shuffleArray(validPool);
        for (let i = 0; i < shuffledEnsure.length; i++) {
            const file = shuffledEnsure[i];
            if (accumulatedFrames >= targetFrames) break;
            
            const remainingFrames = targetFrames - accumulatedFrames;
            const remainingFiles = shuffledEnsure.length - i;
            let dynamicMaxFrames = Math.floor(remainingFrames / remainingFiles);
            if (dynamicMaxFrames < minFrames) dynamicMaxFrames = minFrames; // Guarantee minFrames

            let cutDurationFrames = Math.floor(Math.random() * (maxFrames - minFrames + 1)) + minFrames;
            if (cutDurationFrames > dynamicMaxFrames) cutDurationFrames = dynamicMaxFrames;

            const { speed, volume, isMuted } = getSpeedAndVolume();
            const sourceReq = Math.max(1, Math.ceil(cutDurationFrames * speed));

            const sourceAvailable = file.sourceDurationFrames;
            if (sourceReq > sourceAvailable) cutDurationFrames = Math.floor(sourceAvailable / speed);

            const maxStart = Math.max(0, sourceAvailable - sourceReq);
            const history = usedSegments.get(file.path) || [];
            const trimStart = getBestTrimStart(maxStart, sourceReq, history);
            const trimEnd = trimStart + sourceReq;
            
            if (!usedSegments.has(file.path)) usedSegments.set(file.path, []);
            usedSegments.get(file.path).push(`${trimStart}-${trimEnd}`);

            sequence.push({
                id: uuidv4(),
                mediaLibraryId: file.id || file.path,
                type: file.type, path: file.path,
                filename: file.name || file.filename,
                startFrame: accumulatedFrames,
                endFrame: accumulatedFrames + cutDurationFrames,
                sourceDurationFrames: sourceAvailable,
                trimStartFrame: trimStart,
                trimEndFrame: trimEnd,
                track: 1, speed, volume,
                reversed: false, isMuted, isPinned: false,
                origin: 'trailer', locked: false
            });
            accumulatedFrames += cutDurationFrames;
            usedFiles.add(file.path);
        }
        // Allow creative overflow: keep filling beyond the guaranteed pass
        allowDuplicates = true;
    }

    // Continue filling remaining target duration
    while (accumulatedFrames < targetFrames && consecutiveFailures < 100) {
        const fileIndex = Math.floor(Math.random() * validPool.length);
        const file = validPool[fileIndex];

        if (!allowDuplicates && usedFiles.has(file.path)) {
            consecutiveFailures++;
            continue;
        }

        let cutDurationFrames = Math.floor(Math.random() * (maxFrames - minFrames + 1)) + minFrames;
        
        // Prevent identical consecutive durations
        if (maxFrames > minFrames && cutDurationFrames === lastDurationFrames) {
            cutDurationFrames = (cutDurationFrames === maxFrames) ? minFrames : cutDurationFrames + 1;
        }

        const sourceAvailable = file.sourceDurationFrames;
        let safeDuration = cutDurationFrames;
        if (safeDuration > sourceAvailable) {
            if (mediaType === 'video' && sourceAvailable < minFrames) {
                consecutiveFailures++;
                continue;
            }
            safeDuration = sourceAvailable;
        }

        const { speed, volume, isMuted } = getSpeedAndVolume();
        const sourceReq = Math.max(1, Math.ceil(safeDuration * speed));

        const maxStart = Math.max(0, sourceAvailable - sourceReq);
        const history = usedSegments.get(file.path) || [];
        let trimStart = getBestTrimStart(maxStart, sourceReq, history);
        let trimEnd = trimStart + sourceReq;

        if (!allowSameSegment && usedSegments.has(file.path)) {
            let collision = history.some(range => {
                const [s, e] = range.split('-').map(Number);
                return (trimStart < e && trimEnd > s);
            });

            if (collision) {
                for(let i=0; i<3; i++){
                    trimStart = getBestTrimStart(maxStart, sourceReq, history);
                    trimEnd = trimStart + sourceReq;
                    collision = history.some(range => {
                        const [s, e] = range.split('-').map(Number);
                        return (trimStart < e && trimEnd > s);
                    });
                    if(!collision) break;
                }

                if(collision) {
                    consecutiveFailures++;
                    if (consecutiveFailures > 50 && allowDuplicates) {
                        usedSegments.clear();
                        allowSameSegment = true;
                        consecutiveFailures = 0;
                    }
                    continue;
                }
            }
        }

        consecutiveFailures = 0;
        usedFiles.add(file.path);
        
        if (!usedSegments.has(file.path)) usedSegments.set(file.path, []);
        usedSegments.get(file.path).push(`${trimStart}-${trimEnd}`);

        sequence.push({
            id: uuidv4(),
            mediaLibraryId: file.id || file.path, 
            type: file.type,
            path: file.path,
            filename: file.name || file.filename,
            startFrame: accumulatedFrames,
            endFrame: accumulatedFrames + safeDuration,
            sourceDurationFrames: sourceAvailable,
            trimStartFrame: trimStart,
            trimEndFrame: trimEnd,
            track: 1, speed, volume,
            reversed: false, isMuted, isPinned: false,
            origin: "trailer", locked: false
        });

        accumulatedFrames += safeDuration;
        lastDurationFrames = safeDuration;

        if (!allowDuplicates && usedFiles.size >= validPool.length) {
            break;
        }
    }

    return sequence;
};

/**
 * Analyzes an audio URL for beat timestamps using the existing analyzeAudio util.
 * Returns an array of beat times in seconds within the user's selected trim range.
 */
export const extractBeatTimestamps = async (audioUrl, trimStart = 0, trimEnd = 30) => {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const result = await analyzeAudio(audioBuffer);
        
        // Filter peaks to within the user's trim window
        const beats = result.peaks
            .filter(p => p.time >= trimStart && p.time <= trimEnd)
            .map(p => p.time - trimStart); // Normalize to 0-based
        
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
