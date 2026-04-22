/**
 * MMMedia Darkroom — App Bridge Client
 * 
 * WebSocket client that connects to MMMedia Pro's bridge server.
 * Enables live inter-app communication for sending clips, media,
 * and project data between Darkroom and Pro.
 */

import { create } from 'zustand';

const BRIDGE_PORT = 19797;
const BRIDGE_URL = `ws://127.0.0.1:${BRIDGE_PORT}`;
const RECONNECT_DELAY_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 20;

/**
 * Zustand store for bridge state — reactive UI updates.
 */
export const useBridgeStore = create((set, get) => ({
    status: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
    proAppInfo: null,       // { name, version } from Pro handshake
    lastError: null,
    messageLog: [],         // Recent messages for debugging
    autoConnect: false,

    setStatus: (status) => set({ status }),
    setProAppInfo: (info) => set({ proAppInfo: info }),
    setLastError: (error) => set({ lastError: error }),
    addLogEntry: (entry) => set(state => ({
        messageLog: [...state.messageLog.slice(-49), { ...entry, timestamp: Date.now() }]
    })),
    clearLog: () => set({ messageLog: [] }),
    setAutoConnect: (val) => set({ autoConnect: val }),
}));


/**
 * AppBridge — singleton WebSocket client.
 */
class AppBridge {
    constructor() {
        this.ws = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.reconnectAttempts = 0;
        this.intentionalClose = false;
        this.messageHandlers = new Map();
    }

    /**
     * Connect to Pro's bridge server.
     */
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log('[Bridge] Already connected or connecting');
            return;
        }

        this.intentionalClose = false;
        useBridgeStore.getState().setStatus('connecting');
        useBridgeStore.getState().setLastError(null);

        try {
            this.ws = new WebSocket(BRIDGE_URL);

            this.ws.onopen = () => {
                console.log('[Bridge] ✅ Connected to MMMedia Pro');
                this.reconnectAttempts = 0;
                useBridgeStore.getState().setStatus('connected');
                useBridgeStore.getState().addLogEntry({ type: 'system', message: 'Connected to Pro' });

                // Send handshake
                this._send({
                    type: 'HANDSHAKE',
                    app: 'MMMedia Darkroom',
                    version: '2.0.0',
                    capabilities: ['send-clips', 'send-media', 'receive-clips']
                });

                this._startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this._handleMessage(data);
                } catch (e) {
                    console.error('[Bridge] Failed to parse message:', e);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[Bridge] Connection closed:', event.code, event.reason);
                this._stopHeartbeat();
                useBridgeStore.getState().setStatus('disconnected');
                useBridgeStore.getState().setProAppInfo(null);

                if (!this.intentionalClose && useBridgeStore.getState().autoConnect) {
                    this._scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                // WebSocket errors are typically followed by onclose
                // Only log if not a routine connection failure
                if (this.reconnectAttempts === 0) {
                    useBridgeStore.getState().setLastError('Connection failed — is MMMedia Pro running?');
                }
            };
        } catch (e) {
            console.error('[Bridge] WebSocket creation failed:', e);
            useBridgeStore.getState().setStatus('disconnected');
            useBridgeStore.getState().setLastError(String(e));
        }
    }

    /**
     * Disconnect from Pro.
     */
    disconnect() {
        this.intentionalClose = true;
        this._stopHeartbeat();
        this._cancelReconnect();

        if (this.ws) {
            this.ws.close(1000, 'User disconnect');
            this.ws = null;
        }

        useBridgeStore.getState().setStatus('disconnected');
        useBridgeStore.getState().setProAppInfo(null);
        useBridgeStore.getState().addLogEntry({ type: 'system', message: 'Disconnected from Pro' });
    }

    /**
     * Toggle connection state.
     */
    toggle() {
        const { status } = useBridgeStore.getState();
        if (status === 'connected' || status === 'connecting') {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    /**
     * Check if connected.
     */
    get isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // ─── Send Methods ────────────────────────────────────────────────

    /**
     * Send clips to Pro's timeline.
     * @param {object[]} clips - Array of Darkroom clip objects
     */
    sendClips(clips) {
        if (!this.isConnected) {
            console.warn('[Bridge] Cannot send — not connected');
            return false;
        }

        this._send({
            type: 'SEND_CLIPS',
            source: 'darkroom',
            clips: clips,
            timestamp: new Date().toISOString()
        });

        useBridgeStore.getState().addLogEntry({
            type: 'outgoing',
            message: `Sent ${clips.length} clip(s) to Pro`
        });

        return true;
    }

    /**
     * Send media file references to Pro's Media Manager.
     * @param {object[]} mediaItems - Array of { name, path, type, size, duration }
     */
    sendMedia(mediaItems) {
        if (!this.isConnected) return false;

        this._send({
            type: 'SEND_MEDIA',
            source: 'darkroom',
            files: mediaItems.map(m => ({
                name: m.name || m.filename,
                path: m.path,
                type: m.type || 'video',
                size: m.size,
                duration: m.duration,
                width: m.width,
                height: m.height
            })),
            timestamp: new Date().toISOString()
        });

        useBridgeStore.getState().addLogEntry({
            type: 'outgoing',
            message: `Sent ${mediaItems.length} media file(s) to Pro`
        });

        return true;
    }

    /**
     * Send the full project to Pro.
     * @param {string} mmmContent - Serialized .mmm JSON string
     */
    sendProject(mmmContent) {
        if (!this.isConnected) return false;

        this._send({
            type: 'SEND_PROJECT',
            source: 'darkroom',
            content: mmmContent,
            timestamp: new Date().toISOString()
        });

        useBridgeStore.getState().addLogEntry({
            type: 'outgoing',
            message: 'Sent full project to Pro'
        });

        return true;
    }

    /**
     * Send a folder's media files to Pro's Media Manager.
     * This triggers a "folder upload" on Pro's side — files appear
     * in the Media Upload page as if they were imported locally.
     * @param {string} folderPath - Absolute path to the folder
     * @param {object[]} files - Array of { name, path, type, size, duration, width, height }
     */
    sendFolder(folderPath, files) {
        if (!this.isConnected) {
            console.warn('[Bridge] Cannot send folder — not connected');
            return false;
        }

        this._send({
            type: 'SEND_FOLDER',
            source: 'darkroom',
            folderPath: folderPath,
            files: files.map(f => ({
                name: f.name || f.filename,
                path: f.path,
                type: f.type || 'video',
                size: f.size,
                duration: f.duration,
                width: f.width,
                height: f.height
            })),
            timestamp: new Date().toISOString()
        });

        useBridgeStore.getState().addLogEntry({
            type: 'outgoing',
            message: `Sent folder "${folderPath}" (${files.length} files) to Pro`
        });

        return true;
    }

    // ─── Message Handlers ────────────────────────────────────────────

    /**
     * Register a handler for incoming messages of a specific type.
     */
    onMessage(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
        return () => {
            const handlers = this.messageHandlers.get(type);
            if (handlers) {
                const idx = handlers.indexOf(handler);
                if (idx >= 0) handlers.splice(idx, 1);
            }
        };
    }

    // ─── Internal ────────────────────────────────────────────────────

    _send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    _handleMessage(data) {
        const { type } = data;

        switch (type) {
            case 'HANDSHAKE_ACK':
                useBridgeStore.getState().setProAppInfo({
                    name: data.app || 'MMMedia Pro',
                    version: data.version || 'unknown'
                });
                useBridgeStore.getState().addLogEntry({
                    type: 'incoming',
                    message: `Pro handshake: ${data.app} v${data.version}`
                });
                break;

            case 'PONG':
                // Heartbeat response — connection is alive
                break;

            default:
                // Dispatch to registered handlers
                const handlers = this.messageHandlers.get(type);
                if (handlers) {
                    handlers.forEach(h => {
                        try { h(data); } catch (e) {
                            console.error(`[Bridge] Handler error for ${type}:`, e);
                        }
                    });
                }

                useBridgeStore.getState().addLogEntry({
                    type: 'incoming',
                    message: `Received: ${type}`
                });
                break;
        }
    }

    _startHeartbeat() {
        this._stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this._send({ type: 'PING' });
            }
        }, HEARTBEAT_INTERVAL_MS);
    }

    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    _scheduleReconnect() {
        this._cancelReconnect();

        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log('[Bridge] Max reconnect attempts reached. Stopping.');
            useBridgeStore.getState().setLastError('Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            if (!this.intentionalClose && useBridgeStore.getState().autoConnect) {
                this.connect();
            }
        }, delay);
    }

    _cancelReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

// Singleton instance
export const appBridge = new AppBridge();
