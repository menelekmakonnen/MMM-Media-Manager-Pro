const DEFAULT_FPS = 30;
function secondsToFrames(seconds, fps = DEFAULT_FPS) {
  return Math.floor(seconds * fps + 1e-4);
}
function framesToSeconds(frames, fps = DEFAULT_FPS) {
  return frames / fps;
}
function formatTimecode(frames, fps = DEFAULT_FPS) {
  const totalSeconds = Math.floor(frames / fps);
  const frameRemainder = Math.floor(frames % fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frameRemainder)}`;
}
function verifyFrameConsistency(frames, fps = DEFAULT_FPS) {
  const seconds = framesToSeconds(frames, fps);
  const backToFrames = secondsToFrames(seconds, fps);
  return backToFrames === frames;
}
export {
  DEFAULT_FPS,
  formatTimecode,
  framesToSeconds,
  secondsToFrames,
  verifyFrameConsistency
};
