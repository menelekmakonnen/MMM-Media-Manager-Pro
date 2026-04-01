// Thumbnail cache to avoid reloading same files
import { getMediaUrl } from './mediaUrl';

const thumbnailCache = new Map();
const MAX_CACHE_SIZE = 500; // Reduced from 1000 to prevent memory bloat

export const generateVideoThumbnail = async (file) => {
    // First get a usable URL from the file handle
    const sourceUrl = await getMediaUrl(file);
    if (!sourceUrl) throw new Error('Could not get media URL for video');

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.src = sourceUrl;

        // Faster capture by seeking to a very early frame
        video.onloadedmetadata = () => {
            video.currentTime = 0.5; // Slightly faster than 1s
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                // Much smaller for thumbnails to save memory and speed
                const scale = Math.min(240 / video.videoWidth, 240 / video.videoHeight);
                canvas.width = video.videoWidth * scale;
                canvas.height = video.videoHeight * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    const thumbUrl = URL.createObjectURL(blob);
                    resolve(thumbUrl);
                }, 'image/webp', 0.6); // WebP is faster/smaller
            } catch (e) {
                reject(e);
            }
        };

        video.onerror = () => {
            reject(new Error('Video load error'));
        }
    });
};

export const generateImageThumbnail = async (file) => {
    if (!file.path) return null;

    const sourceUrl = await getMediaUrl(file);
    if (!sourceUrl) return null;

    // For GIFs, just return the blob URL directly to keep animation
    if (file.name.toLowerCase().endsWith('.gif')) {
        return sourceUrl;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 320;
            const MAX_HEIGHT = 240;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((thumbBlob) => {
                resolve(URL.createObjectURL(thumbBlob));
            }, 'image/webp', 0.7);
        };
        img.onerror = () => {
            resolve(sourceUrl); // Use full res blob URL as fallback
        };
        img.src = sourceUrl;
    });
};

export const getThumbnailUrl = async (file) => {
    if (!file?.handle) return null;

    const cacheKey = file.id || file.path;

    // Check cache first
    if (thumbnailCache.has(cacheKey)) {
        return thumbnailCache.get(cacheKey);
    }

    try {
        let url;
        if (file.type === 'video') {
            url = await generateVideoThumbnail(file);
        } else {
            url = await generateImageThumbnail(file);
        }

        // Manage cache size
        if (thumbnailCache.size >= MAX_CACHE_SIZE) {
            const firstKey = thumbnailCache.keys().next().value;
            const oldUrl = thumbnailCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            thumbnailCache.delete(firstKey);
        }

        thumbnailCache.set(cacheKey, url);
        return url;
    } catch (err) {
        console.warn('Thumbnail load error:', err);
        return null;
    }
};

export const clearThumbnailCache = () => {
    thumbnailCache.forEach(url => URL.revokeObjectURL(url));
    thumbnailCache.clear();
};

export const getCachedUrl = (file) => {
    const cacheKey = file?.id || file?.path;
    return thumbnailCache.get(cacheKey) || null;
};
