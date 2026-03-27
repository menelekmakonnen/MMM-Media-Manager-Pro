import React, { useEffect, useRef } from "react";
const AudioVisualizer = ({
  videoElement,
  width = 200,
  height = 40,
  barColor = "#06b6d4"
  // Cyan/Teal secondary color
}) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(void 0);
  useEffect(() => {
    if (!videoElement) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (!sourceRef.current) {
        try {
          sourceRef.current = ctx.createMediaElementSource(videoElement);
        } catch (e) {
          console.warn("MediaElementSource attached?", e);
          return;
        }
      }
      if (!analyserRef.current && sourceRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 64;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
      const render = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");
        if (!canvasCtx) return;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, width, height);
        const barWidth = width / bufferLength * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 255 * height;
          canvasCtx.fillStyle = barColor;
          const y = (height - barHeight) / 2;
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, y, barWidth - 1, barHeight, 2);
          canvasCtx.fill();
          x += barWidth;
        }
        animationRef.current = requestAnimationFrame(render);
      };
      render();
    } catch (error) {
      console.error("Audio Visualizer Init Error:", error);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [videoElement, width, height, barColor]);
  return /* @__PURE__ */ React.createElement(
    "canvas",
    {
      ref: canvasRef,
      width,
      height,
      className: "opacity-80"
    }
  );
};
export {
  AudioVisualizer
};
