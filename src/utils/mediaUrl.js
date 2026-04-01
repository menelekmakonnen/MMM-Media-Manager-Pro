/**
 * Media URL Manager
 * 
 * Converts File System Access API file handles into usable blob URLs.
 * The `atom://` protocol was never registered in Electron, so all media
 * URLs were silently failing. This module replaces that approach with
 * handle-based blob URL resolution + an LRU cache for memory management.
 */

const urlCache = new Map();
const MAX_URL_CACHE = 300;

/**
 * Get a usable media URL from a file object.
 * Uses the file's handle to create a blob URL, with LRU caching.
 * 
 * @param {Object} file - File object with handle, path, type properties
 * @returns {Promise<string|null>} Blob URL or null on failure
 */
export const getMediaUrl = async (file) => {
    if (!file) return null;

    const cacheKey = file.id || file.path;

    // Check cache first
    if (urlCache.has(cacheKey)) {
        return urlCache.get(cacheKey);
    }

    // For GIFs in image type, try handle-based approach
    if (!file.handle) {
        console.warn('[mediaUrl] No handle for file:', file.path);
        return null;
    }

    try {
        const fileData = await file.handle.getFile();
        const url = URL.createObjectURL(fileData);

        // LRU eviction
        if (urlCache.size >= MAX_URL_CACHE) {
            const firstKey = urlCache.keys().next().value;
            const oldUrl = urlCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            urlCache.delete(firstKey);
        }

        urlCache.set(cacheKey, url);
        return url;
    } catch (err) {
        console.error('[mediaUrl] Failed to create URL for:', file.path, err);
        return null;
    }
};

/**
 * Synchronous cache lookup — returns cached URL or null.
 * Does NOT create a new URL.
 */
export const getCachedMediaUrl = (file) => {
    if (!file) return null;
    const cacheKey = file.id || file.path;
    return urlCache.get(cacheKey) || null;
};

/**
 * Revoke a specific file's URL from the cache
 */
export const revokeMediaUrl = (file) => {
    if (!file) return;
    const cacheKey = file.id || file.path;
    const url = urlCache.get(cacheKey);
    if (url) {
        URL.revokeObjectURL(url);
        urlCache.delete(cacheKey);
    }
};

/**
 * Clear all cached media URLs
 */
export const clearMediaUrls = () => {
    urlCache.forEach(url => URL.revokeObjectURL(url));
    urlCache.clear();
};
