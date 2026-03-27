import React from "react";
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Focus } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
const ZoomControls = ({ clipId }) => {
  const { clips, updateClip } = useClipStore();
  const clip = clips.find((c) => c.id === clipId);
  if (!clip || clip.type !== "video") return null;
  const zoomLevel = clip.zoomLevel ?? 100;
  const zoomOrigin = clip.zoomOrigin ?? "center";
  const setZoomLevel = (newZoom) => {
    const clamped = Math.max(100, Math.min(200, newZoom));
    updateClip(clipId, { zoomLevel: clamped });
  };
  const setZoomOrigin = (newOrigin) => {
    updateClip(clipId, { zoomOrigin: newOrigin });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomLevel(zoomLevel - 5),
      disabled: zoomLevel <= 100,
      className: "p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-colors",
      title: "Zoom Out"
    },
    /* @__PURE__ */ React.createElement(ZoomOut, { size: 14, className: "text-white/70" })
  ), /* @__PURE__ */ React.createElement("div", { className: "w-20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-white/90" }, zoomLevel, "%")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomLevel(zoomLevel + 5),
      disabled: zoomLevel >= 200,
      className: "p-1 hover:bg-white/10 rounded disabled:opacity-30 transition-colors",
      title: "Zoom In"
    },
    /* @__PURE__ */ React.createElement(ZoomIn, { size: 14, className: "text-white/70" })
  )), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-white/10 mx-1" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 opacity-80", "aria-label": "Zoom Origin" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomOrigin("top"),
      className: `p-1 rounded transition-colors ${zoomOrigin === "top" ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/50"}`,
      title: "Anchor Top",
      disabled: zoomLevel === 100
    },
    /* @__PURE__ */ React.createElement(ArrowUp, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomOrigin("bottom"),
      className: `p-1 rounded transition-colors ${zoomOrigin === "bottom" ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/50"}`,
      title: "Anchor Bottom",
      disabled: zoomLevel === 100
    },
    /* @__PURE__ */ React.createElement(ArrowDown, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomOrigin("left"),
      className: `p-1 rounded transition-colors ${zoomOrigin === "left" ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/50"}`,
      title: "Anchor Left",
      disabled: zoomLevel === 100
    },
    /* @__PURE__ */ React.createElement(ArrowLeft, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomOrigin("right"),
      className: `p-1 rounded transition-colors ${zoomOrigin === "right" ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/50"}`,
      title: "Anchor Right",
      disabled: zoomLevel === 100
    },
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setZoomOrigin("center"),
      className: `p-1 rounded transition-colors ${zoomOrigin === "center" ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-white/50"}`,
      title: "Anchor Center",
      disabled: zoomLevel === 100
    },
    /* @__PURE__ */ React.createElement(Focus, { size: 14 })
  )));
};
export {
  ZoomControls
};
