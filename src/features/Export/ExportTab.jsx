import React, { useState, useEffect } from "react";
import { FileJson, FileCode, CheckCircle, Film, MonitorUp } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { useProjectStore } from "../../stores/projectStore";
import { generateManifest } from "../../utils/editorUtils/manifestBridge";
const ExportTab = () => {
  const { clips } = useClipStore();
  const { settings } = useProjectStore();
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportPath, setLastExportPath] = useState(null);
  const [isExportingAME, setIsExportingAME] = useState(false);
  const [ameProgress, setAmeProgress] = useState(0);
  useEffect(() => {
    const cleanup = window.ipcRenderer.onExportProgress((progress) => {
      setAmeProgress(progress);
    });
    return cleanup;
  }, []);
  const handleExportAME = async () => {
    if (clips.length === 0) {
      alert("Timeline is empty!");
      return;
    }
    try {
      setIsExportingAME(true);
      setAmeProgress(0);
      const safeProjectName = settings.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "mmmedia_project";
      const { canceled, filePath } = await window.ipcRenderer.showExportDialog({
        defaultPath: `${safeProjectName}_AME_Export.mp4`,
        filters: [{ name: "High Quality MP4", extensions: ["mp4"] }]
      });
      if (canceled || !filePath) {
        setIsExportingAME(false);
        return;
      }
      const result = await window.ipcRenderer.exportProject({
        filePath,
        clips,
        settings,
        isIntermediate: true
      });
      if (result.success) {
        setLastExportPath(filePath);
        const ameResult = await window.ipcRenderer.openInAME(filePath);
        if (!ameResult.success) {
          alert(`Saved to ${filePath}, but couldn't open Adobe Media Encoder: ${ameResult.error}`);
        }
      } else {
        alert(`Export Failed`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("An unexpected error occurred during export.");
    } finally {
      setIsExportingAME(false);
    }
  };
  const handleExportManifest = async () => {
    if (clips.length === 0) {
      alert("Timeline is empty!");
      return;
    }
    try {
      setIsExporting(true);
      const manifest = generateManifest();
      const safeProjectName = settings.name?.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "mmmedia_project";
      const { canceled, filePath } = await window.ipcRenderer.showExportDialog({
        defaultPath: `${safeProjectName}_manifest.json`,
        filters: [{ name: "MMMedia Manifest", extensions: ["json"] }]
      });
      if (canceled || !filePath) {
        setIsExporting(false);
        return;
      }
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
  return /* @__PURE__ */ React.createElement("div", { className: "h-full w-full flex flex-col p-8 gap-8 overflow-y-auto bg-[#080816]" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold tracking-tight text-white" }, "Export Project"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-sm mt-1" }, "Export your timeline to professional editing software or social media.")), /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-2xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#1A1A2E] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 hover:border-primary/50 transition-colors group shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "h-16 w-16 rounded-2xl bg-secondary/30 flex items-center justify-center text-primary border border-primary/20" }, /* @__PURE__ */ React.createElement(FileCode, { size: 32 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-white" }, "Manifest for Premiere Pro"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50" }, "Export the raw timeline data payload for the MMMedia Premiere Pro Extension."))), /* @__PURE__ */ React.createElement("div", { className: "bg-black/40 rounded-xl p-6 text-sm text-white/60 space-y-3 font-mono border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-b border-white/5 pb-2" }, /* @__PURE__ */ React.createElement("span", null, "Manifest Format"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, "Native JSON payload")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Integration"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, "MMMedia Premiere Panel Extension"))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExportManifest,
      disabled: clips.length === 0 || isExporting,
      className: "w-full h-14 bg-white text-black hover:bg-white/90 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isExporting ? "Saving Payload..." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(FileJson, { size: 20 }), "Export Manifest for Premiere")
  )), lastExportPath && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-green-400 text-sm bg-green-900/20 p-3 rounded-lg justify-center border border-green-500/20 mt-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 14 }), /* @__PURE__ */ React.createElement("span", { className: "truncate max-w-md" }, "Saved to: ", lastExportPath))), /* @__PURE__ */ React.createElement("div", { className: "bg-[#1A1A2E] border border-white/10 rounded-2xl p-8 flex flex-col gap-6 hover:border-accent/50 transition-colors group shadow-2xl mt-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent border border-accent/20" }, /* @__PURE__ */ React.createElement(MonitorUp, { size: 32 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-white" }, "Adobe Media Encoder"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50" }, "Render a high-quality intermediate and open automatically in Adobe Media Encoder."))), /* @__PURE__ */ React.createElement("div", { className: "bg-black/40 rounded-xl p-6 text-sm text-white/60 space-y-3 font-mono border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-b border-white/5 pb-2" }, /* @__PURE__ */ React.createElement("span", null, "Format"), /* @__PURE__ */ React.createElement("span", { className: "text-white" }, "High Quality MP4 (Lossless H.264)")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-accent/80" }, /* @__PURE__ */ React.createElement("span", null, "Integration"), /* @__PURE__ */ React.createElement("span", null, "Launches AME with right dimensions"))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExportAME,
      disabled: clips.length === 0 || isExporting || isExportingAME,
      className: "w-full h-14 bg-accent text-white hover:bg-accent/80 font-bold rounded-xl flex items-center justify-center gap-3 transition-all text-lg shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isExportingAME ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 w-full px-6" }, /* @__PURE__ */ React.createElement("span", { className: "flex-1 text-left" }, "Rendering High-Quality Master..."), /* @__PURE__ */ React.createElement("span", { className: "text-white/80" }, ameProgress, "%"), /* @__PURE__ */ React.createElement("div", { className: "w-1/3 bg-black/30 h-2 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-white h-full transition-all duration-300",
        style: { width: `${ameProgress}%` }
      }
    ))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Film, { size: 20 }), "Export via Adobe Media Encoder")
  )))));
};
export {
  ExportTab
};
