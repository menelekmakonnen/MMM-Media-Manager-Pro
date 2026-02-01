/**
 * Opens a directory picker and returns the handle.
 */
export const openDirectory = async () => {
    try {
        const handle = await window.showDirectoryPicker({
            mode: 'read'
        });
        return handle;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error selecting directory:', err);
        }
        return null;
    }
};

/**
 * Generator function that recursively scans a directory handle for media files.
 * Yields batches of files or individual files.
 * @param {FileSystemDirectoryHandle} dirHandle 
 * @param {string} path - current path relative to root
 */
export async function* scanDirectoryGenerator(dirHandle, path = '') {
    console.log(`Scanning directory: ${path || 'root'}`, dirHandle);
    const MAX_DEPTH = 10; // Increased from 3

    // Safety check for depth
    const depth = path.split('/').length - 1;
    if (depth > MAX_DEPTH) {
        console.warn(`Max depth reached at ${path}`);
        return;
    }

    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (isMediaFile(entry.name)) {
                    // Yield individual file object
                    yield {
                        id: Math.random().toString(36).substr(2, 9),
                        name: entry.name,
                        kind: 'file',
                        handle: entry,
                        path: `${path}/${entry.name}`,
                        parentPath: path,
                        type: getFileType(entry.name)
                    };
                }
            } else if (entry.kind === 'directory') {
                // Recursive call
                if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '$RECYCLE.BIN' && entry.name !== 'System Volume Information') {
                    // Yield from recursive generator
                    yield* scanDirectoryGenerator(entry, `${path}/${entry.name}`);
                }
            }
        }
    } catch (error) {
        console.error('Error scanning directory:', error);
    }
}

const isMediaFile = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'mkv', 'avi'];
    return mediaExts.includes(ext);
};

const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    return 'unknown';
};
