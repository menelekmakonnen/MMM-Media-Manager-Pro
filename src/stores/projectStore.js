import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
const generateProjectName = () => {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} MMMedia Project ${hours}:${minutes}`;
};
const RESOLUTIONS = {
  "9:16": { width: 1080, height: 1920, label: "9:16 Vertical/Mobile" },
  "16:9": { width: 1920, height: 1080, label: "16:9 Widescreen" },
  "1:1": { width: 1080, height: 1080, label: "1:1 Square" },
  "4:3": { width: 1440, height: 1080, label: "4:3 Standard" },
  "21:9": { width: 2560, height: 1080, label: "21:9 Ultrawide" }
};
const useProjectStore = create()(
  persist(
    (set) => ({
      settings: {
        id: uuidv4(),
        name: generateProjectName(),
        resolution: RESOLUTIONS["9:16"],
        // Default to mobile
        aspectRatio: "9:16",
        fps: 30,
        backgroundFillMode: "blur",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastModified: (/* @__PURE__ */ new Date()).toISOString()
      },
      savedEdits: [],
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates, lastModified: (/* @__PURE__ */ new Date()).toISOString() }
      })),
      addEdit: (edit) => set((state) => ({ savedEdits: [...(state.savedEdits || []), edit] })),
      removeEdit: (editId) => set((state) => ({ savedEdits: (state.savedEdits || []).filter(e => e.id !== editId) })),
      loadEdits: (edits) => set({ savedEdits: edits }),
      setResolution: (preset) => set((state) => ({
        settings: {
          ...state.settings,
          resolution: RESOLUTIONS[preset],
          aspectRatio: preset,
          lastModified: (/* @__PURE__ */ new Date()).toISOString()
        }
      })),
      setAspectRatio: (ratio) => set((state) => {
        const baseHeight = 1080;
        let width = baseHeight;
        let height = baseHeight;
        switch (ratio) {
          case "16:9":
            width = 1920;
            height = 1080;
            break;
          case "9:16":
            width = 1080;
            height = 1920;
            break;
          case "4:3":
            width = 1440;
            height = 1080;
            break;
          case "1:1":
            width = 1080;
            height = 1080;
            break;
          case "21:9":
            width = 2560;
            height = 1080;
            break;
        }
        return {
          settings: {
            ...state.settings,
            aspectRatio: ratio,
            resolution: {
              width,
              height,
              label: `${width}x${height}`
            },
            lastModified: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }),
      setSeed: (seed) => set((state) => ({
        settings: {
          ...state.settings,
          seed,
          lastModified: (/* @__PURE__ */ new Date()).toISOString()
        }
      })),
      createNewProject: () => set({
        settings: {
          id: uuidv4(),
          name: generateProjectName(),
          resolution: RESOLUTIONS["9:16"],
          aspectRatio: "9:16",
          fps: 30,
          backgroundFillMode: "blur",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastModified: (/* @__PURE__ */ new Date()).toISOString(),
          sequenceViewSplitHeight: 50,
          sequenceLoop: false
        },
        savedEdits: []
      })
    }),
    {
      name: "mmmedia-project-storage",
      // unique name
      storage: createJSONStorage(() => localStorage)
    }
  )
);
export {
  useProjectStore
};
