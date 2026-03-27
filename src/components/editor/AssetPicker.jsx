import React, { useState } from "react";
import { Zap, Palette, X } from "lucide-react";
import { useAssetStore } from "../../stores/assetStore";
import { useClipStore } from "../../stores/clipStore";
const AssetPicker = ({ clipId, onClose }) => {
  const { speedRamps, effects } = useAssetStore();
  const { updateClip } = useClipStore();
  const [activeTab, setActiveTab] = useState("speed");
  const applySpeedRamp = (rampId) => {
    updateClip(clipId, { speedRampId: rampId });
    console.log(`[AssetPicker] Applied speed ramp ${rampId} to clip ${clipId}`);
  };
  const applyEffect = (effectId) => {
    const clip2 = useClipStore.getState().clips.find((c) => c.id === clipId);
    const currentEffects = clip2?.effectIds || [];
    if (currentEffects.includes(effectId)) {
      updateClip(clipId, { effectIds: currentEffects.filter((id) => id !== effectId) });
    } else {
      updateClip(clipId, { effectIds: [...currentEffects, effectId] });
    }
    console.log(`[AssetPicker] Toggled effect ${effectId} on clip ${clipId}`);
  };
  const clip = useClipStore.getState().clips.find((c) => c.id === clipId);
  const appliedEffects = clip?.effectIds || [];
  const appliedRamp = clip?.speedRampId;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#0a0a14] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 border-b border-white/10 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-white" }, "Apply Assets to Clip"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-white/10" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setActiveTab("speed"),
      className: `flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${activeTab === "speed" ? "bg-primary/20 text-primary border-b-2 border-primary" : "text-white/40 hover:text-white/60"}`
    },
    /* @__PURE__ */ React.createElement(Zap, { size: 18 }),
    "Speed Ramps"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setActiveTab("effects"),
      className: `flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-colors ${activeTab === "effects" ? "bg-primary/20 text-primary border-b-2 border-primary" : "text-white/40 hover:text-white/60"}`
    },
    /* @__PURE__ */ React.createElement(Palette, { size: 18 }),
    "Effects"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-6 custom-scrollbar" }, activeTab === "speed" ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, speedRamps.map((ramp) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: ramp.id,
      onClick: () => applySpeedRamp(ramp.id),
      className: `p-4 rounded-lg border transition-all text-left ${appliedRamp === ramp.id ? "bg-primary/20 border-primary/60 shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 hover:border-primary/40 hover:bg-white/10"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Zap, { size: 16, className: appliedRamp === ramp.id ? "text-primary" : "text-white/40" }), /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-white" }, ramp.name)),
    /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/60" }, ramp.description),
    appliedRamp === ramp.id && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-primary font-medium" }, "\u2713 Applied")
  ))) : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, effects.map((effect) => {
    const isApplied = appliedEffects.includes(effect.id);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: effect.id,
        onClick: () => applyEffect(effect.id),
        className: `p-4 rounded-lg border transition-all text-left ${isApplied ? "bg-primary/20 border-primary/60 shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 hover:border-primary/40 hover:bg-white/10"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Palette, { size: 16, className: isApplied ? "text-primary" : "text-white/40" }), /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-white" }, effect.name)),
      /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/60" }, effect.description),
      isApplied && /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-primary font-medium" }, "\u2713 Applied")
    );
  }))), /* @__PURE__ */ React.createElement("div", { className: "p-4 border-t border-white/10 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
    },
    "Done"
  ))));
};
export {
  AssetPicker
};
