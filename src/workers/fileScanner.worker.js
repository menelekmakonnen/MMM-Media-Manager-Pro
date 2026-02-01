// Helper to check for media files
const isMediaFile = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'];
    return mediaExts.includes(ext);
};

const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoExts = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    return 'unknown';
};

let batch = [];
const BATCH_SIZE = 200; // Increased from 50 to 200 for better performance
let folderTree = {};
let folderSendDebounce = null;
let shouldCancel = false;

const flushBatch = () => {
    if (batch.length > 0) {
        self.postMessage({
            type: 'FILES_FOUND',
            payload: batch
        });
        batch = [];
    }
};

const addToBatch = (fileData) => {
    batch.push(fileData);
    if (batch.length >= BATCH_SIZE) {
        flushBatch();
    }
};

// Helper for natural sort keys (pad numbers with zeros)
const getSortKey = (name) => {
    return name.toLowerCase().replace(/\d+/g, (m) => m.padStart(12, '0'));
};

// Send folders incrementally (debounced to avoid flooding)
let lastFolderSendTime = 0;
const sendFoldersUpdate = (force = false) => {
    const now = Date.now();
    if (folderSendDebounce) clearTimeout(folderSendDebounce);

    // If forced or enough time passed (2.5s during scan), send
    const interval = 2500;
    if (force || (now - lastFolderSendTime > interval)) {
        lastFolderSendTime = now;
        self.postMessage({
            type: 'FOLDERS_FOUND',
            payload: Object.values(folderTree || {})
        });
        return;
    }

    folderSendDebounce = setTimeout(() => {
        lastFolderSendTime = Date.now();
        self.postMessage({
            type: 'FOLDERS_FOUND',
            payload: Object.values(folderTree || {})
        });
    }, 1000); // 1s debounce
};

const registerFolder = (path, name) => {
    if (!folderTree[path]) {
        folderTree[path] = {
            name,
            path,
            sortKey: getSortKey(name),
            fileCount: 0,
            hasGifs: false,
            hasVideos: false,
            hasImages: false,
            lastModified: 0,
            createdAt: Date.now()
        };
        sendFoldersUpdate();
    }
};

const updateFolderStats = (path, type, extension, lastModified, fileObject) => {
    // Optimization: Cache path parts or use pre-split parts
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
        currentPath += '/' + parts[i];
        const folder = folderTree[currentPath];
        if (folder) {
            folder.fileCount++;
            if (type === 'video') folder.hasVideos = true;
            if (type === 'image') folder.hasImages = true;
            if (extension === 'gif') folder.hasGifs = true;

            if (!folder.coverFile) {
                folder.coverFile = fileObject;
            }

            if (!folder.lastModified || lastModified > folder.lastModified) {
                folder.lastModified = lastModified;
            }
            if (!folder.createdAt || (lastModified > 0 && lastModified < folder.createdAt)) {
                folder.createdAt = lastModified;
            }
        }
    }

    sendFoldersUpdate();
};

// Recursive scanner function
async function scanDirectory(dirHandle, path = '', rootName = '') {
    if (shouldCancel) return; // Check for cancellation

    const MAX_DEPTH = 30;
    const depth = path.split('/').filter(Boolean).length;

    if (depth > MAX_DEPTH) return;

    const currentPath = path || `/${dirHandle.name}`;
    registerFolder(currentPath, path ? dirHandle.name : rootName || dirHandle.name);

    let itemCounter = 0;
    try {
        for await (const entry of dirHandle.values()) {
            if (shouldCancel) return; // Check before processing each entry

            // Yield event loop every 50 items to allow message processing (Cancellation)
            itemCounter++;
            if (itemCounter % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
                if (shouldCancel) return;
            }

            if (entry.kind === 'file') {
                if (isMediaFile(entry.name)) {
                    try {
                        // Get file metadata with timeout protection
                        let size = 0;
                        let lastModified = Date.now();

                        const filePromise = entry.getFile();
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), 3000)
                        );

                        try {
                            const file = await Promise.race([filePromise, timeoutPromise]);
                            size = file.size;
                            lastModified = file.lastModified;
                        } catch (err) {
                            // Skip metadata on timeout/error, continue with file
                            console.warn(`Metadata skip: ${entry.name}`, err);
                        }

                        const type = getFileType(entry.name);
                        const ext = entry.name.split('.').pop().toLowerCase();

                        const fileObj = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: entry.name,
                            sortKey: getSortKey(entry.name),
                            kind: 'file',
                            handle: entry,
                            path: `${currentPath}/${entry.name}`,
                            folderPath: currentPath,
                            type,
                            size,
                            lastModified
                        };
                        addToBatch(fileObj);
                        updateFolderStats(currentPath, type, ext, lastModified, fileObj);
                    } catch (fileError) {
                        // Skip individual file errors, continue scanning
                        console.warn(`Skipping file ${entry.name}:`, fileError.message);
                    }
                }
            } else if (entry.kind === 'directory') {
                const skipDirs = ['.', 'node_modules', '$RECYCLE.BIN', 'System Volume Information', '.git', '__pycache__', '.cache'];
                if (!skipDirs.some(skip => entry.name.startsWith(skip))) {
                    await scanDirectory(entry, `${currentPath}/${entry.name}`, rootName);
                }
            }
        }
    } catch (error) {
        // Continue on folder errors
        if (error.name === 'NotAllowedError' || error.message.includes('system files')) {
            console.warn(`Skipping restricted folder: ${currentPath}`);
        } else {
            console.error('Worker scan error:', error);
        }
    }
}

self.onmessage = async (e) => {
    if (e.data.type === 'START_SCAN') {
        const { dirHandle } = e.data;
        batch = [];
        folderTree = {};
        shouldCancel = false;

        try {
            await scanDirectory(dirHandle, '', dirHandle.name);
            flushBatch();

            // Final folder tree send (includes all stats)
            self.postMessage({
                type: 'FOLDERS_FOUND',
                payload: Object.values(folderTree || {})
            });

            self.postMessage({ type: 'SCAN_COMPLETE' });
        } catch (err) {
            console.error(err);
            // Smart error messaging
            let errorMsg = err.message;
            if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
                errorMsg = "Access denied. Browser restricted system folder (like Downloads/Windows). Try a different folder.";
            } else if (err.name === 'NotFoundError') {
                errorMsg = "Folder not found or moved.";
            }

            self.postMessage({ type: 'SCAN_ERROR', payload: errorMsg });
        }
    } else if (e.data.type === 'CANCEL_SCAN') {
        shouldCancel = true;
        flushBatch(); // Save what we have so far
        self.postMessage({ type: 'SCAN_CANCELLED' });
    }
};
