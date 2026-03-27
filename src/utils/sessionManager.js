// Utility for managing .mmmm session files

export const saveSession = async (store) => {
    try {
        const state = store.getState();

        // Prepare serializable data
        const sessionData = {
            version: 1,
            timestamp: new Date().toISOString(),
            app: "Mmmedia Darkroom",
            config: {
                currentFolder: state.currentFolder,
                fileTypeFilter: state.fileTypeFilter,
                thumbnailSize: state.thumbnailSize,
                thumbnailOrientation: state.thumbnailOrientation,
                sortBy: state.sortBy,
                sortOrder: state.sortOrder,
                viewMode: state.viewMode,
                gridColumns: state.gridColumns,
                gridRows: state.gridRows,
                darkMode: true, // Assuming always dark for now
                activeFolders: state.activeFolders
            }
        };

        // File System Access API - Save File
        const handle = await window.showSaveFilePicker({
            suggestedName: 'Library_Session.mmmm',
            types: [{
                description: 'MMM Project File',
                accept: { 'application/json': ['.mmmm'] },
            }],
        });

        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(sessionData, null, 2));
        await writable.close();

        return { success: true, message: 'Session saved successfully.' };
    } catch (err) {
        if (err.name === 'AbortError') return { success: false, message: 'Save cancelled.' };
        console.error('Save Session Error:', err);
        return { success: false, message: 'Failed to save session.' };
    }
};

export const loadSession = async (store) => {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'MMM Project File',
                accept: { 'application/json': ['.mmmm'] },
            }],
            multiple: false
        });

        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.app !== "Mmmedia Darkroom") {
            return { success: false, message: 'Invalid session file.' };
        }

        // Apply config
        const { config } = data;
        const {
            setFileTypeFilter, setThumbnailSize, setThumbnailOrientation,
            setSortBy, setSortOrder, setViewMode, setGridLayout,
            setCurrentFolder // This just sets the string path
        } = store.getState();

        // Restore UI preferences
        if (config.fileTypeFilter) setFileTypeFilter(config.fileTypeFilter);
        if (config.thumbnailSize) setThumbnailSize(config.thumbnailSize);
        if (config.thumbnailOrientation) setThumbnailOrientation(config.thumbnailOrientation);
        if (config.sortBy) setSortBy(config.sortBy);
        if (config.sortOrder) setSortOrder(config.sortOrder);
        if (config.viewMode) setViewMode(config.viewMode);
        if (config.gridColumns) setGridLayout(config.gridColumns, config.gridRows || 1);

        return {
            success: true,
            message: 'Session loaded. Please select the root folder to restore access.',
            data: config
        };
    } catch (err) {
        if (err.name === 'AbortError') return { success: false, message: 'Load cancelled.' };
        console.error('Load Session Error:', err);
        return { success: false, message: 'Failed to load session.' };
    }
};
