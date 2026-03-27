import React, { useState, useEffect, useRef } from "react";
import { GripVertical, LayoutGrid, Minus, Square } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { useProjectStore } from "../../stores/projectStore";
import { VideoPlayer } from "../../components/Editor/VideoPlayer";
import { ClipControls } from "./ClipControls";
import { GlobalControls } from "./GlobalControls";
import { ClipItem } from "./ClipItem";
import { SegmentSelector } from "./SegmentSelector";
import { ZoomControls } from "./ZoomControls";
const TimelineTab = () => {
  const {
    clips,
    selectedClipIds,
    selectSingleClip,
    updateClip,
    globalPlaybackSpeed,
    setAllClipsFolded,
    transitionStrategy,
    setTransitionStrategy
  } = useClipStore();
  const { settings } = useProjectStore();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [leftPanelWidth, setLeftPanelWidth] = useState(30);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    if (clips.length > 0 && selectedClipIds.length === 0) {
      selectSingleClip(clips[0].id);
    }
  }, [clips, selectedClipIds, selectSingleClip]);
  const selectedClipId = selectedClipIds[0];
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  useEffect(() => {
    if (selectedClip) {
      setCurrentFrame(selectedClip.trimStartFrame ?? 0);
    }
  }, [selectedClip?.trimStartFrame, selectedClip?.id]);
  const handleDurationChange = (duration) => {
    if (selectedClip && selectedClip.sourceDurationFrames === 0) {
      const totalFrames = Math.floor(duration * settings.fps);
      updateClip(selectedClip.id, {
        sourceDurationFrames: totalFrames,
        endFrame: totalFrames
        // Initially set endFrame to full duration
      });
    }
  };
  const handleMouseDown = () => {
    setIsResizing(true);
  };
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = (e.clientX - containerRect.left) / containerRect.width * 100;
      const clampedWidth = Math.min(Math.max(newWidth, 20), 60);
      setLeftPanelWidth(clampedWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);
  const [sidebarWidth, setSidebarWidth] = useState(64);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarRef = useRef(null);
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingSidebar) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(48, Math.min(newWidth, 400)));
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    if (isResizingSidebar) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);
  return /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-row bg-background overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { ref: containerRef, className: "flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5",
      style: { width: `${leftPanelWidth}%` }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 border-b border-white/5 bg-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(LayoutGrid, { size: 16, className: "text-white/40" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold uppercase tracking-wider text-white/60" }, "Timeline")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "bg-black/20 text-xs text-white/60 border border-white/10 rounded px-2 py-1 outline-none focus:border-primary/50",
        value: transitionStrategy,
        onChange: (e) => setTransitionStrategy(e.target.value),
        title: "Transition Strategy"
      },
      /* @__PURE__ */ React.createElement("option", { value: "cut" }, "Cut"),
      /* @__PURE__ */ React.createElement("option", { value: "cross-dissolve" }, "Dissolve"),
      /* @__PURE__ */ React.createElement("option", { value: "fade-to-black" }, "Fade")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setAllClipsFolded(true),
        className: "p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors",
        title: "Collapse All"
      },
      /* @__PURE__ */ React.createElement(Minus, { size: 14 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setAllClipsFolded(false),
        className: "p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors",
        title: "Expand All"
      },
      /* @__PURE__ */ React.createElement(Square, { size: 14 })
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" }, clips.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 text-white/40" }, "No clips in timeline", /* @__PURE__ */ React.createElement("div", { className: "text-xs mt-2" }, "Import media from Media Manager")) : clips.filter((c) => c.type === "video" || c.type === "grid").map((clip) => /* @__PURE__ */ React.createElement(
      ClipItem,
      {
        key: clip.id,
        clip,
        isSelected: selectedClipIds.includes(clip.id),
        onSelect: selectSingleClip
      }
    )))
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "hidden lg:flex items-center justify-center w-1 bg-white/5 hover:bg-accent/50 cursor-col-resize transition-colors relative group z-10",
      onMouseDown: handleMouseDown,
      title: "Drag to resize list"
    },
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-y-0 flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ React.createElement(GripVertical, { size: 12, className: "text-white/20 group-hover:text-accent/70" }))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col flex-1 min-h-0 relative bg-black/50" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 p-4 min-h-[300px] flex flex-col justify-center" }, /* @__PURE__ */ React.createElement(
    VideoPlayer,
    {
      videoPath: selectedClip?.type === "video" ? selectedClip.path : void 0,
      currentFrame,
      fps: settings.fps,
      onFrameChange: setCurrentFrame,
      onDurationChange: handleDurationChange,
      playbackSpeed: globalPlaybackSpeed,
      clipSpeed: selectedClip?.speed,
      centerControls: selectedClip ? /* @__PURE__ */ React.createElement(SegmentSelector, { clipId: selectedClip.id, onScrub: setCurrentFrame }) : null,
      stopAtFrame: selectedClip ? selectedClip.trimEndFrame || selectedClip.endFrame : void 0,
      zoomLevel: selectedClip?.zoomLevel,
      zoomOrigin: selectedClip?.zoomOrigin
    }
  )), selectedClip && /* @__PURE__ */ React.createElement("div", { className: "p-4 border-t border-white/5 bg-[#0a0a12] flex items-start justify-between gap-4 overflow-x-auto custom-scrollbar" }, /* @__PURE__ */ React.createElement(ClipControls, { clipId: selectedClip.id, variant: "player" }), /* @__PURE__ */ React.createElement(ZoomControls, { clipId: selectedClip.id })))), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-1 bg-[#131320] hover:bg-accent/50 cursor-col-resize transition-colors z-30 flex items-center justify-center group flex-shrink-0",
      onMouseDown: () => setIsResizingSidebar(true)
    },
    /* @__PURE__ */ React.createElement("div", { className: "h-8 w-0.5 bg-white/10 group-hover:bg-accent/50 rounded-full" })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: sidebarRef,
      className: "flex-shrink-0 z-20 bg-[#080816] h-full relative shadow-xl overflow-hidden",
      style: { width: sidebarWidth }
    },
    /* @__PURE__ */ React.createElement(
      GlobalControls,
      {
        orientation: "vertical",
        slim: sidebarWidth < 180,
        className: "h-full",
        containerWidth: sidebarWidth
      }
    )
  ));
};
export {
  TimelineTab
};
