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

// ─── File Open Handling ─────────────────────────────────────────────
// Track files passed via command line or "Open with" context menu
let pendingFilePath = null;

const SUPPORTED_EXTENSIONS = new Set([
    // Video
    '.mp4', '.mkv', '.avi', '.mov', '.webm', '.wmv', '.flv', '.m4v',
    '.mpg', '.mpeg', '.3gp', '.ts',
    // Image
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif',
    '.svg', '.avif'
]);

function isMediaFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Extract a media file path from process.argv.
 * When Windows opens a file with this app, it passes the file path
 * as the last argument: "MMMedia-Darkroom.exe" "C:\path\to\file.mp4"
 */
function getFileFromArgs(argv) {
    // Skip the first arg (exe path) and any Electron flags
    for (let i = 1; i < argv.length; i++) {
        const arg = argv[i];
        // Skip flags and Electron internal args
        if (arg.startsWith('-') || arg.startsWith('--')) continue;
        // Skip URLs (dev server)
        if (arg.startsWith('http://') || arg.startsWith('https://')) continue;
        // Skip the app path itself in dev mode
        if (arg === '.' || arg.endsWith('.cjs') || arg.endsWith('.js')) continue;
        // Check if it's a media file
        if (isMediaFile(arg) && fs.existsSync(arg)) {
            return path.resolve(arg);
        }
    }
    return null;
}

/**
 * Send the opened file path to the renderer.
 * If the window is not ready yet, store it as pending.
 */
function sendFileToRenderer(filePath) {
    if (!filePath) return;
    if (mainWindow && mainWindow.webContents) {
        // Wait for the page to be ready before sending
        if (mainWindow.webContents.isLoading()) {
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.webContents.send('open-file', filePath);
            });
        } else {
            mainWindow.webContents.send('open-file', filePath);
        }
    } else {
        pendingFilePath = filePath;
    }
}

// ─── Single Instance Lock ───────────────────────────────────────────
// Prevent multiple instances. If user opens another file while app is running,
// focus the existing window and send the new file path to it.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to open a second instance or opened a file
        const filePath = getFileFromArgs(commandLine);
        if (filePath) {
            sendFileToRenderer(filePath);
        }
        // Focus the existing window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ─── Window State ───────────────────────────────────────────────────

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

// ─── Window Creation ────────────────────────────────────────────────

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

        // Send any pending file from initial launch
        if (pendingFilePath) {
            sendFileToRenderer(pendingFilePath);
            pendingFilePath = null;
        }
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

    // ─── IPC: Get opened file path on demand ────────────────────────
    ipcMain.handle('get-opened-file', () => {
        const file = pendingFilePath;
        pendingFilePath = null;
        return file;
    });

    // ─── IPC: Read an external file by path ─────────────────────────
    // Used when a file is opened via Windows "Open with" context menu
    ipcMain.handle('read-external-file', async (event, filePath) => {
        try {
            if (!filePath || !fs.existsSync(filePath)) return null;
            const stat = fs.statSync(filePath);
            const buffer = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase();

            // Determine MIME type
            const mimeMap = {
                '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
                '.mov': 'video/quicktime', '.webm': 'video/webm', '.wmv': 'video/x-ms-wmv',
                '.flv': 'video/x-flv', '.m4v': 'video/mp4', '.mpg': 'video/mpeg',
                '.mpeg': 'video/mpeg', '.3gp': 'video/3gpp', '.ts': 'video/mp2t',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
                '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
                '.tiff': 'image/tiff', '.tif': 'image/tiff', '.svg': 'image/svg+xml',
                '.avif': 'image/avif'
            };

            return {
                name: path.basename(filePath),
                path: filePath,
                folderPath: path.dirname(filePath),
                size: stat.size,
                lastModified: stat.mtimeMs,
                mimeType: mimeMap[ext] || 'application/octet-stream',
                buffer: buffer.buffer // ArrayBuffer
            };
        } catch (err) {
            console.error('[Main] Failed to read external file:', err);
            return null;
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

// ─── App Lifecycle ──────────────────────────────────────────────────

app.whenReady().then(() => {
    // Set App ID for Windows taskbar consistency
    if (process.platform === 'win32') {
        app.setAppUserModelId('com.icunigroup.mmmediadarkroom');
    }

    // Check if a file was passed on initial launch
    pendingFilePath = getFileFromArgs(process.argv);
    if (pendingFilePath) {
        console.log('[Main] Opened with file:', pendingFilePath);
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

// macOS: Handle file open events (drag to dock, Finder "Open with")
app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (isMediaFile(filePath)) {
        sendFileToRenderer(filePath);
    }
});
