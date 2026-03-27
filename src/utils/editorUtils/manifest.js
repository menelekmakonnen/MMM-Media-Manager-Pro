import { DEFAULT_FPS } from "./time";
export const MANIFEST_VERSION = "1.0";
function exportManifest(project, clips) {
  const sanitizedClips = clips.map((c) => ({
    ...c,
    startFrame: Math.floor(c.startFrame),
    endFrame: Math.floor(c.endFrame),
    sourceDurationFrames: Math.floor(c.sourceDurationFrames),
    trimStartFrame: Math.floor(c.trimStartFrame),
    trimEndFrame: Math.floor(c.trimEndFrame),
    // Ensure arrays are initialized
    effectIds: c.effectIds || []
  }));
  const manifest = {
    version: "1.0",
    project: {
      ...project,
      // Ensure reserved fields
      fps: project.fps || DEFAULT_FPS,
      projectType: project.projectType || "manual"
    },
    clips: sanitizedClips
  };
  return manifest;
}
function validateManifest(json) {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid manifest JSON");
  }
  if (json.version !== "1.0") {
    throw new Error(`Unsupported manifest version: ${json.version}`);
  }
  if (!json.project || !json.clips || !Array.isArray(json.clips)) {
    throw new Error("Manifest missing 'project' or 'clips' array");
  }
  return json;
}
function downloadManifest(manifest) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${manifest.project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mmm.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export {
  downloadManifest,
  exportManifest,
  validateManifest,
  exportManifest as createManifestFromState
};
