import React, { useState } from "react";
import {
  Sparkles,
  VolumeX,
  Volume2,
  Layers,
  ArrowRightLeft,
  Zap,
  Clock,
  Wand2,
  Scissors,
  Smartphone,
  Activity,
  Type as TypeIcon,
  Music,
  Share2
} from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { useProjectStore } from "../../stores/projectStore";
import { SpeedControl } from "../../components/Editor/SpeedControl";
import { AutomationCard } from "../GodMode/AutomationCard";
import { GodModePanel } from "../GodMode/GodModePanel";
const GlobalControls = ({
  orientation = "horizontal",
  slim = false,
  className = "",
  containerWidth = 200,
  sections = ["stats", "automation", "actions", "mute"]
}) => {
  const { clips, globalMute, setGlobalMute, globalPlaybackSpeed, setGlobalPlaybackSpeed, setGlobalFlux } = useClipStore();
  const { settings } = useProjectStore();
  const [isGodModeOpen, setIsGodModeOpen] = useState(false);
  const iconScale = Math.min(1, Math.max(0.6, containerWidth / 64));
  const iconSize = Math.floor(18 * iconScale);
  const compactMode = containerWidth < 140;
  const isSlim = slim || orientation === "vertical" && containerWidth < 180;
  const simulateTask = (duration) => {
    return new Promise((resolve) => setTimeout(resolve, duration));
  };
  const runAutoEdit = async () => {
    setGlobalFlux();
    await simulateTask(1e3);
  };
  const totalDuration = clips.reduce((max, clip) => Math.max(max, clip.endFrame), 0);
  const totalSeconds = totalDuration / (settings.fps || 30);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const isVertical = orientation === "vertical";
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: `bg-[#080816] ${isVertical ? "h-full border-l border-white/10 flex flex-col" : "border-t border-white/10"} ${slim ? "p-2 space-y-4 items-center" : "p-4 space-y-4"} ${className}` }, !isVertical && sections.includes("stats") && /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-4 border-b border-white/5 pb-0 order-1` }, isVertical && !slim && /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-white/40 uppercase tracking-widest mb-1" }, "Project Stats"), /* @__PURE__ */ React.createElement("div", { className: `flex ${isVertical ? "w-full flex-col gap-2" : "items-center gap-4"}` }, /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 ${isSlim ? "justify-center p-2" : "px-3 py-2"} bg-white/5 rounded-lg border border-white/5 ${isVertical && !isSlim ? "flex-1 mr-2" : ""}`, title: "Timeline Duration" }, /* @__PURE__ */ React.createElement(Clock, { size: iconSize, className: "text-white/40" }), !isSlim && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-white/30 uppercase tracking-tighter" }, "Timeline"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-mono text-white/90 leading-none" }, String(minutes).padStart(2, "0"), ":", String(seconds).padStart(2, "0")))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 ${isSlim ? "justify-center p-2" : "px-3 py-2"} bg-white/5 rounded-lg border border-white/5 ${isVertical && !isSlim ? "flex-1" : ""}`, title: "Total Assets" }, /* @__PURE__ */ React.createElement(Layers, { size: iconSize, className: "text-white/40" }), !isSlim && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-white/30 uppercase tracking-tighter" }, "Assets"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-mono text-white/90 leading-none" }, clips.length)))), !slim && /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-4 ${isVertical ? "w-full justify-between bg-white/5 p-2 rounded-lg border border-white/5" : "ml-2"}` }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] text-white/30 uppercase tracking-widest font-bold" }, "Global Speed"), /* @__PURE__ */ React.createElement(
    SpeedControl,
    {
      value: globalPlaybackSpeed,
      onChange: setGlobalPlaybackSpeed,
      size: "sm"
    }
  ))), !isVertical && sections.includes("automation") && /* @__PURE__ */ React.createElement("div", { className: `order-2 pt-2` }, isVertical && !slim && /* @__PURE__ */ React.createElement("div", { className: "text-xs font-bold text-white/40 uppercase tracking-widest mb-3 mt-2" }, "Automation"), /* @__PURE__ */ React.createElement("div", { className: `grid ${isVertical ? "grid-cols-1 gap-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"}` }, /* @__PURE__ */ React.createElement(AutomationCard, { title: "Auto-Edit", description: "Trim & arrange clips", icon: Scissors, color: "text-pink-500", onRun: runAutoEdit, compact: compactMode, iconSize }), /* @__PURE__ */ React.createElement(AutomationCard, { title: "Viral 9:16", description: "Vertical reformat", icon: Smartphone, color: "text-primary", onRun: async () => await simulateTask(2e3), compact: compactMode, iconSize }), /* @__PURE__ */ React.createElement(AutomationCard, { title: "Silence", description: "Strip dead air", icon: Activity, color: "text-emerald-500", onRun: async () => await simulateTask(1200), compact: compactMode, iconSize }), /* @__PURE__ */ React.createElement(AutomationCard, { title: "Captions", description: "Auto-subtitles", icon: TypeIcon, color: "text-orange-500", onRun: async () => await simulateTask(2500), compact: compactMode, iconSize }), /* @__PURE__ */ React.createElement(AutomationCard, { title: "Remix", description: "Sync to music", icon: Music, color: "text-accent", onRun: async () => await simulateTask(1800), compact: compactMode, iconSize }), /* @__PURE__ */ React.createElement(AutomationCard, { title: "Export", description: "Post to social", icon: Share2, color: "text-red-500", onRun: async () => await simulateTask(3e3), compact: compactMode, iconSize }))), (sections.includes("actions") || sections.includes("mute")) && /* @__PURE__ */ React.createElement("div", { className: `order-3 ${isVertical ? "flex flex-col gap-4 my-auto w-full pt-4" : "flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4"}` }, sections.includes("actions") && /* @__PURE__ */ React.createElement("div", { className: `flex w-full ${isVertical ? "flex-col gap-4" : "items-center gap-3"}` }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => useClipStore.getState().shuffleClips(),
      className: `${isVertical ? "h-16 w-full flex-col justify-center px-0 rounded-2xl" : "h-10 px-6 " + (slim ? "w-10 justify-center px-0" : "") + " rounded-xl"} bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-white/20 active:scale-95 group`,
      title: "Shuffle Clip Order"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(ArrowRightLeft, { size: isVertical ? 24 : iconSize, className: "text-white/60 group-hover:text-white" }), !isVertical && !isSlim && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-white/80 group-hover:text-white" }, "SHUFFLE"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => useClipStore.getState().setGlobalFlux(),
      className: `${isVertical ? "h-16 w-full flex-col justify-center px-0 rounded-2xl" : "h-10 px-6 " + (slim ? "w-10 justify-center px-0" : "") + " rounded-xl"} bg-primary/20 hover:bg-primary/40 text-primary-light flex items-center justify-center gap-2 transition-all border border-primary/20 hover:border-primary/40 active:scale-95 group shadow-lg shadow-primary/10`,
      title: "Randomize All Durations & Segments"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Sparkles, { size: isVertical ? 24 : iconSize, className: "group-hover:scale-110 transition-transform" }), !isVertical && !isSlim && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, "FLUX"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => useClipStore.getState().chaos(),
      className: `${isVertical ? "h-16 w-full flex-col justify-center px-0 rounded-2xl" : "h-10 px-6 " + (slim ? "w-10 justify-center px-0" : "") + " rounded-xl"} bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center gap-2 transition-all border border-red-500/20 hover:border-red-500/40 active:scale-95 group`,
      title: "Shuffle + Flux Everything"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Zap, { size: isVertical ? 24 : iconSize, fill: "currentColor", className: "group-hover:animate-pulse" }), !isVertical && !isSlim && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, "CHAOS"))
  )), (sections.includes("mute") || sections.includes("actions")) && /* @__PURE__ */ React.createElement("div", { className: `flex ${isVertical ? slim ? "flex-col-reverse gap-3 items-center mt-2" : "items-center justify-between mt-2" : "items-center gap-3"}` }, /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-3 w-full ${slim ? "flex-col gap-3" : "justify-end"}` }, sections.includes("mute") && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setGlobalMute(!globalMute),
      className: `h-10 ${slim ? "w-10 px-0" : "px-4 flex-1"} rounded-xl flex items-center gap-2 transition-all active:scale-95 justify-center ${globalMute ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 shadow-lg shadow-red-500/10" : "bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"}`,
      title: globalMute ? "Unmute All Clips" : "Mute All Clips"
    },
    globalMute ? /* @__PURE__ */ React.createElement(VolumeX, { size: iconSize }) : /* @__PURE__ */ React.createElement(Volume2, { size: iconSize }),
    isVertical && !isSlim && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold ml-1" }, globalMute ? "MUTED" : "MUTE")
  ), sections.includes("actions") && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsGodModeOpen(true),
      className: "h-10 w-10 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0",
      title: "State Control & State Inspector"
    },
    /* @__PURE__ */ React.createElement(Wand2, { size: iconSize })
  ))))), isGodModeOpen && /* @__PURE__ */ React.createElement(GodModePanel, { onClose: () => setIsGodModeOpen(false) }));
};
export {
  GlobalControls
};
