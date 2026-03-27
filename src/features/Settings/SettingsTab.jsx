import React from "react";
import { useProjectStore } from "../../stores/projectStore";
import { Save, Upload, FileJson } from "lucide-react";
import { PowerMeter } from "./PowerMeter";
const SettingsTab = () => {
  const { settings, updateSettings } = useProjectStore();
  return /* @__PURE__ */ React.createElement("div", { className: "flex h-full w-full flex-col gap-8 p-8 overflow-y-auto w-full max-w-5xl mx-auto animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 border-b border-white/10 pb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Project Settings"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-sm mt-1" }, "Configure your workspace and engine parameters."))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 text-white/90" }, "General Configuration"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "projectName", className: "block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider" }, "Project Name"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "projectName",
      type: "text",
      value: settings.name,
      onChange: (e) => updateSettings({ name: e.target.value }),
      className: "w-full bg-[#0a0a15] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider" }, "Aspect Ratio"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2" }, ["9:16", "16:9", "1:1", "4:3", "21:9"].map((ratio) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: ratio,
      onClick: () => useProjectStore.getState().setAspectRatio(ratio),
      className: `px-3 py-3 rounded-lg text-sm font-medium transition-all ${settings.aspectRatio === ratio ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20" : "bg-[#0a0a15] text-white/60 hover:text-white hover:bg-white/10"}`
    },
    ratio
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-white/30 text-right" }, "Output: ", settings.resolution.width, " x ", settings.resolution.height)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider" }, "Frame Rate"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2" }, [24, 30, 60, 120].map((fps) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: fps,
      onClick: () => updateSettings({ fps }),
      className: `px-3 py-3 rounded-lg text-sm font-medium transition-all ${settings.fps === fps ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20" : "bg-[#0a0a15] text-white/60 hover:text-white hover:bg-white/10"}`
    },
    fps
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-white/30 text-right" }, settings.fps === 24 ? "Cinema" : settings.fps === 30 ? "TV/Web" : settings.fps === 60 ? "High Motion" : "Smooth")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider" }, "Background Fill"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => updateSettings({ backgroundFillMode: "blur" }),
      className: `px-4 py-3 rounded-lg text-sm font-medium transition-all ${settings.backgroundFillMode === "blur" ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20" : "bg-[#0a0a15] text-white/60 hover:text-white hover:bg-white/10"}`
    },
    "Blur"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => updateSettings({ backgroundFillMode: "black" }),
      className: `px-4 py-3 rounded-lg text-sm font-medium transition-all ${settings.backgroundFillMode === "black" ? "bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20" : "bg-[#0a0a15] text-white/60 hover:text-white hover:bg-white/10"}`
    },
    "Black"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-white/40" }, "Fill mode for videos that don't match the aspect ratio")))), /* @__PURE__ */ React.createElement("div", { className: "p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold mb-4 text-white/90" }, "Pre-Edit Automations"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider" }, "Target Duration"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/50 mb-3" }, "Set a strict final video length. The Global Flux automation will perfectly fit your clips to this duration."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => updateSettings({
        targetDurationSeconds: settings.targetDurationSeconds === void 0 ? 10 : void 0
      }),
      className: `px-3 py-2 rounded-lg text-sm font-medium transition-all ${settings.targetDurationSeconds === void 0 ? "bg-white/10 text-white shadow-inner ring-1 ring-white/20" : "bg-[#0a0a15] text-white/60 hover:text-white hover:bg-white/5"}`
    },
    "Auto (Off)"
  ), /* @__PURE__ */ React.createElement("div", { className: `flex items-center bg-[#0a0a15] rounded-lg border flex-1 ${settings.targetDurationSeconds !== void 0 ? "border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-primary/20" : "border-white/10 opacity-50 grayscale pointer-events-none"}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => updateSettings({
        targetDurationSeconds: Math.max(1, (settings.targetDurationSeconds || 11) - 1)
      }),
      className: "px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-l-lg transition-colors border-r border-white/10 font-bold"
    },
    "-"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center font-mono font-bold text-lg text-white" }, settings.targetDurationSeconds !== void 0 ? `${settings.targetDurationSeconds}s` : "---"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => updateSettings({
        targetDurationSeconds: (settings.targetDurationSeconds || 9) + 1
      }),
      className: "px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-r-lg transition-colors border-l border-white/10 font-bold"
    },
    "+"
  ))))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" }), /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-white/40 mb-4 tracking-wider uppercase" }, "Project Actions"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        await window.ipcRenderer.loadProject().then((res) => {
          if (res.success && res.content) {
            const data = JSON.parse(res.content);
            console.log("Loaded Project:", data);
            alert("Project Loaded: " + (data.settings?.name || "Untitled"));
          }
        });
      },
      className: "flex flex-col items-center justify-center gap-2 px-4 py-4 bg-black/40 text-white/70 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all group"
    },
    /* @__PURE__ */ React.createElement(Upload, { size: 20, className: "text-white/40 group-hover:text-white transition-colors" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium" }, "Load Project")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        const { settings: settings2 } = useProjectStore.getState();
        const { clips } = await import("../../stores/clipStore").then((m) => m.useClipStore.getState());
        const projectData = JSON.stringify({ settings: settings2, clips }, null, 2);
        await window.ipcRenderer.saveProject(projectData);
      },
      className: "flex flex-col items-center justify-center gap-2 px-4 py-4 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white hover:text-black hover:border-white transition-all group shadow-[0_0_15px_rgba(255,255,255,0.05)]"
    },
    /* @__PURE__ */ React.createElement(Save, { size: 20, className: "group-hover:scale-110 transition-transform" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, "Save Project")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        await window.ipcRenderer.importManifest().then(async (res) => {
          if (res.success && res.content) {
            try {
              const manifest = JSON.parse(res.content);
              const { loadManifestToStore } = await import("../../utils/editorUtils/manifestBridge");
              loadManifestToStore(manifest);
              alert("Manifest Imported Successfully! Found " + manifest.media.length + " clips.");
            } catch (e) {
              alert("Failed to parse manifest: " + e);
            }
          }
        });
      },
      className: "flex flex-col items-center justify-center gap-2 px-4 py-4 bg-black/40 text-white/70 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all group lg:col-span-1"
    },
    /* @__PURE__ */ React.createElement(FileJson, { size: 20, className: "text-white/40 group-hover:text-white transition-colors" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-center" }, "Import", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "text-xs opacity-70" }, "MMMedia Manifest"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        const { generateManifest } = await import("../../utils/editorUtils/manifestBridge");
        const manifest = generateManifest();
        const json = JSON.stringify(manifest, null, 2);
        await window.ipcRenderer.exportManifest(json);
      },
      className: "flex flex-col items-center justify-center gap-2 px-4 py-4 bg-black/40 text-white/70 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/20 hover:text-white transition-all group lg:col-span-1"
    },
    /* @__PURE__ */ React.createElement(FileJson, { size: 20, className: "text-white/40 group-hover:text-white transition-colors" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-center" }, "Export", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { className: "text-xs opacity-70" }, "MMMedia Manifest"))
  ))), /* @__PURE__ */ React.createElement("div", { className: "p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border border-white/10 relative overflow-hidden group" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" }), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-6 relative z-10" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-white/90" }, "Engine Status"), /* @__PURE__ */ React.createElement("div", { className: "px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 font-mono flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 rounded-full bg-green-400 animate-pulse" }), "ONLINE")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-4 relative z-10" }, /* @__PURE__ */ React.createElement(PowerMeter, { label: "Render Core", color: "#8b5cf6" }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-4 w-full mt-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-black/30 p-3 rounded-lg text-center backdrop-blur-sm border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/40 mb-1" }, "MEM"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-mono font-bold text-white/90" }, "1.2", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-white/40 ml-1" }, "GB"))), /* @__PURE__ */ React.createElement("div", { className: "bg-black/30 p-3 rounded-lg text-center backdrop-blur-sm border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/40 mb-1" }, "FPS"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-mono font-bold text-white/90" }, "60")), /* @__PURE__ */ React.createElement("div", { className: "bg-black/30 p-3 rounded-lg text-center backdrop-blur-sm border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/40 mb-1" }, "GPU"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-mono font-bold text-green-400" }, "ON"))))))));
};
export {
  SettingsTab
};
