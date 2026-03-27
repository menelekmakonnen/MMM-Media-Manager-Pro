const { app, BrowserWindow, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// CJS compatible inherently

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
    // const savedState = loadState(); // TEMPORARY: Ignore saved state to fix "stuck" fullscreen issues
    const savedState = null;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: dw, height: dh } = primaryDisplay.workAreaSize;

    const isDev = !app.isPackaged;
    const iconPath = isDev
        ? path.join(__dirname, '../public/icon.png')
        : path.join(__dirname, '../dist/icon.png');

    mainWindow = new BrowserWindow({
        width: 1280, // Default safe size
        height: 800,
        x: undefined, // Let OS decide
        y: undefined,
        minWidth: 1000,
        minHeight: 700,
        show: false,
        backgroundColor: '#0a0a0a',
        // titleBarStyle: 'hidden', // This was causing ghost controls on Windows
        // titleBarOverlay removed to handle controls manually via React
        autoHideMenuBar: true,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            devTools: isDev
        },
        fullscreen: false, // FORCE Windowed mode on start
        frame: false, // Frameless for custom controls
    });

    // savedState logic removed for now to force reset

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    require('./exportPipeline.cjs')(mainWindow);

    // Window control events
    ipcMain.on('window-minimize', () => mainWindow?.minimize());

    ipcMain.on('update-icon', (event, dataUrl) => {
        if (mainWindow && dataUrl) {
            const image = nativeImage.createFromDataURL(dataUrl);
            mainWindow.setIcon(image);
        }
    });

    ipcMain.on('window-maximize', () => {
        if (!mainWindow) return;
        if (mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        } else if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('window-close', () => mainWindow?.close());

    ipcMain.on('window-fullscreen', () => {
        if (mainWindow) {
            // True Kiosk Toggle
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
