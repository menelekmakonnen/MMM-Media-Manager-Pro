import React, { useState, useEffect, useRef } from "react";
import { Layers, Video, Mic, Play, Pause, Magnet, SkipBack, SkipForward, Square, Repeat, Volume2 } from "lucide-react";
import { useClipStore } from "../../stores/clipStore";
import { useProjectStore } from "../../stores/projectStore";
import { VideoPlayer } from "../../components/Editor/VideoPlayer";
import { GridPlayer } from "../../components/Editor/GridPlayer";
import clsx from "clsx";
const DEFAULT_SCALE = 0.5;
const SequenceViewTab = () => {
  const { clips, magnetizeClips, transitionStrategy } = useClipStore();
  const { settings } = useProjectStore();
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [currentGlobalFrame, setCurrentGlobalFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sequenceVolume, setSequenceVolume] = useState(1);
  const [topHeight, setTopHeight] = useState(settings.sequenceViewSplitHeight ?? 50);
  const [isResizing, setIsResizing] = useState(false);
  const { updateSettings } = useProjectStore();
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = e.clientY / window.innerHeight * 100;
      setTopHeight(Math.max(20, Math.min(newHeight, 80)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      if (topHeight !== settings.sequenceViewSplitHeight) {
        updateSettings({ sequenceViewSplitHeight: topHeight });
      }
    };
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, topHeight, settings.sequenceViewSplitHeight, updateSettings]);
  const tracks = React.useMemo(() => {
    const grouped = {};
    grouped[1] = [];
    grouped[2] = [];
    grouped[101] = [];
    clips.forEach((clip) => {
      const trackId = clip.track || 1;
      if (!grouped[trackId]) grouped[trackId] = [];
      grouped[trackId].push(clip);
    });
    return Object.keys(grouped).map(Number).sort((a, b) => a - b).map((id) => ({
      id,
      isAudio: id > 100,
      clips: grouped[id].sort((a, b) => a.startFrame - b.startFrame)
    }));
  }, [clips]);
  const activeVisualClip = React.useMemo(() => {
    const videoTracks = tracks.filter((t) => !t.isAudio).reverse();
    for (const track of videoTracks) {
      const clip = track.clips.find(
        (c) => !c.disabled && currentGlobalFrame >= c.startFrame && currentGlobalFrame < c.endFrame
      );
      if (clip) return clip;
    }
    return null;
  }, [tracks, currentGlobalFrame]);
  const maxFrameId = React.useMemo(() => {
    const allClips = tracks.flatMap((t) => t.clips).filter((c) => !c.disabled);
    return allClips.reduce((max, clip) => Math.max(max, clip.endFrame), 0);
  }, [tracks]);
  useEffect(() => {
    if (isPlaying && currentGlobalFrame >= maxFrameId && maxFrameId > 0) {
      if (settings.sequenceLoop) {
        setCurrentGlobalFrame(0);
      } else {
        setCurrentGlobalFrame(maxFrameId);
        setIsPlaying(false);
      }
    }
  }, [currentGlobalFrame, maxFrameId, isPlaying, settings.sequenceLoop]);
  useEffect(() => {
    if (!isPlaying) return;
    let animationFrameId;
    let lastTime = performance.now();
    const frameDuration = 1e3 / settings.fps;
    const loop = (time) => {
      const deltaTime = time - lastTime;
      if (deltaTime >= frameDuration) {
        const framesToAdvance = Math.floor(deltaTime / frameDuration);
        setCurrentGlobalFrame((f) => f + framesToAdvance);
        lastTime = time - deltaTime % frameDuration;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, settings.fps]);
  const handlePlayPause = () => {
    if (!isPlaying && currentGlobalFrame >= maxFrameId && maxFrameId > 0) {
      setCurrentGlobalFrame(0);
    }
    setIsPlaying(!isPlaying);
  };
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentGlobalFrame(0);
  };
  const handleSkipNext = () => {
    const allClips = tracks.flatMap((t) => t.clips).filter((c) => !c.disabled);
    const nextStarts = allClips.map((c) => c.startFrame).filter((start) => start > currentGlobalFrame).sort((a, b) => a - b);
    if (nextStarts.length > 0) {
      setCurrentGlobalFrame(nextStarts[0]);
    }
  };
  const handleSkipPrev = () => {
    if (currentGlobalFrame === 0) return;
    const threshold = 10;
    const allClips = tracks.flatMap((t) => t.clips).filter((c) => !c.disabled);
    const prevStarts = allClips.map((c) => c.startFrame).filter((start) => start < currentGlobalFrame - threshold).sort((a, b) => b - a);
    if (prevStarts.length > 0) {
      setCurrentGlobalFrame(prevStarts[0]);
    } else {
      setCurrentGlobalFrame(0);
    }
  };
  const isGrid = activeVisualClip?.type === "grid";
  const playerProps = activeVisualClip && !isGrid ? {
    videoPath: activeVisualClip.type === "video" ? activeVisualClip.path : void 0,
    // Map global frame to local clip frame
    // local = (global - start) * speed + trimStart
    // Use trimStartFrame which represents the start of the visible segment in the source file
    currentFrame: Math.floor((currentGlobalFrame - activeVisualClip.startFrame) * activeVisualClip.speed) + (activeVisualClip.trimStartFrame || 0),
    fps: settings.fps,
    playbackSpeed: activeVisualClip.speed,
    volume: sequenceVolume,
    zoomLevel: activeVisualClip.zoomLevel,
    zoomOrigin: activeVisualClip.zoomOrigin
  } : {
    currentFrame: 0,
    fps: settings.fps
  };
  const containerRef = useRef(null);
  const handleTimelineClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = 200;
    const clickX = e.clientX - rect.left - startX;
    const newFrame = Math.max(0, Math.floor((clickX + containerRef.current.scrollLeft) / scale));
    setCurrentGlobalFrame(newFrame);
  };
  const transitionFrames = Math.floor(settings.fps / 2);
  const clipOpacity = React.useMemo(() => {
    if (!activeVisualClip || transitionStrategy === "cut") return 1;
    const isFirstClip = activeVisualClip.startFrame === 0;
    const framesFromStart = currentGlobalFrame - activeVisualClip.startFrame;
    const framesFromEnd = activeVisualClip.endFrame - currentGlobalFrame;
    if (framesFromStart < transitionFrames && !isFirstClip) {
      return framesFromStart / transitionFrames;
    } else if (framesFromEnd < transitionFrames) {
      return framesFromEnd / transitionFrames;
    }
    return 1;
  }, [activeVisualClip, currentGlobalFrame, transitionStrategy, transitionFrames]);
  return /* @__PURE__ */ React.createElement("div", { className: "flex h-full w-full flex-col bg-[#0a0a15] text-white overflow-hidden" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "bg-black border-b border-white/10 relative p-4 flex flex-col min-h-0",
      style: { height: `${topHeight}%` }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-hidden relative flex flex-col transition-opacity duration-300", style: { opacity: clipOpacity } }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 z-0" }, !isGrid && /* @__PURE__ */ React.createElement(
      VideoPlayer,
      {
        ...playerProps,
        bgOnly: true,
        hideTransport: true,
        onFrameChange: () => {
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-hidden relative flex items-center justify-center p-4 z-10 pointer-events-none" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "relative bg-black/80 border border-white/20 rounded-lg overflow-hidden flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] h-full pointer-events-auto",
        style: {
          aspectRatio: settings.aspectRatio.replace(":", "/"),
          maxHeight: "100%",
          maxWidth: "100%"
        }
      },
      isGrid ? /* @__PURE__ */ React.createElement(
        GridPlayer,
        {
          grid: activeVisualClip,
          currentFrame: Math.floor((currentGlobalFrame - activeVisualClip.startFrame) * activeVisualClip.speed) + (activeVisualClip.trimStartFrame || 0),
          isPlaying,
          onFrameChange: () => {
          }
        }
      ) : /* @__PURE__ */ React.createElement(
        VideoPlayer,
        {
          ...playerProps,
          hideTransport: true,
          onFrameChange: () => {
          }
        }
      )
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "h-12 flex items-center justify-between px-4 mt-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 w-32" }, /* @__PURE__ */ React.createElement(Volume2, { size: 16, className: "text-white/60" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: "0",
        max: "1",
        step: "0.01",
        value: sequenceVolume,
        title: "Sequence Volume",
        onChange: (e) => setSequenceVolume(parseFloat(e.target.value)),
        className: "flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: handleSkipPrev, className: "p-2 hover:bg-white/10 rounded-full", title: "Previous Clip" }, /* @__PURE__ */ React.createElement(SkipBack, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: handleStop, className: "p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-red-400", title: "Stop" }, /* @__PURE__ */ React.createElement(Square, { size: 16, fill: "currentColor" })), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handlePlayPause,
        className: "w-10 h-10 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center text-black shadow-lg shadow-primary/20",
        title: isPlaying ? "Pause" : "Play"
      },
      isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 18, fill: "currentColor" }) : /* @__PURE__ */ React.createElement(Play, { size: 18, fill: "currentColor", className: "ml-0.5" })
    ), /* @__PURE__ */ React.createElement("button", { onClick: handleSkipNext, className: "p-2 hover:bg-white/10 rounded-full", title: "Next Clip" }, /* @__PURE__ */ React.createElement(SkipForward, { size: 16 }))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 w-32 justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: magnetizeClips,
        title: "Magnetize (Remove Gaps)",
        className: "p-2 hover:bg-white/10 rounded-full text-accent transition-colors"
      },
      /* @__PURE__ */ React.createElement(Magnet, { size: 16 })
    ), /* @__PURE__ */ React.createElement("div", { className: "w-px h-4 bg-white/10 mx-1" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => updateSettings({ sequenceLoop: !settings.sequenceLoop }),
        title: settings.sequenceLoop ? "Looping Enabled" : "Looping Disabled",
        className: `p-2 rounded-full transition-colors ${settings.sequenceLoop ? "text-primary bg-primary/20" : "text-white/40 hover:text-white/80 hover:bg-white/10"}`
      },
      /* @__PURE__ */ React.createElement(Repeat, { size: 16 })
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-mono text-white/40 text-center pb-2 z-10 flex-shrink-0 mt-1" }, "SEQ TC: ", Math.floor(currentGlobalFrame / settings.fps / 60).toString().padStart(2, "0"), ":", Math.floor(currentGlobalFrame / settings.fps % 60).toString().padStart(2, "0"), ":", (currentGlobalFrame % settings.fps).toString().padStart(2, "0"), " | Frame ", currentGlobalFrame)
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-1 bg-[#131320] hover:bg-accent/50 cursor-row-resize transition-colors z-30 flex items-center justify-center group flex-shrink-0",
      onMouseDown: () => setIsResizing(true)
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-0.5 bg-white/10 group-hover:bg-accent/50 rounded-full" })
  ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-hidden flex flex-col relative" }, /* @__PURE__ */ React.createElement("div", { className: "h-10 border-b border-white/10 flex items-center px-4 justify-between bg-[#0d0d1a] z-20 relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-semibold text-white/80 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Layers, { size: 16, className: "text-primary" }), "Sequence 01")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement("label", { htmlFor: "scale-slider", className: "text-white/40" }, "Scale:"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: "scale-slider",
      type: "range",
      min: "0.1",
      max: "2",
      step: "0.1",
      value: scale,
      onChange: (e) => setScale(parseFloat(e.target.value)),
      className: "w-20 accent-primary"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-hidden flex flex-col relative", ref: containerRef }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-8 border-b border-white/5 bg-[#080812] flex items-center overflow-hidden shrink-0 ml-[200px]",
      onClick: handleTimelineClick
    },
    /* @__PURE__ */ React.createElement("div", { className: "relative h-full w-full" }, Array.from({ length: 100 }).map((_, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        className: "absolute bottom-0 border-l border-white/10 h-3 text-[9px] text-white/30 pl-1 select-none",
        style: { left: i * settings.fps * 10 * scale }
      },
      i * 10,
      "s"
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "absolute top-0 bottom-0 w-4 -ml-2 flex justify-center cursor-pointer z-30",
        style: { left: currentGlobalFrame * scale }
      },
      /* @__PURE__ */ React.createElement("div", { className: "w-0.5 h-full bg-red-500" }),
      /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 w-3 h-3 bg-red-500 transform rotate-45 -mt-1.5 rounded-sm" })
    ))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col min-h-0 overflow-x-auto relative bg-[#080812]" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-full relative flex-1 flex flex-col" }, tracks.map((track) => /* @__PURE__ */ React.createElement("div", { key: track.id, className: "flex flex-1 min-h-[40px] bg-[#0e0e1b] border-b border-white/5 relative group transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "w-[200px] bg-[#111122] border-r border-white/5 flex flex-col p-3 gap-2 flex-shrink-0 sticky left-0 z-10 shadow-lg top-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-white/70 flex items-center gap-2" }, track.isAudio ? /* @__PURE__ */ React.createElement(Mic, { size: 12, className: "text-pink-400" }) : /* @__PURE__ */ React.createElement(Video, { size: 12, className: "text-accent" }), "Track ", track.id))), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex-1 relative min-w-0",
      style: {
        backgroundSize: "20px 20px",
        backgroundImage: "radial-gradient(circle, #ffffff05 1px, transparent 1px)"
      },
      onClick: handleTimelineClick
    },
    track.clips.map((clip) => {
      const duration = clip.endFrame - clip.startFrame;
      const width = duration * scale;
      const left = clip.startFrame * scale;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: clip.id,
          className: clsx(
            "absolute top-2 bottom-2 rounded border text-xs flex flex-col justify-center px-2 truncate overflow-hidden cursor-pointer hover:brightness-110 shadow-lg transition-colors border-l-4",
            activeVisualClip?.id === clip.id ? "ring-2 ring-white/50" : "",
            clip.disabled ? "opacity-30 grayscale border-dashed" : clip.type === "grid" ? "bg-primary/40 border-l-primary border-y-primary/30 border-r-primary/30 text-primary-light" : clip.type === "video" ? "bg-accent/40 border-l-accent border-y-accent/30 border-r-accent/30 text-accent-light" : clip.type === "audio" ? "bg-pink-900/40 border-l-pink-500 border-y-pink-500/30 border-r-pink-500/30 text-pink-200" : "bg-gray-800/40 border-gray-600"
          ),
          style: { left, width },
          title: `${clip.filename} (${duration}f)`,
          onClick: (e) => {
            e.stopPropagation();
            setCurrentGlobalFrame(clip.startFrame);
          }
        },
        /* @__PURE__ */ React.createElement("span", { className: "font-semibold truncate" }, clip.filename),
        /* @__PURE__ */ React.createElement("span", { className: "text-[9px] opacity-60" }, "Dur: ", duration, "f")
      );
    })
  ))), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20",
      style: { left: 200 + currentGlobalFrame * scale }
    }
  ))))));
};
export {
  SequenceViewTab
};
