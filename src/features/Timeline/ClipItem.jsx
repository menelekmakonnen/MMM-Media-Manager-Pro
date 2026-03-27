import React, { memo } from "react";
import { ChevronDown, ChevronUp, Bot, Hand, Lock, Pin, Eye, EyeOff, LayoutGrid } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { ClipControls } from "./ClipControls";
import { SegmentSelector } from "./SegmentSelector";
import { TimelineWaveform } from "./TimelineWaveform";
const ClipItem = memo(({ clip, isSelected, onSelect }) => {
  const { setClipFolded, updateClip, detectBeats } = useClipStore();
  const isFolded = clip.isFolded || false;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `bg-surface-dark rounded-lg border transition-colors ${isSelected ? "border-accent shadow-[0_0_0_1px_rgba(139,92,246,0.5)]" : "border-white/10 hover:border-white/20"} ${clip.disabled ? "opacity-50 grayscale" : ""} overflow-hidden flex flex-col relative`,
      onClick: (e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }
    },
    !isFolded && !clip.disabled && (clip.type === "video" || clip.type === "audio") && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 z-0 opacity-20 pointer-events-none" }, /* @__PURE__ */ React.createElement(
      TimelineWaveform,
      {
        path: clip.path,
        width: 300,
        height: 100,
        color: isSelected ? "#8b5cf6" : "#ffffff",
        beatMarkers: clip.beatMarkers,
        onAudioLoaded: (buffer) => {
          if (!clip.beatMarkers) {
            detectBeats(clip.id, buffer);
          }
        }
      }
    )),
    /* @__PURE__ */ React.createElement("div", { className: "p-3 relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 mt-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setClipFolded(clip.id, !isFolded);
        },
        className: "p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white/80",
        title: isFolded ? "Unfold" : "Fold"
      },
      isFolded ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 14 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          updateClip(clip.id, { disabled: !clip.disabled });
        },
        className: `p-1 hover:bg-white/10 rounded transition-colors ${clip.disabled ? "text-white" : "text-white/40 hover:text-white/80"}`,
        title: clip.disabled ? "Enable Clip" : "Disable Clip"
      },
      clip.disabled ? /* @__PURE__ */ React.createElement(EyeOff, { size: 14 }) : /* @__PURE__ */ React.createElement(Eye, { size: 14 })
    )), /* @__PURE__ */ React.createElement("div", { className: "h-12 w-20 bg-black/50 rounded overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center text-white/30" }, clip.type === "grid" ? /* @__PURE__ */ React.createElement(LayoutGrid, { size: 24 }) : /* @__PURE__ */ React.createElement(
      "video",
      {
        src: clip.path,
        className: "h-full w-full object-cover",
        onLoadedMetadata: (e) => {
          e.currentTarget.currentTime = (clip.trimStartFrame ?? 0) / 30;
        },
        ref: (el) => {
          if (el) el.currentTime = (clip.trimStartFrame ?? 0) / 30;
        },
        muted: true,
        preload: "metadata",
        onError: (e) => console.error("Thumbnail load error for:", clip.path, e.currentTarget.error)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-medium text-white/90 truncate" }, clip.filename), !isFolded && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/40 mt-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "capitalize" }, clip.type), /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", null, clip.endFrame - clip.startFrame, " frames"), clip.origin === "auto" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-primary flex items-center gap-1", title: "Auto-generated" }, /* @__PURE__ */ React.createElement(Bot, { size: 12 }), " Auto")), clip.origin === "manual" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-green-400 flex items-center gap-1", title: "Manually added" }, /* @__PURE__ */ React.createElement(Hand, { size: 12 }), " Manual")), clip.locked && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-yellow-500 flex items-center gap-1", title: "Locked (Protected)" }, /* @__PURE__ */ React.createElement(Lock, { size: 12 }), " Locked")), clip.origin === "manual" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-green-400 flex items-center gap-1", title: "Manually added" }, /* @__PURE__ */ React.createElement(Hand, { size: 12 }), " Manual")), clip.locked && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-yellow-500 flex items-center gap-1", title: "Locked (Protected)" }, /* @__PURE__ */ React.createElement(Lock, { size: 12 }), " Locked")), clip.isPinned && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\u2022"), /* @__PURE__ */ React.createElement("span", { className: "text-accent flex items-center gap-1", title: "Pinned" }, /* @__PURE__ */ React.createElement(Pin, { size: 12 }), " Pinned"))), isFolded && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-0.5" }, clip.origin === "auto" && /* @__PURE__ */ React.createElement("div", { title: "Auto" }, /* @__PURE__ */ React.createElement(Bot, { size: 12, className: "text-primary" })), clip.origin === "manual" && /* @__PURE__ */ React.createElement("div", { title: "Manual" }, /* @__PURE__ */ React.createElement(Hand, { size: 12, className: "text-green-400" })), clip.locked && /* @__PURE__ */ React.createElement("div", { title: "Locked" }, /* @__PURE__ */ React.createElement(Lock, { size: 12, className: "text-yellow-500" })), clip.isPinned && /* @__PURE__ */ React.createElement("div", { title: "Pinned" }, /* @__PURE__ */ React.createElement(Pin, { size: 12, className: "text-accent" })))))),
    clip.type !== "grid" && /* @__PURE__ */ React.createElement(ClipControls, { clipId: clip.id }),
    !isFolded && clip.type !== "grid" && /* @__PURE__ */ React.createElement(SegmentSelector, { clipId: clip.id }),
    !isFolded && clip.type === "grid" && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-white/50 px-4 pb-2 italic" }, "Grid playback settings must be edited in the Grid Editor.")
  );
});
ClipItem.displayName = "ClipItem";
export {
  ClipItem
};
