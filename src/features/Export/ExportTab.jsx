import React, { useState, useEffect, useCallback } from "react";
import { FileJson, FileCode, CheckCircle, Film, MonitorUp, Radio, Wifi, WifiOff, Send } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { useProjectStore } from "../../stores/projectStore";
import { generateManifest } from "../../utils/editorUtils/manifestBridge";
import { appBridge, useBridgeStore } from "../../lib/appBridge";
import { exportForPro, exportForProWithMedia, getProjectSummary } from "../../lib/projectController";

const ExportTab = () => {
  const { clips } = useClipStore();
  const { settings } = useProjectStore();
  const { status: bridgeStatus } = useBridgeStore();
  const isConnected = bridgeStatus === 'connected';

  const [isExporting, setIsExporting] = useState(false);
  const [lastExportPath, setLastExportPath] = useState(null);
  const [isExportingAME, setIsExportingAME] = useState(false);
  const [ameProgress, setAmeProgress] = useState(0);

  // Bridge send state
  const [isSendingToPro, setIsSendingToPro] = useState(false);
  const [bridgeFeedback, setBridgeFeedback] = useState(null);

  useEffect(() => {
    const cleanup = window.ipcRenderer.onExportProgress((progress) => {
      setAmeProgress(progress);
    });
    return cleanup;
  }, []);

  // ─── Adobe Media Encoder export ─────────────────────────────────
  const handleExportAME = async () => {
    if (clips.length === 0) { alert("Timeline is empty!"); return; }
    try {
      setIsExportingAME(true);
      setAmeProgress(0);
      const safeProjectName = settings.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "mmmedia_project";
      const { canceled, filePath } = await window.ipcRenderer.showExportDialog({
        defaultPath: `${safeProjectName}_AME_Export.mp4`,
        filters: [{ name: "High Quality MP4", extensions: ["mp4"] }]
      });
      if (canceled || !filePath) { setIsExportingAME(false); return; }

      const result = await window.ipcRenderer.exportProject({
        filePath, clips, settings, isIntermediate: true
      });
      if (result.success) {
        setLastExportPath(filePath);
        const ameResult = await window.ipcRenderer.openInAME(filePath);
        if (!ameResult.success) {
          alert(`Saved to ${filePath}, but couldn't open Adobe Media Encoder: ${ameResult.error}`);
        }
      } else {
        alert("Export Failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("An unexpected error occurred during export.");
    } finally {
      setIsExportingAME(false);
    }
  };

  // ─── Manifest export ────────────────────────────────────────────
  const handleExportManifest = async () => {
    if (clips.length === 0) { alert("Timeline is empty!"); return; }
    try {
      setIsExporting(true);
      const manifest = generateManifest();
      const safeProjectName = settings.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "mmmedia_project";
      const { canceled, filePath } = await window.ipcRenderer.showExportDialog({
        defaultPath: `${safeProjectName}_manifest.json`,
        filters: [{ name: "MMMedia Manifest", extensions: ["json"] }]
      });
      if (canceled || !filePath) { setIsExporting(false); return; }

      const result = await window.ipcRenderer.saveManifest(JSON.stringify(manifest, null, 2));
      if (result.success) {
        setLastExportPath(filePath);
      } else {
        alert(`Export Failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("An unexpected error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Send to MMMedia Pro via Bridge ─────────────────────────────
  const handleSendToPro = useCallback(() => {
    if (clips.length === 0) {
      setBridgeFeedback({ type: 'warn', message: 'No clips to send — generate a trailer first.' });
      setTimeout(() => setBridgeFeedback(null), 3500);
      return;
    }
    if (!isConnected) {
      // Try to connect first
      appBridge.connect();
      setBridgeFeedback({ type: 'info', message: 'Connecting to MMMedia Pro...' });
      setTimeout(() => setBridgeFeedback(null), 3000);
      return;
    }

    setIsSendingToPro(true);
    try {
      const exportData = exportForProWithMedia();
      const sent = appBridge.sendProject(JSON.stringify(exportData));
      if (sent) {
        setBridgeFeedback({
          type: 'success',
          message: `Sent "${exportData.project.name}" (${exportData.project.clipCount} clips, ${exportData.sourceFiles.length} source files) to MMMedia Pro`
        });
      } else {
        setBridgeFeedback({ type: 'error', message: 'Failed to send — bridge disconnected.' });
      }
    } catch (e) {
      console.error('[ExportTab] Bridge send error:', e);
      setBridgeFeedback({ type: 'error', message: `Send failed: ${e.message}` });
    } finally {
      setIsSendingToPro(false);
      setTimeout(() => setBridgeFeedback(null), 4000);
    }
  }, [clips, isConnected]);

  // ─── Bridge toggle ──────────────────────────────────────────────
  const handleToggleBridge = useCallback(() => {
    appBridge.toggle();
  }, []);

  return (
    <div className="h-full w-full flex flex-col p-8 gap-8 overflow-y-auto bg-[#080816]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Export Project</h1>
        <p className="text-white/50 text-sm mt-1">
          Export your trailer to professional editing software, media encoder, or send directly to MMMedia Pro.
        </p>
      </div>

      <div className="w-full max-w-2xl mx-auto space-y-8">

        {/* ── Card 1: Manifest for Premiere Pro ─────────────────────── */}
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 hover:border-primary/50 transition-colors group shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary/30 flex items-center justify-center text-primary border border-primary/20">
              <FileCode size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Manifest for Premiere Pro</h2>
              <p className="text-white/50">Export the raw timeline data payload for the MMMedia Premiere Pro Extension.</p>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-6 text-sm text-white/60 space-y-3 font-mono border border-white/5">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Manifest Format</span>
              <span className="text-white">Native JSON payload</span>
            </div>
            <div className="flex justify-between">
              <span>Integration</span>
              <span className="text-white">MMMedia Premiere Panel Extension</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleExportManifest}
              disabled={clips.length === 0 || isExporting}
              className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Saving Payload..." : (
                <><FileJson size={20} /> Export Manifest for Premiere</>
              )}
            </button>
          </div>

          {lastExportPath && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg justify-center border border-green-500/20 mt-2">
              <CheckCircle size={14} />
              <span className="truncate max-w-md">Saved to: {lastExportPath}</span>
            </div>
          )}
        </div>

        {/* ── Card 2: Adobe Media Encoder ───────────────────────────── */}
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 hover:border-accent/50 transition-colors group shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent border border-accent/20">
              <MonitorUp size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Adobe Media Encoder</h2>
              <p className="text-white/50">Render a high-quality intermediate and open automatically in Adobe Media Encoder.</p>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-6 text-sm text-white/60 space-y-3 font-mono border border-white/5">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Format</span>
              <span className="text-white">High Quality MP4 (Lossless H.264)</span>
            </div>
            <div className="flex justify-between text-accent/80">
              <span>Integration</span>
              <span>Launches AME with right dimensions</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleExportAME}
              disabled={clips.length === 0 || isExporting || isExportingAME}
              className="w-full h-14 bg-accent text-white hover:bg-accent/80 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingAME ? (
                <div className="flex items-center gap-3 w-full px-6">
                  <span className="flex-1 text-left">Rendering High-Quality Master...</span>
                  <span className="text-white/80">{ameProgress}%</span>
                  <div className="w-1/3 bg-black/30 h-2 rounded-full overflow-hidden">
                    <div className="bg-white h-full transition-all duration-300" style={{ width: `${ameProgress}%` }} />
                  </div>
                </div>
              ) : (
                <><Film size={20} /> Export via Adobe Media Encoder</>
              )}
            </button>
          </div>
        </div>

        {/* ── Card 3: Send to MMMedia Pro via Bridge ────────────────── */}
        <div className={`bg-[#1A1A2E] border rounded-2xl p-8 flex flex-col gap-6 transition-colors group shadow-2xl ${
          isConnected ? 'border-emerald-500/30 hover:border-emerald-400/50' : 'border-white/10 hover:border-orange-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            }`}>
              <Radio size={32} className={isConnected ? 'animate-pulse' : ''} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">Send to MMMedia Pro</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : bridgeStatus === 'connecting'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse'
                      : 'bg-white/5 text-white/30 border border-white/10'
                }`}>
                  {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {bridgeStatus === 'connecting' ? 'Connecting' : isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <p className="text-white/50">
                Send the trailer project directly to MMMedia Pro for advanced editing via the live bridge.
              </p>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-6 text-sm text-white/60 space-y-3 font-mono border border-white/5">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Transfer Method</span>
              <span className="text-white">WebSocket Bridge (port 19797)</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Data Format</span>
              <span className="text-white">Edit + Source Media Paths v2.0</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Clips in Timeline</span>
              <span className={clips.length > 0 ? 'text-white' : 'text-white/30'}>{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex justify-between">
              <span>Source Files</span>
              <span className={clips.length > 0 ? 'text-emerald-400' : 'text-white/30'}>
                {new Set(clips.map(c => c.path).filter(Boolean)).size} unique file{new Set(clips.map(c => c.path).filter(Boolean)).size !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Main send button */}
            <button
              onClick={handleSendToPro}
              disabled={clips.length === 0 || isSendingToPro}
              className={`w-full h-14 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isConnected
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-emerald-500/20'
                  : 'bg-orange-500/80 text-white hover:bg-orange-400 hover:shadow-orange-500/20'
              }`}
            >
              {isSendingToPro ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending to Pro...</span>
                </div>
              ) : isConnected ? (
                <><Send size={20} /> Send Trailer to MMMedia Pro</>
              ) : (
                <><Radio size={20} /> Connect & Send to MMMedia Pro</>
              )}
            </button>

            {/* Secondary toggle connection button */}
            <button
              onClick={handleToggleBridge}
              className={`w-full h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all border ${
                isConnected
                  ? 'bg-transparent border-emerald-500/20 text-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-400'
                  : 'bg-transparent border-white/10 text-white/30 hover:bg-white/5 hover:text-white/50'
              }`}
            >
              {isConnected ? (
                <><Wifi size={12} /> Disconnect from Pro</>
              ) : bridgeStatus === 'connecting' ? (
                <><div className="w-3 h-3 border border-amber-400/50 border-t-amber-400 rounded-full animate-spin" /> Connecting...</>
              ) : (
                <><WifiOff size={12} /> Connect to MMMedia Pro</>
              )}
            </button>
          </div>

          {/* Bridge feedback toast */}
          {bridgeFeedback && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg justify-center border mt-2 animate-pulse ${
              bridgeFeedback.type === 'success' ? 'text-green-400 bg-green-900/20 border-green-500/20'
              : bridgeFeedback.type === 'error' ? 'text-red-400 bg-red-900/20 border-red-500/20'
              : bridgeFeedback.type === 'warn' ? 'text-amber-400 bg-amber-900/20 border-amber-500/20'
              : 'text-blue-400 bg-blue-900/20 border-blue-500/20'
            }`}>
              {bridgeFeedback.type === 'success' && <CheckCircle size={14} />}
              {bridgeFeedback.type === 'info' && <Radio size={14} className="animate-pulse" />}
              <span>{bridgeFeedback.message}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export { ExportTab };
