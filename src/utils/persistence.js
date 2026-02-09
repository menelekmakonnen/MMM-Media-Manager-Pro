import { get, set } from 'idb-keyval';

const FOLDER_HANDLE_KEY = 'mdmgr_last_folder_handle';
const RECENT_HANDLES_KEY = 'mdmgr_recent_library_handles';

export const saveFolderHandle = async (handle) => {
    if (!handle) return;
    try {
        await set(FOLDER_HANDLE_KEY, handle);
        await addRecentLibrary(handle); // Auto-save to recents
    } catch (e) {
        console.error('Failed to save folder handle:', e);
    }
};

export const getSavedFolderHandle = async () => {
    try {
        return await get(FOLDER_HANDLE_KEY);
    } catch (e) {
        console.error('Failed to get saved folder handle:', e);
        return null;
    }
};

export const addRecentLibrary = async (handle) => {
    try {
        const existing = (await get(RECENT_HANDLES_KEY)) || [];
        // Filter out existing by name (imperfect but handle comparison is hard)
        // or just unshift and unique by name
        const others = existing.filter(h => h.name !== handle.name);
        const updated = [handle, ...others].slice(0, 10); // Keep last 10
        await set(RECENT_HANDLES_KEY, updated);
    } catch (e) {
        console.error('Failed to add recent library:', e);
    }
};

export const getRecentLibraries = async () => {
    try {
        return (await get(RECENT_HANDLES_KEY)) || [];
    } catch (e) {
        console.error('Failed to get recent libraries:', e);
        return [];
    }
};

export const verifyPermission = async (fileHandle) => {
    const options = { mode: 'read' };
    try {
        if ((await fileHandle.queryPermission(options)) === 'granted') {
            return true;
        }
        if ((await fileHandle.requestPermission(options)) === 'granted') {
            return true;
        }
    } catch (e) {
        console.error("Permission verification failed", e);
    }
    return false;
};
