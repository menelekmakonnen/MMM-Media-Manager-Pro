import React, { useState } from "react";
import { Copy, Trash2, Shuffle, Pin, PinOff, Volume2, VolumeX, Sparkles, ArrowRightLeft, Palette, Lock, Unlock, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { SpeedControl } from "../../components/Editor/SpeedControl";
import { AssetPicker } from "../../components/Editor/AssetPicker";
const ClipControls = ({ clipId, variant = "sidebar" }) => {
  const { clips, duplicateClip, deleteClip, randomizeSegment, pinClip, lockClip, setClipVolume, setClipMuted, setClipSpeed, moveClip } = useClipStore();
  const clip = clips.find((c) => c.id === clipId);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  if (!clip) return null;
  const isPinned = clip.isPinned || false;
  const isLocked = clip.locked || false;
  const volume = clip.volume ?? 100;
  const isMuted = clip.isMuted || false;
  const speed = clip.speed ?? 1;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, showAssetPicker && /* @__PURE__ */ React.createElement(AssetPicker, { clipId, onClose: () => setShowAssetPicker(false) }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 px-3 py-2 bg-surface-dark/50 border-t border-white/5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => duplicateClip(clipId),
      className: "p-1.5 hover:bg-white/10 rounded transition-colors",
      title: "Duplicate Clip"
    },
    /* @__PURE__ */ React.createElement(Copy, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => deleteClip(clipId),
      className: "p-1.5 hover:bg-red-500/20 rounded transition-colors",
      title: "Delete Clip"
    },
    /* @__PURE__ */ React.createElement(Trash2, { size: 16, className: "text-red-400/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => randomizeSegment(clipId),
      className: "p-1.5 hover:bg-white/10 rounded transition-colors",
      title: "Shuffle Segment Position"
    },
    /* @__PURE__ */ React.createElement(Shuffle, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => useClipStore.getState().swapClip(clipId),
      className: `p-1.5 hover:bg-white/10 rounded transition-colors ${isPinned ? "opacity-50 cursor-not-allowed" : ""}`,
      title: isPinned ? "Cannot swap pinned clip" : "Swap Clip Position"
    },
    /* @__PURE__ */ React.createElement(ArrowRightLeft, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => moveClip(clipId, "up"),
      className: "p-1.5 hover:bg-white/10 rounded transition-colors",
      title: "Move Clip Up/Left"
    },
    /* @__PURE__ */ React.createElement(ArrowUpCircle, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => moveClip(clipId, "down"),
      className: "p-1.5 hover:bg-white/10 rounded transition-colors",
      title: "Move Clip Down/Right"
    },
    /* @__PURE__ */ React.createElement(ArrowDownCircle, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => useClipStore.getState().randomizeClipDuration(clipId),
      className: "p-1.5 hover:bg-accent/20 rounded transition-colors",
      title: "Flux: Randomize Duration & Segment"
    },
    /* @__PURE__ */ React.createElement(Sparkles, { size: 16, className: "text-accent" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAssetPicker(true),
      className: "p-1.5 hover:bg-primary/20 rounded transition-colors",
      title: "Apply Speed Ramps & Effects"
    },
    /* @__PURE__ */ React.createElement(Palette, { size: 16, className: "text-primary" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => pinClip(clipId, !isPinned),
      className: `p-1.5 hover:bg-white/10 rounded transition-colors ${isPinned ? "bg-accent/20" : ""}`,
      title: isPinned ? "Unpin Clip" : "Pin Clip"
    },
    isPinned ? /* @__PURE__ */ React.createElement(Pin, { size: 16, className: "text-accent" }) : /* @__PURE__ */ React.createElement(PinOff, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => lockClip(clipId, !isLocked),
      className: `p-1.5 hover:bg-white/10 rounded transition-colors ${isLocked ? "bg-yellow-500/20" : ""}`,
      title: isLocked ? "Unlock Clip (allow regeneration)" : "Lock Clip (protect from regeneration)"
    },
    isLocked ? /* @__PURE__ */ React.createElement(Lock, { size: 16, className: "text-yellow-500" }) : /* @__PURE__ */ React.createElement(Unlock, { size: 16, className: "text-white/60" })
  ), !clip.isFolded && variant === "player" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-white/10 mx-1" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-1 min-w-[100px]" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setClipMuted(clipId, !isMuted),
      className: "p-1.5 hover:bg-white/10 rounded transition-colors",
      title: isMuted ? "Unmute" : "Mute"
    },
    isMuted ? /* @__PURE__ */ React.createElement(VolumeX, { size: 16, className: "text-white/40" }) : /* @__PURE__ */ React.createElement(Volume2, { size: 16, className: "text-white/60" })
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "100",
      value: volume,
      onChange: (e) => setClipVolume(clipId, parseInt(e.target.value)),
      className: "flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent",
      disabled: isMuted,
      title: "Volume"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-white/40 w-8 text-right" }, volume, "%")), /* @__PURE__ */ React.createElement("div", { className: "h-4 w-px bg-white/10 mx-1" }), /* @__PURE__ */ React.createElement(
    SpeedControl,
    {
      value: speed,
      onChange: (newSpeed) => setClipSpeed(clipId, newSpeed),
      size: "sm"
    }
  ))));
};
export {
  ClipControls
};
