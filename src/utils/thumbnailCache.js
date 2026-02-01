// Thumbnail cache to avoid reloading same files
const thumbnailCache = new Map();
const MAX_CACHE_SIZE = 500; // Reduced from 1000 to prevent memory bloat

export const generateVideoThumbnail = async (file) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        // Load the file
        file.handle.getFile().then(blob => {
            const url = URL.createObjectURL(blob);
            video.src = url;

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
                        URL.revokeObjectURL(url); // Clean up full video blob
                        resolve(thumbUrl);
                    }, 'image/webp', 0.6); // WebP is faster/smaller
                } catch (e) {
                    URL.revokeObjectURL(url);
                    reject(e);
                }
            };

            video.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Video load error'));
            }
        }).catch(reject);
    });
};

export const generateImageThumbnail = async (file) => {
    const blob = await file.handle.getFile();

    // For GIFs, we still just use the blob to keep the animation if possible, 
    // but for very large images we should downscale
    if (file.name.toLowerCase().endsWith('.gif')) {
        return URL.createObjectURL(blob);
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
                URL.revokeObjectURL(img.src); // Cleanup the original large blob
            }, 'image/webp', 0.7);
        };
        img.onerror = () => {
            const fallbackUrl = URL.createObjectURL(blob);
            resolve(fallbackUrl);
        };
        img.src = URL.createObjectURL(blob);
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

