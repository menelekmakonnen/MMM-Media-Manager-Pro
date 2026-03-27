import { create } from "zustand";
import rampFlashIn from "../assets/speed-ramps/ramp_flash_in.json";
import fxBwContrast from "../assets/effects/fx_bw_contrast.json";
const speedRampMap = {
  "ramp_flash_in": rampFlashIn
};
const effectMap = {
  "fx_bw_contrast": fxBwContrast
};
const useAssetStore = create(() => ({
  speedRamps: Object.values(speedRampMap),
  effects: Object.values(effectMap),
  isLoading: false,
  getAsset: (id) => {
    return speedRampMap[id] || effectMap[id];
  },
  getSpeedRamp: (id) => {
    return speedRampMap[id];
  },
  getEffect: (id) => {
    return effectMap[id];
  }
}));
export {
  useAssetStore
};
