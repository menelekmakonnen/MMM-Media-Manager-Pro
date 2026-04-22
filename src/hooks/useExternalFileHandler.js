import { useEffect, useRef } from 'react';
import useMediaStore from '../stores/useMediaStore';

/**
 * VIDEO_EXTENSIONS & IMAGE_EXTENSIONS used to determine file type
 */
const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', '3gp', 'ts']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'avif']);

function getFileType(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (VIDEO_EXTS.has(ext)) return 'video';
    if (IMAGE_EXTS.has(ext)) return 'image';
    if (ext === 'gif') return 'gif';
    return 'unknown';
}

function getSortKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Build a synthetic file entry from metadata returned by `read-folder-media`.
 * These entries use `_externalPath` for the renderer to create blob URLs on demand.
 */
function buildSyntheticEntry(meta) {
    const type = getFileType(meta.name);
    return {
        id: 'ext-' + Math.random().toString(36).substr(2, 9),
        name: meta.name,
        sortKey: getSortKey(meta.name),
        kind: 'file',
        handle: null,
        path: meta.path,
        folderPath: meta.folderPath,
        type,
        size: meta.size,
        lastModified: meta.lastModified,
        _externalPath: meta.path // Renderer uses this to read via IPC on demand
    };
}

/**
 * Handle a file path received from the main process.
 * Scans the parent folder for all media siblings, injects them into the store,
 * and opens the target file in Slideshow view.
 */
async function handleExternalFile(filePath) {
    if (!filePath || !window.electronAPI) return;

    console.log('[ExternalFileHandler] Opening external file:', filePath);

    try {
        const api = window.electronAPI;

        // Extract folder path from the file path
        const pathParts = filePath.replace(/\\/g, '/').split('/');
        const fileName = pathParts.pop();
        const folderPath = pathParts.join('/').replace(/\//g, '\\');

        // 1. Scan the entire parent folder for sibling media files
        let siblingFiles = [];
        if (api.readFolderMedia) {
            siblingFiles = await api.readFolderMedia(folderPath);
        }

        // Fallback: if folder scan fails or returns nothing, read just the single file
        if (!siblingFiles || siblingFiles.length === 0) {
            const fileData = await api.readExternalFile(filePath);
            if (!fileData) {
                console.error('[ExternalFileHandler] Failed to read file:', filePath);
                return;
            }
            const blob = new Blob([fileData.buffer], { type: fileData.mimeType });
            const blobUrl = URL.createObjectURL(blob);
            const type = getFileType(fileData.name);

            const syntheticFile = {
                id: 'ext-' + Math.random().toString(36).substr(2, 9),
                name: fileData.name,
                sortKey: getSortKey(fileData.name),
                kind: 'file',
                handle: null,
                path: fileData.path,
                folderPath: fileData.folderPath,
                type,
                size: fileData.size,
                lastModified: fileData.lastModified,
                _externalBlobUrl: blobUrl
            };

            const store = useMediaStore.getState();
            store.clearFiles();
            store.setFolders([{
                name: fileData.folderPath.split(/[\\/]/).pop() || 'External',
                path: fileData.folderPath,
                sortKey: getSortKey(fileData.folderPath.split(/[\\/]/).pop() || 'external'),
                fileCount: 1,
                hasGifs: type === 'gif',
                hasVideos: type === 'video',
                hasImages: type === 'image',
                lastModified: fileData.lastModified,
                createdAt: Date.now()
            }]);
            store.addFiles([syntheticFile]);
            store.setCurrentFolder(fileData.folderPath);
            useMediaStore.setState({
                currentFileIndex: 0,
                appViewMode: 'slideshow',
                slideshowActive: true,
                fileTypeFilter: ['all'],
                globalIsPlaying: true
            });
            store.updateProcessedFiles(true);
            console.log('[ExternalFileHandler] Single file loaded, opening in Slideshow.');
            return;
        }

        // 2. Build synthetic entries for all sibling files
        const allFiles = siblingFiles.map(buildSyntheticEntry);

        // 3. Find the index of the target file
        // Normalize path separators for comparison
        const normalizedTarget = filePath.replace(/\//g, '\\');
        let targetIndex = allFiles.findIndex(f => f.path.replace(/\//g, '\\') === normalizedTarget);
        if (targetIndex < 0) targetIndex = 0;

        // 4. Read the target file to create an immediate blob URL (for instant display)
        const targetFile = allFiles[targetIndex];
        if (targetFile && api.readExternalFile) {
            try {
                const fileData = await api.readExternalFile(targetFile.path);
                if (fileData) {
                    const blob = new Blob([fileData.buffer], { type: fileData.mimeType });
                    targetFile._externalBlobUrl = URL.createObjectURL(blob);
                }
            } catch (_) { /* Non-critical: file will load on demand */ }
        }

        // 5. Build folder metadata
        const folderName = folderPath.split(/[\\/]/).pop() || 'External';
        const hasVideos = allFiles.some(f => f.type === 'video');
        const hasImages = allFiles.some(f => f.type === 'image');
        const hasGifs = allFiles.some(f => f.type === 'gif');

        const folderEntry = {
            name: folderName,
            path: folderPath,
            sortKey: getSortKey(folderName),
            fileCount: allFiles.length,
            hasGifs,
            hasVideos,
            hasImages,
            lastModified: Math.max(...allFiles.map(f => f.lastModified || 0)),
            createdAt: Date.now()
        };

        // 6. Inject into store and switch to Slideshow view
        const store = useMediaStore.getState();
        store.clearFiles();
        store.setFolders([folderEntry]);
        store.addFiles(allFiles);
        store.setCurrentFolder(folderPath);
        useMediaStore.setState({
            currentFileIndex: targetIndex,
            appViewMode: 'slideshow',
            slideshowActive: true,
            fileTypeFilter: ['all'], // Show all types so nothing gets filtered
            globalIsPlaying: true,
            gridColumns: 1,
            gridRows: 1
        });
        store.updateProcessedFiles(true);

        console.log(`[ExternalFileHandler] Loaded ${allFiles.length} sibling files, target at index ${targetIndex}. Opening in Slideshow.`);
    } catch (err) {
        console.error('[ExternalFileHandler] Error handling external file:', err);
    }
}

/**
 * React hook: Listens for files opened via Windows "Open with" context menu.
 * Checks for a pending file on mount, and listens for subsequent files.
 */
export function useExternalFileHandler() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const api = window.electronAPI;
        if (!api) return; // Not running in Electron

        // 1. Check if a file was passed on initial launch
        if (api.getOpenedFile) {
            api.getOpenedFile().then((filePath) => {
                if (filePath) handleExternalFile(filePath);
            });
        }

        // 2. Listen for files opened while app is running (second-instance)
        let cleanup;
        if (api.onFileOpened) {
            cleanup = api.onFileOpened((filePath) => {
                handleExternalFile(filePath);
            });
        }

        return () => {
            if (cleanup) cleanup();
        };
    }, []);
}

export default useExternalFileHandler;
