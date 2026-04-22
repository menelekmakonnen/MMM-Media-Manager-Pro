# MMMedia Pro — Bridge Integration Guide

This document describes the changes needed in **MMMedia Pro** to complete the
Darkroom ↔ Pro bridge. These changes are applied to the Pro codebase at
`D:\ICUNI Group\ICUNI Labs\MMMedia Pro`.

## 1. Install WebSocket dependency

```bash
cd "D:\ICUNI Group\ICUNI Labs\MMMedia Pro"
npm install ws
```

## 2. Copy Bridge Server Module

Copy the file from Darkroom:
```
FROM: MMMedia Darkroom/electron/bridgeServer.cjs
TO:   MMMedia Pro/electron/bridgeServer.cjs
```

Or copy the file `bridgeServer.cjs` that was created in the Darkroom project.

## 3. Integrate into Pro's `electron/main.ts`

Add the bridge server import and initialization after the window is created:

```typescript
// At the top of main.ts, add:
const setupBridgeServer = require('./bridgeServer.cjs');

// After createWindow() / mainWindow creation, add:
const bridge = setupBridgeServer(mainWindow);

// Optional: clean up on app quit
app.on('before-quit', () => {
    bridge.close();
});
```

## 4. Expose bridge events in Pro's `electron/preload.ts`

Add these methods inside the `contextBridge.exposeInMainWorld` block:

```typescript
// Bridge Events
onBridgeClientConnected: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('bridge-client-connected', listener);
    return () => ipcRenderer.removeListener('bridge-client-connected', listener);
},
onBridgeClientDisconnected: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('bridge-client-disconnected', listener);
    return () => ipcRenderer.removeListener('bridge-client-disconnected', listener);
},
onBridgeReceiveClips: (callback: (clips: any[]) => void) => {
    const listener = (_event: any, clips: any[]) => callback(clips);
    ipcRenderer.on('bridge-receive-clips', listener);
    return () => ipcRenderer.removeListener('bridge-receive-clips', listener);
},
onBridgeReceiveMedia: (callback: (files: any[]) => void) => {
    const listener = (_event: any, files: any[]) => callback(files);
    ipcRenderer.on('bridge-receive-media', listener);
    return () => ipcRenderer.removeListener('bridge-receive-media', listener);
},
onBridgeReceiveProject: (callback: (content: string) => void) => {
    const listener = (_event: any, content: string) => callback(content);
    ipcRenderer.on('bridge-receive-project', listener);
    return () => ipcRenderer.removeListener('bridge-receive-project', listener);
},
```

## 5. Add a Bridge Status component in Pro (optional)

Create a small status indicator in the Pro sidebar/title bar that shows
when Darkroom is connected. Wire it up using the preload events above.

Example usage:
```tsx
useEffect(() => {
    const unsub1 = window.ipcRenderer.onBridgeClientConnected((data) => {
        setDarkroomConnected(true);
        toast(`Darkroom connected (${data.clientCount} clients)`);
    });
    const unsub2 = window.ipcRenderer.onBridgeClientDisconnected((data) => {
        setDarkroomConnected(false);
    });
    const unsub3 = window.ipcRenderer.onBridgeReceiveClips((clips) => {
        // Import received clips into Pro's clip store
        const store = useClipStore.getState();
        clips.forEach(clip => store.addClip(clip));
        toast(`Received ${clips.length} clips from Darkroom`);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
}, []);
```

## File Summary

| File | Action | Description |
|---|---|---|
| `package.json` | MODIFY | Add `ws` dependency |
| `electron/bridgeServer.cjs` | NEW | WebSocket bridge server |
| `electron/main.ts` | MODIFY | Import and start bridge server |
| `electron/preload.ts` | MODIFY | Expose bridge events to renderer |
| `src/components/BridgeStatus.tsx` | NEW (optional) | Connection indicator |
