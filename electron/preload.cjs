const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    toggleFullscreen: () => ipcRenderer.send('window-fullscreen'),
    updateIcon: (dataUrl) => ipcRenderer.send('update-icon', dataUrl),
    isElectron: true,
    send: (channel, data) => {
        let validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    // Explicit log channel
    log: (level, message) => ipcRenderer.send('ipc-log', { level, message }),

    // ─── File Open Handling ─────────────────────────────────────────
    // Listen for files opened via Windows "Open with" context menu
    onFileOpened: (callback) => {
        const listener = (_event, filePath) => callback(filePath);
        ipcRenderer.on('open-file', listener);
        return () => ipcRenderer.removeListener('open-file', listener);
    },
    // Get any file that was passed on initial launch
    getOpenedFile: () => ipcRenderer.invoke('get-opened-file'),
    // Read an external file by absolute path (returns { name, path, size, mimeType, buffer })
    readExternalFile: (filePath) => ipcRenderer.invoke('read-external-file', filePath)
});

contextBridge.exposeInMainWorld('ipcRenderer', {
    showExportDialog: (options) => ipcRenderer.invoke('show-export-dialog', options),
    exportProject: (args) => ipcRenderer.invoke('export-project', args),
    saveManifest: (content) => ipcRenderer.invoke('save-manifest', content),
    openInAME: (filePath) => ipcRenderer.invoke('open-in-ame', filePath),
    onExportProgress: (callback) => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on('export-progress', listener);
        return () => ipcRenderer.removeListener('export-progress', listener);
    }
});
