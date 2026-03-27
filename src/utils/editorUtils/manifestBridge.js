import { useProjectStore } from "../../stores/projectStore";
import { useClipStore } from "../../stores/clipStore";
import { MANIFEST_VERSION } from "./manifest";
import { v4 as uuidv4 } from "uuid";
const generateManifest = () => {
  const { settings } = useProjectStore.getState();
  const { clips } = useClipStore.getState();
  const manifestClips = clips.map((clip) => ({
    id: clip.id,
    file: clip.path,
    // In real app, might want relative path if possible
    type: clip.type,
    // 'text' not yet in ClipType but in Manifest
    timelineIn: clip.startFrame,
    timelineOut: clip.endFrame,
    sourceIn: clip.trimStartFrame,
    sourceOut: clip.trimEndFrame,
    track: clip.track || 0,
    speed: clip.speed,
    volume: clip.volume,
    reversed: clip.reversed,
    ...clip.type === "grid" && {
      gridFormat: clip.gridFormat,
      numCells: clip.numCells,
      backgroundMode: clip.backgroundMode,
      cells: clip.cells.map((cell) => ({
        id: cell.id,
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        clip: cell.clip ? {
          id: cell.clip.id,
          file: cell.clip.path,
          type: cell.clip.type,
          timelineIn: cell.clip.startFrame,
          timelineOut: cell.clip.endFrame,
          sourceIn: cell.clip.trimStartFrame,
          sourceOut: cell.clip.trimEndFrame,
          speed: cell.clip.speed,
          volume: cell.clip.volume,
          metadata: { durationFrames: cell.clip.sourceDurationFrames }
        } : null
      }))
    }
  }));
  return {
    manifestVersion: MANIFEST_VERSION,
    project: {
      name: settings.name,
      resolution: settings.resolution,
      fps: settings.fps,
      seed: "default-seed",
      // TODO: Add seed to project settings
      schemaVersion: MANIFEST_VERSION
    },
    clips: manifestClips
  };
};
const loadManifestToStore = (manifest) => {
  const { updateSettings, setResolution } = useProjectStore.getState();
  const { setClips } = useClipStore.getState();
  updateSettings({
    name: manifest.project.name,
    fps: manifest.project.fps
  });
  const aspectRatio = manifest.project.resolution.width / manifest.project.resolution.height;
  if (Math.abs(aspectRatio - 16 / 9) < 0.01) setResolution("16:9");
  else if (Math.abs(aspectRatio - 9 / 16) < 0.01) setResolution("9:16");
  else if (Math.abs(aspectRatio - 1) < 0.01) setResolution("1:1");
  else if (Math.abs(aspectRatio - 4 / 3) < 0.01) setResolution("4:3");
  else setResolution("16:9");
  const restoredClips = manifest.clips.map((mClip) => ({
    id: mClip.id || uuidv4(),
    type: mClip.type === "video" || mClip.type === "audio" || mClip.type === "image" ? mClip.type : "video",
    path: mClip.file,
    filename: mClip.file.split(/[/\\]/).pop() || mClip.file,
    // Extract filename
    startFrame: mClip.timelineIn,
    endFrame: mClip.timelineOut,
    sourceDurationFrames: 9999,
    // Unknown without file analysis
    trimStartFrame: mClip.sourceIn,
    trimEndFrame: mClip.sourceOut,
    track: mClip.track,
    speed: mClip.speed || 1,
    volume: mClip.volume ?? 1,
    reversed: mClip.reversed || false,
    locked: false,
    ...mClip.type === "grid" && {
      gridFormat: mClip.gridFormat || "horizontal",
      numCells: mClip.numCells || 2,
      backgroundMode: mClip.backgroundMode || "blur",
      cells: (mClip.cells || []).map((cell) => ({
        id: cell.id || uuidv4(),
        x: cell.x || 0,
        y: cell.y || 0,
        width: cell.width || 0,
        height: cell.height || 0,
        clip: cell.clip ? {
          id: cell.clip.id || uuidv4(),
          path: cell.clip.file,
          filename: cell.clip.file.split(/[/\\]/).pop() || cell.clip.file,
          type: cell.clip.type,
          startFrame: cell.clip.timelineIn,
          endFrame: cell.clip.timelineOut,
          sourceDurationFrames: cell.clip.metadata?.durationFrames || 9999,
          trimStartFrame: cell.clip.sourceIn,
          trimEndFrame: cell.clip.sourceOut,
          speed: cell.clip.speed || 1,
          volume: cell.clip.volume ?? 1,
          reversed: false,
          locked: false
        } : null
      }))
    }
  }));
  setClips(restoredClips);
};
export {
  generateManifest,
  loadManifestToStore
};
