/**
 * Metadata Extractor
 * 
 * Progressively extracts media metadata (duration, dimensions, framerate, bitrate)
 * from files using HTML5 video/image elements. Runs in the background after scanning.
 * 
 * The File System Access API file scanner only gets name/size/lastModified.
 * This module fills in the technical metadata needed for sorting & filtering.
 */

import useMediaStore from '../stores/useMediaStore';

// Track which files we've already extracted metadata for (by path)
const extractedPaths = new Set();
let isExtracting = false;
let cancelRequested = false;

/**
 * Extract metadata from a single video file.
 * Creates a temporary video element, loads it, and reads properties.
 * Returns: { duration, width, height, framerate, bitrate }
 */
function extractVideoMetadata(file) {
    return new Promise(async (resolve) => {
        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 8000); // 8s timeout per file

        let objectUrl = null;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;

        const cleanup = () => {
            clearTimeout(timeout);
            video.removeAttribute('src');
            video.load(); // Force release
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        try {
            if (!file.handle) {
                resolve(null);
                return;
            }

            const fileData = await file.handle.getFile();
            objectUrl = URL.createObjectURL(fileData);

            video.onloadedmetadata = () => {
                const duration = video.duration || 0;
                const width = video.videoWidth || 0;
                const height = video.videoHeight || 0;

                // Compute bitrate: (fileSize in bits) / duration
                const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : 0;

                cleanup();
                resolve({
                    duration,
                    width,
                    height,
                    bitrate,
                    // Framerate is not available from the browser's video element directly.
                    // We'll estimate it as 0 (unknown) unless we can detect it.
                    framerate: 0,
                    metadataExtracted: true
                });
            };

            video.onerror = () => {
                cleanup();
                resolve(null);
            };

            video.src = objectUrl;
        } catch (err) {
            cleanup();
            resolve(null);
        }
    });
}

/**
 * Try to detect framerate using requestVideoFrameCallback if supported.
 * This is more expensive - only runs if the API is available.
 */
function extractFramerate(file) {
    return new Promise(async (resolve) => {
        const timeout = setTimeout(() => {
            cleanup();
            resolve(0);
        }, 5000);

        let objectUrl = null;
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
            clearTimeout(timeout);
            video.pause();
            video.removeAttribute('src');
            video.load();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        // If requestVideoFrameCallback isn't supported, skip
        if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
            resolve(0);
            return;
        }

        try {
            if (!file.handle) { resolve(0); return; }
            const fileData = await file.handle.getFile();
            objectUrl = URL.createObjectURL(fileData);

            let frameCount = 0;
            let firstTime = null;
            let lastTime = null;

            const onFrame = (now, metadata) => {
                if (firstTime === null) firstTime = metadata.mediaTime;
                lastTime = metadata.mediaTime;
                frameCount++;

                if (frameCount >= 10) {
                    // We have enough frames to estimate
                    const elapsed = lastTime - firstTime;
                    const fps = elapsed > 0 ? Math.round((frameCount - 1) / elapsed) : 0;
                    cleanup();
                    resolve(fps);
                    return;
                }

                video.requestVideoFrameCallback(onFrame);
            };

            video.oncanplay = () => {
                video.requestVideoFrameCallback(onFrame);
                video.play().catch(() => {
                    cleanup();
                    resolve(0);
                });
            };

            video.onerror = () => {
                cleanup();
                resolve(0);
            };

            video.src = objectUrl;
        } catch (err) {
            cleanup();
            resolve(0);
        }
    });
}

/**
 * Extract metadata from a single image file.
 * Creates a temporary Image element and reads natural dimensions.
 * Returns: { width, height }
 */
function extractImageMetadata(file) {
    return new Promise(async (resolve) => {
        const timeout = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 5000);

        let objectUrl = null;

        const cleanup = () => {
            clearTimeout(timeout);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        try {
            if (!file.handle) {
                resolve(null);
                return;
            }

            const fileData = await file.handle.getFile();
            objectUrl = URL.createObjectURL(fileData);

            const img = new Image();
            img.onload = () => {
                const result = {
                    width: img.naturalWidth || 0,
                    height: img.naturalHeight || 0,
                    duration: 0,
                    bitrate: 0,
                    framerate: 0,
                    metadataExtracted: true
                };
                cleanup();
                resolve(result);
            };

            img.onerror = () => {
                cleanup();
                resolve(null);
            };

            img.src = objectUrl;
        } catch (err) {
            cleanup();
            resolve(null);
        }
    });
}

/**
 * Run metadata extraction on all files that haven't been processed yet.
 * Processes in batches with concurrency control.
 * 
 * @param {boolean} forceAll - If true, re-extract even if already done
 */
export async function extractAllMetadata(forceAll = false) {
    if (isExtracting) {
        console.log('[MetadataExtractor] Already running, skipping.');
        return;
    }

    isExtracting = true;
    cancelRequested = false;

    const store = useMediaStore.getState();
    const files = store.files;
    const CONCURRENCY = 4; // Process 4 files at a time
    const BATCH_PAUSE = 50; // ms pause between batches to keep UI smooth

    // Filter to files we haven't processed yet
    const toProcess = files.filter(f => {
        if (!f.handle) return false;
        if (!forceAll && (extractedPaths.has(f.path) || f.metadataExtracted)) return false;
        return true;
    });

    if (toProcess.length === 0) {
        isExtracting = false;
        return;
    }

    console.log(`[MetadataExtractor] Starting extraction for ${toProcess.length} files...`);

    let processed = 0;
    let updated = 0;

    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
        if (cancelRequested) {
            console.log('[MetadataExtractor] Cancelled.');
            break;
        }

        const batch = toProcess.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
            batch.map(async (file) => {
                let metadata = null;

                if (file.type === 'video') {
                    metadata = await extractVideoMetadata(file);

                    // Try to get framerate if basic extraction succeeded
                    if (metadata && metadata.duration > 0) {
                        const fps = await extractFramerate(file);
                        if (fps > 0) {
                            metadata.framerate = fps;
                        }
                    }
                } else if (file.type === 'image') {
                    metadata = await extractImageMetadata(file);
                }

                return { file, metadata };
            })
        );

        // Batch-update the store
        const currentStore = useMediaStore.getState();
        for (const { file, metadata } of results) {
            if (metadata) {
                currentStore.updateFileMetadata(file.path, metadata);
                updated++;
            }
            extractedPaths.add(file.path);
            processed++;
        }

        // Log progress periodically
        if (processed % 20 === 0 || processed === toProcess.length) {
            console.log(`[MetadataExtractor] Progress: ${processed}/${toProcess.length} (${updated} updated)`);
        }

        // Yield to UI
        await new Promise(r => setTimeout(r, BATCH_PAUSE));
    }

    console.log(`[MetadataExtractor] Complete! ${updated}/${processed} files updated.`);
    isExtracting = false;

    // Trigger a final sort update so the UI reflects the new metadata
    useMediaStore.getState().updateProcessedFiles(true);
}

/**
 * Cancel any running extraction
 */
export function cancelExtraction() {
    cancelRequested = true;
}

/**
 * Reset the extraction cache (e.g., when opening a new folder)
 */
export function resetExtractionCache() {
    extractedPaths.clear();
    cancelRequested = true;
}

/**
 * Check if extraction is currently running
 */
export function isExtractionRunning() {
    return isExtracting;
}
