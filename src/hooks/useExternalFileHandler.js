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
 * Handle a file path received from the main process.
 * Reads the file via IPC, creates a blob URL, and injects it into the store
 * as a synthetic file entry so the user sees it immediately.
 */
async function handleExternalFile(filePath) {
    if (!filePath || !window.electronAPI?.readExternalFile) return;

    console.log('[ExternalFileHandler] Opening external file:', filePath);

    try {
        const fileData = await window.electronAPI.readExternalFile(filePath);
        if (!fileData) {
            console.error('[ExternalFileHandler] Failed to read file:', filePath);
            return;
        }

        // Create a Blob from the buffer
        const blob = new Blob([fileData.buffer], { type: fileData.mimeType });
        const blobUrl = URL.createObjectURL(blob);

        // Build a synthetic file object matching the app's expected shape
        const type = getFileType(fileData.name);
        const syntheticFile = {
            id: 'ext-' + Math.random().toString(36).substr(2, 9),
            name: fileData.name,
            sortKey: getSortKey(fileData.name),
            kind: 'file',
            handle: null, // No handle for external files
            path: fileData.path,
            folderPath: fileData.folderPath,
            type,
            size: fileData.size,
            lastModified: fileData.lastModified,
            // Stash the blob URL so MediaItem can use it directly
            _externalBlobUrl: blobUrl
        };

        const store = useMediaStore.getState();

        // Create a synthetic folder entry
        const folderEntry = {
            name: fileData.folderPath.split(/[\\/]/).pop() || 'External',
            path: fileData.folderPath,
            sortKey: getSortKey(fileData.folderPath.split(/[\\/]/).pop() || 'external'),
            fileCount: 1,
            hasGifs: type === 'gif',
            hasVideos: type === 'video',
            hasImages: type === 'image',
            lastModified: fileData.lastModified,
            createdAt: Date.now()
        };

        // Clear current state and inject the external file
        store.clearFiles();
        store.setFolders([folderEntry]);
        store.addFiles([syntheticFile]);
        store.setCurrentFolder(fileData.folderPath);
        useMediaStore.setState({ currentFileIndex: 0, appViewMode: 'standard' });
        store.updateProcessedFiles(true);

        console.log('[ExternalFileHandler] File loaded successfully:', fileData.name);
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
