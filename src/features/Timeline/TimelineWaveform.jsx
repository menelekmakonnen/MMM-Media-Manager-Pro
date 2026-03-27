import React, { useEffect, useRef, useState, memo } from "react";
const waveformCache = /* @__PURE__ */ new Map();
const TimelineWaveform = memo(({ path, width, height, color = "#8b5cf6", beatMarkers, onAudioLoaded }) => {
  const canvasRef = useRef(null);
  const [audioData, setAudioData] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    const loadAudio = async () => {
      if (waveformCache.has(path)) {
        setAudioData(waveformCache.get(path));
        setLoading(false);
        return;
      }
      try {
        const result = await window.ipcRenderer.readFileBuffer(path);
        if (!result.success) {
          if (result.isTooLarge) {
            if (isMounted) {
              setAudioData(null);
              setLoading(false);
              waveformCache.set(path, new Float32Array(0));
            }
            return;
          }
          throw new Error(result.error || "Empty buffer");
        }
        if (!result.buffer) {
          throw new Error("Empty buffer");
        }
        const arrayBuffer = result.buffer.buffer;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (isMounted) {
          setDuration(audioBuffer.duration);
          if (onAudioLoaded) onAudioLoaded(audioBuffer);
        }
        const rawData = audioBuffer.getChannelData(0);
        const samples = 1e3;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j]);
          }
          filteredData[i] = sum / blockSize;
        }
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalizedData = filteredData.map((n) => n * multiplier);
        if (isMounted) {
          waveformCache.set(path, normalizedData);
          setAudioData(normalizedData);
          setLoading(false);
        }
        audioContext.close();
      } catch (error) {
        const isLargeFileError = error?.message?.includes("File size") && error?.message?.includes("2 GiB");
        if (!isLargeFileError) {
          console.error("Failed to load waveform:", error);
        }
        if (isMounted) {
          setLoading(false);
          setAudioData(null);
        }
      }
    };
    setLoading(true);
    loadAudio();
    return () => {
      isMounted = false;
    };
  }, [path]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!audioData) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waveform skipped (File > 2GB)", width / 2, height / 2 + 4);
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    const barWidth = width / audioData.length;
    audioData.forEach((val, index) => {
      const x = index * barWidth;
      const barHeight = val * height;
      const y = (height - barHeight) / 2;
      ctx.rect(x, y, barWidth, barHeight);
    });
    ctx.fill();
    if (beatMarkers && beatMarkers.length > 0 && duration > 0) {
      ctx.fillStyle = "rgba(52, 211, 153, 0.8)";
      beatMarkers.forEach((marker) => {
        const x = marker.time / duration * width;
        if (x >= 0 && x <= width) {
          ctx.fillRect(x, 0, 1, height);
          ctx.beginPath();
          ctx.arc(x, height - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [audioData, width, height, color]);
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex items-center justify-center opacity-20 text-xs text-white/40" }, "Loading waveform...");
  return /* @__PURE__ */ React.createElement(
    "canvas",
    {
      ref: canvasRef,
      width,
      height,
      className: "w-full h-full opacity-50"
    }
  );
});
export {
  TimelineWaveform
};
