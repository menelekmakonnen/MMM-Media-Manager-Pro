import React, { useEffect } from "react";
import { getGridLayout } from "../../utils/editorUtils/gridTemplates";
import { VideoPlayer } from "./VideoPlayer";
import { useProjectStore } from "../../stores/projectStore";
const GridPlayer = ({ grid, currentFrame, isPlaying, onFrameChange, onCellClick, selectedCellId }) => {
  const { settings } = useProjectStore();
  useEffect(() => {
    if (!isPlaying || !onFrameChange) return;
    let animationFrameId;
    let lastTime = performance.now();
    const frameDuration = 1e3 / settings.fps;
    const loop = (time) => {
      const deltaTime = time - lastTime;
      if (deltaTime >= frameDuration) {
        const framesToAdvance = Math.floor(deltaTime / frameDuration);
        let nextFrame = currentFrame + framesToAdvance;
        if (nextFrame >= grid.endFrame) {
          nextFrame = 0;
        }
        onFrameChange(nextFrame);
        lastTime = time - deltaTime % frameDuration;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentFrame, settings.fps, grid.endFrame, onFrameChange]);
  const layouts = getGridLayout(grid.numCells, grid.gridFormat);
  return /* @__PURE__ */ React.createElement("div", { className: "relative w-full h-full bg-black flex items-center justify-center overflow-hidden" }, grid.backgroundMode === "blur" && grid.cells[0]?.clip && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 blur-xl opacity-50 transform scale-110 pointer-events-none" }, /* @__PURE__ */ React.createElement(
    VideoPlayer,
    {
      videoPath: grid.cells[0].clip.path,
      currentFrame,
      fps: settings.fps,
      bgOnly: true,
      hideTransport: true,
      volume: 0,
      onFrameChange: () => {
      }
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "w-full h-full flex", style: { aspectRatio: settings.aspectRatio.replace(":", "/") } }, grid.cells.slice(0, grid.numCells).map((cell, index) => {
    const layout = layouts[index];
    if (!layout) return null;
    if (!cell.clip) {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: cell.id,
          onClick: () => onCellClick && onCellClick(cell.id),
          className: `absolute border bg-white/5 flex flex-col items-center justify-center text-white/30 text-xs cursor-pointer transition-colors ${selectedCellId === cell.id ? "border-primary ring-1 ring-primary/50 bg-primary/10" : "border-black/50 hover:bg-white/10"}`,
          style: {
            left: `${layout.x * 100}%`,
            top: `${layout.y * 100}%`,
            width: `${layout.width * 100}%`,
            height: `${layout.height * 100}%`
          }
        },
        /* @__PURE__ */ React.createElement("div", null, "Cell ", index + 1),
        /* @__PURE__ */ React.createElement("div", { className: "text-[9px]" }, "Click to Assign Media")
      );
    }
    const clipLocalFrame = Math.floor(currentFrame * cell.clip.speed + (cell.clip.trimStartFrame || 0));
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: cell.id,
        onClick: () => onCellClick && onCellClick(cell.id),
        className: `absolute overflow-hidden cursor-pointer transition-all ${selectedCellId === cell.id ? "border-2 border-primary ring-2 ring-primary/50 z-10" : "border border-black/50 hover:border-white/50 z-0"}`,
        style: {
          left: `${layout.x * 100}%`,
          top: `${layout.y * 100}%`,
          width: `${layout.width * 100}%`,
          height: `${layout.height * 100}%`
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 pointer-events-none z-20" }),
      " ",
      /* @__PURE__ */ React.createElement(
        VideoPlayer,
        {
          videoPath: cell.clip.type === "video" ? cell.clip.path : void 0,
          currentFrame: clipLocalFrame,
          fps: settings.fps,
          hideTransport: true,
          volume: cell.clip.isMuted ? 0 : cell.clip.volume / 100,
          playbackSpeed: cell.clip.speed,
          zoomLevel: cell.clip.zoomLevel,
          zoomOrigin: cell.clip.zoomOrigin,
          centerControls: null,
          onFrameChange: () => {
          }
        }
      )
    );
  })));
};
export {
  GridPlayer
};
