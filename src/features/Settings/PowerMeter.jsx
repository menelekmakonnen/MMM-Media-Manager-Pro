import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
const PowerMeter = ({
  label = "System Power",
  color = "#8b5cf6",
  value: controlledValue
}) => {
  const [internalValue, setInternalValue] = useState(0);
  const displayValue = controlledValue !== void 0 ? controlledValue : internalValue;
  useEffect(() => {
    if (controlledValue !== void 0) return;
    const interval = setInterval(() => {
      setInternalValue((prev) => {
        const change = (Math.random() - 0.5) * 10;
        const newValue = prev + change;
        return Math.max(20, Math.min(98, newValue));
      });
    }, 1e3);
    return () => clearInterval(interval);
  }, [controlledValue]);
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - displayValue / 100 * circumference;
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex items-center justify-center", style: { width: size, height: size } }, /* @__PURE__ */ React.createElement("svg", { className: "transform -rotate-90 w-full h-full" }, /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: size / 2,
      cy: size / 2,
      r: radius,
      stroke: "currentColor",
      strokeWidth,
      fill: "transparent",
      className: "text-black/30"
    }
  ), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: size / 2,
      cy: size / 2,
      r: radius,
      stroke: color,
      strokeWidth,
      fill: "transparent",
      strokeDasharray: circumference,
      strokeDashoffset: offset,
      strokeLinecap: "round",
      className: "transition-all duration-1000 ease-out"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold font-mono" }, Math.round(displayValue), "%"), /* @__PURE__ */ React.createElement(Activity, { size: 16, className: "text-white/40 mt-1 animate-pulse" }))), /* @__PURE__ */ React.createElement("span", { className: "mt-3 text-xs font-medium uppercase tracking-wider text-white/60" }, label));
};
export {
  PowerMeter
};
