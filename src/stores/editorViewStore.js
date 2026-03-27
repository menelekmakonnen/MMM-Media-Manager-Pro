import { create } from "zustand";
const useViewStore = create((set) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab })
}));
export {
  useViewStore
};
