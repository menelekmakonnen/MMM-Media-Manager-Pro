import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { AudioVisualizer } from "./AudioVisualizer";
import { useProjectStore } from "../../stores/projectStore";
import { secondsToFrames } from "../../utils/editorUtils/time";
const VideoPlayer = ({
  videoPath,
  currentFrame,
  fps,
  onFrameChange,
  onDurationChange,
  playbackSpeed = 1,
  clipSpeed = 1,
  volume = 1,
  centerControls,
  stopAtFrame,
  zoomLevel = 100,
  zoomOrigin = "center",
  hideTransport = false,
  bgOnly = false
}) => {
  const videoRef = useRef(null);
  const bgVideoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const { settings } = useProjectStore();
  const backgroundFillMode = settings.backgroundFillMode;
  const aspectRatio = settings.aspectRatio;
  const effectiveSpeed = playbackSpeed * clipSpeed;
  useEffect(() => {
    setIsReady(false);
  }, [videoPath]);
  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.volume = Math.max(0, Math.min(volume, 1));
      } catch (e) {
        console.warn("Failed to set volume on foreground video:", volume, e);
      }
    }
  }, [volume]);
  useEffect(() => {
    if (!isReady) return;
    if (videoRef.current) {
      const targetTime = currentFrame / fps;
      if (!isPlaying || Math.abs(videoRef.current.currentTime - targetTime) > 0.5) {
        videoRef.current.currentTime = targetTime;
        if (isPlaying) {
          const playPromise = videoRef.current.play();
          if (playPromise !== void 0) {
            playPromise.catch(() => {
            });
          }
        }
      }
    }
    if (bgVideoRef.current) {
      const targetTime = currentFrame / fps;
      if (!isPlaying || Math.abs(bgVideoRef.current.currentTime - targetTime) > 0.5) {
        bgVideoRef.current.currentTime = targetTime;
      }
    }
  }, [currentFrame, fps, isPlaying, videoPath, isReady]);
  useEffect(() => {
    const safeSpeed = Math.max(0.1, Math.min(effectiveSpeed, 16));
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = safeSpeed;
      } catch (e) {
        console.warn("Failed to set playbackRate on foreground video:", safeSpeed, e);
      }
    }
    if (bgVideoRef.current) {
      try {
        bgVideoRef.current.playbackRate = safeSpeed;
      } catch (e) {
        console.warn("Failed to set playbackRate on background video:", safeSpeed, e);
      }
    }
  }, [effectiveSpeed]);
  useEffect(() => {
    if (!videoRef.current || !isPlaying) return;
    const interval = setInterval(() => {
      if (!isReady) return;
      if (videoRef.current) {
        const newFrame = secondsToFrames(videoRef.current.currentTime, fps);
        if (stopAtFrame !== void 0 && newFrame >= stopAtFrame) {
          setIsPlaying(false);
          videoRef.current.pause();
          if (bgVideoRef.current) bgVideoRef.current.pause();
          onFrameChange(stopAtFrame);
          return;
        }
        onFrameChange(newFrame);
      }
    }, 1e3 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, fps, onFrameChange, stopAtFrame, isReady]);
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      if (bgVideoRef.current) bgVideoRef.current.play();
      setIsPlaying(true);
    }
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const vidDuration = videoRef.current.duration;
      setDuration(vidDuration);
      setIsReady(true);
      if (currentFrame > 0) {
        videoRef.current.currentTime = currentFrame / fps;
      }
      if (onDurationChange) {
        onDurationChange(vidDuration);
      }
      if (isPlaying) {
        videoRef.current.play().catch(() => {
        });
      }
    }
  };
  const skipBackward = () => {
    const newFrame = Math.max(0, currentFrame - fps);
    onFrameChange(newFrame);
  };
  const skipForward = () => {
    const maxFrame = Math.floor(duration * fps);
    const newFrame = Math.min(maxFrame, currentFrame + fps);
    onFrameChange(newFrame);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-black/50 rounded-lg overflow-hidden" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "flex-1 relative flex items-center justify-center min-h-0 overflow-hidden cursor-pointer",
      style: {
        aspectRatio,
        backgroundColor: backgroundFillMode === "black" ? "#000000" : void 0
      },
      onClick: togglePlayPause,
      title: isPlaying ? "Click to pause" : "Click to play"
    },
    videoPath ? /* @__PURE__ */ React.createElement(React.Fragment, null, (backgroundFillMode === "blur" || bgOnly) && /* @__PURE__ */ React.createElement(
      "video",
      {
        ref: bgVideoRef,
        src: `file://${videoPath}`,
        className: `absolute inset-0 w-full h-full object-cover ${bgOnly ? "blur-[80px] opacity-40 scale-110 saturate-150" : "blur-2xl opacity-60"}`,
        muted: true
      }
    ), !bgOnly && /* @__PURE__ */ React.createElement(
      "video",
      {
        ref: videoRef,
        src: `file://${videoPath}`,
        className: "relative w-full h-full object-contain z-10 transition-transform duration-300",
        style: {
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: zoomOrigin
        },
        onLoadedMetadata: handleLoadedMetadata,
        onEnded: () => setIsPlaying(false)
      }
    )) : /* @__PURE__ */ React.createElement("div", { className: "text-white/40 text-sm" }, "No video loaded")
  ), !hideTransport && !bgOnly && /* @__PURE__ */ React.createElement("div", { className: "bg-[#0a0a15] border-t border-white/10 px-4 py-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 h-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: skipBackward,
      title: "Skip Backward 1s",
      className: "h-8 w-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded transition-colors"
    },
    /* @__PURE__ */ React.createElement(SkipBack, { size: 16 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: togglePlayPause,
      disabled: !videoPath,
      title: isPlaying ? "Pause" : "Play",
      className: "h-10 w-10 flex items-center justify-center bg-primary hover:bg-primary/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    },
    isPlaying ? /* @__PURE__ */ React.createElement(Pause, { size: 18, fill: "currentColor" }) : /* @__PURE__ */ React.createElement(Play, { size: 18, fill: "currentColor" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: skipForward,
      title: "Skip Forward 1s",
      className: "h-8 w-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded transition-colors"
    },
    /* @__PURE__ */ React.createElement(SkipForward, { size: 16 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex justify-center min-w-0" }, centerControls && /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-2xl" }, centerControls)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "h-8 w-24 bg-black/20 rounded overflow-hidden flex items-center border border-white/5 hidden xl:flex" }, /* @__PURE__ */ React.createElement(
    AudioVisualizer,
    {
      videoElement: videoRef.current,
      width: 96,
      height: 32,
      barColor: "#06b6d4"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "text-right hidden lg:block" }, /* @__PURE__ */ React.createElement("div", { className: "font-mono text-sm text-white/90" }, Math.floor(currentFrame / fps / 60).toString().padStart(2, "0"), ":", Math.floor(currentFrame / fps % 60).toString().padStart(2, "0"), ":", (currentFrame % fps).toString().padStart(2, "0")), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-white/40" }, "Frame ", currentFrame)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Volume2, { size: 16, className: "text-white/60" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "1",
      step: "0.01",
      value: localVolume,
      title: "Volume",
      placeholder: "Volume",
      onChange: (e) => {
        const newVolume = parseFloat(e.target.value);
        setLocalVolume(newVolume);
        if (videoRef.current) {
          videoRef.current.volume = newVolume;
        }
      },
      className: "w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    }
  ))))));
};
export {
  VideoPlayer
};
