/* global process */
import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance Optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('video-threads', '8');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');

let mainWindow;
const stateFilePath = path.join(app.getPath('userData'), 'window-state.json');

function saveState() {
    if (!mainWindow) return;
    try {
        const bounds = mainWindow.getBounds();
        const state = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: mainWindow.isMaximized()
        };
        fs.writeFileSync(stateFilePath, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save window state', e);
    }
}

function loadState() {
    try {
        if (fs.existsSync(stateFilePath)) {
            return JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load window state', e);
    }
    return null;
}

function createWindow() {
    const savedState = loadState();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: dw, height: dh } = primaryDisplay.workAreaSize;

    const isDev = !app.isPackaged;
    const iconPath = isDev
        ? path.join(__dirname, '../public/icon.png')
        : path.join(__dirname, '../dist/icon.png');

    mainWindow = new BrowserWindow({
        width: savedState?.width || Math.min(1280, dw),
        height: savedState?.height || Math.min(800, dh),
        x: savedState?.x,
        y: savedState?.y,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        backgroundColor: '#0a0a0a',
        titleBarStyle: 'hidden', // Performance and aesthetics
        autoHideMenuBar: true,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: isDev
        }
    });

    if (savedState?.isMaximized) {
        mainWindow.maximize();
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Window control events
    ipcMain.on('window-minimize', () => mainWindow?.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow?.maximize();
        }
    });
    ipcMain.on('window-close', () => mainWindow?.close());
    ipcMain.on('window-fullscreen', () => {
        if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });

    // Pipe renderer logs to terminal
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        console.log(`[Renderer][${levels[level]}] ${message} (${sourceId}:${line})`);
    });

    // Custom Log Handler
    ipcMain.on('ipc-log', (event, { level, message }) => {
        const prefix = `[Renderer][${level.toUpperCase()}]`;
        console.log(`${prefix} ${message}`);
    });

    if (isDev) {
        // Clear cache to fix persistent 504 errors
        mainWindow.webContents.session.clearCache();
        mainWindow.webContents.session.clearStorageData();

        // Sync with Vite port in vite.config.js
        mainWindow.loadURL('http://localhost:9797').catch(() => {
            console.warn('Vite server not found, falling back to local file if available');
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        });
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('close', saveState);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Set App ID for Windows taskbar consistency
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.mdmgr.app');
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
