import { get, set } from 'idb-keyval';

const FOLDER_HANDLE_KEY = 'mdmgr_last_folder_handle';

export const saveFolderHandle = async (handle) => {
    if (!handle) return;
    try {
        await set(FOLDER_HANDLE_KEY, handle);
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
