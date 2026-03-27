import { create } from "zustand";
import { DEFAULT_FPS, secondsToFrames } from "../utils/editorUtils/time";
import { SeededRandom, generateSeed } from "../utils/editorUtils/random";
import { useProjectStore } from "./projectStore";
import { v4 as uuidv4 } from "uuid";
import { analyzeAudio } from "../utils/editorUtils/audioAnalysis";
const useClipStore = create((set, get) => ({
  clips: [],
  selectedClipIds: [],
  selectedSegment: null,
  globalMute: false,
  globalPlaybackSpeed: 1,
  transitionStrategy: "cut",
  setClips: (clips) => set({ clips }),
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  removeClip: (id) => set((state) => ({
    clips: state.clips.filter((c) => c.id !== id),
    selectedClipIds: state.selectedClipIds.filter((cid) => cid !== id)
  })),
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
  selectClip: (id) => set((state) => ({
    selectedClipIds: state.selectedClipIds.includes(id) ? state.selectedClipIds : [...state.selectedClipIds, id]
  })),
  deselectClip: (id) => set((state) => ({
    selectedClipIds: state.selectedClipIds.filter((cid) => cid !== id)
  })),
  selectSingleClip: (id) => {
    const clip = get().clips.find((c) => c.id === id);
    set({
      selectedClipIds: [id],
      // Use TRIM frames (Source) for the segment selector
      selectedSegment: clip ? {
        clipId: clip.id,
        startFrame: clip.trimStartFrame ?? 0,
        endFrame: clip.trimEndFrame ?? (clip.sourceDurationFrames || 0)
      } : null
    });
  },
  // New implementations
  duplicateClip: (id) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    const newClip = {
      ...clip,
      id: crypto.randomUUID(),
      filename: `${clip.filename} (copy)`
    };
    set((state) => ({ clips: [...state.clips, newClip] }));
  },
  deleteClip: (id) => {
    get().removeClip(id);
  },
  moveClip: (id, direction) => set((state) => {
    const index = state.clips.findIndex((c) => c.id === id);
    if (index === -1) return state;
    const newClips = [...state.clips];
    if (direction === "up" && index > 0) {
      const temp = newClips[index - 1];
      newClips[index - 1] = newClips[index];
      newClips[index] = temp;
    } else if (direction === "down" && index < newClips.length - 1) {
      const temp = newClips[index + 1];
      newClips[index + 1] = newClips[index];
      newClips[index] = temp;
    }
    return { clips: newClips };
  }),
  randomizeSegment: (id) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    if (!clip.sourceDurationFrames || clip.sourceDurationFrames < DEFAULT_FPS) {
      console.warn("[ClipStore] Cannot randomize: invalid source duration", clip.sourceDurationFrames);
      return;
    }
    if (clip.isPinned) {
      console.warn("[ClipStore] Cannot randomize: clip is pinned", clip.id);
      return;
    }
    if (clip.locked) {
      console.warn("[ClipStore] Cannot randomize: clip is locked", clip.id);
      return;
    }
    const seed = useProjectStore.getState().settings.seed || generateSeed();
    const rng = new SeededRandom(seed + id);
    const maxDuration = clip.sourceDurationFrames;
    const segmentDuration = (clip.trimEndFrame || 0) - (clip.trimStartFrame || 0);
    if (segmentDuration >= maxDuration) return;
    const maxStart = Math.max(0, maxDuration - segmentDuration);
    const randomStart = rng.randInt(0, maxStart);
    const randomEnd = randomStart + segmentDuration;
    console.log("[ClipStore] Randomizing segment:", { from: clip.trimStartFrame, to: randomStart });
    set((state) => {
      const updatedSelectedSegment = state.selectedSegment?.clipId === id ? { ...state.selectedSegment, startFrame: randomStart, endFrame: randomEnd } : state.selectedSegment;
      return {
        clips: state.clips.map(
          (c) => c.id === id ? {
            ...c,
            trimStartFrame: randomStart,
            trimEndFrame: randomEnd
            // Timeline start stays same, timeline end stays same (Slip)
          } : c
        ),
        selectedSegment: updatedSelectedSegment
      };
    });
  },
  // NEW: Randomizes both duration and position (The "Flux" feature)
  randomizeClipDuration: (id) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip || !clip.sourceDurationFrames) return;
    if (clip.isPinned || clip.locked) return;
    const seed = useProjectStore.getState().settings.seed || generateSeed();
    const rng = new SeededRandom(seed + id + "_duration");
    const fps = DEFAULT_FPS;
    const minDuration = 1 * fps;
    const maxDuration = Math.min(clip.sourceDurationFrames, 10 * fps);
    if (maxDuration <= minDuration) return;
    const newDuration = rng.randInt(minDuration, maxDuration + 1);
    const maxStart = Math.max(0, clip.sourceDurationFrames - newDuration);
    const newStart = rng.randInt(0, maxStart);
    const newEnd = newStart + newDuration;
    set((state) => {
      const updatedSelectedSegment = state.selectedSegment?.clipId === id ? { ...state.selectedSegment, startFrame: newStart, endFrame: newEnd } : state.selectedSegment;
      return {
        clips: state.clips.map(
          (c) => c.id === id ? {
            ...c,
            trimStartFrame: newStart,
            trimEndFrame: newEnd,
            endFrame: c.startFrame + newDuration
            // Sync timeline duration
          } : c
        ),
        selectedSegment: updatedSelectedSegment
      };
    });
  },
  setGlobalFlux: () => {
    const { clips, selectedSegment } = get();
    if (clips.length === 0) return;
    const fps = DEFAULT_FPS;
    const targetSeconds = useProjectStore.getState().settings.targetDurationSeconds;
    let newClips = clips.map((clip) => ({ ...clip }));
    const fixedClips = newClips.filter((c) => c.isPinned || c.locked);
    let mutableClips = newClips.filter((c) => !c.isPinned && !c.locked);
    const fixedFrames = fixedClips.reduce((sum, c) => sum + ((c.trimEndFrame || 0) - (c.trimStartFrame || 0)), 0);
    if (targetSeconds !== void 0) {
      const targetFrames = Math.max(0, targetSeconds * fps - fixedFrames);
      const minFrames = Math.max(Math.floor(0.25 * fps), 1);
      const maxSources = mutableClips.map((clip) => {
        return clip.sourceDurationFrames || 1800;
      });
      let allocatedFrames = mutableClips.map(() => 0);
      let remainingTarget = targetFrames;
      mutableClips.forEach((_, i) => {
        const alloc = Math.min(minFrames, maxSources[i]);
        allocatedFrames[i] = alloc;
        remainingTarget -= alloc;
      });
      let canTakeMore = true;
      while (remainingTarget > 0 && canTakeMore) {
        canTakeMore = false;
        let absorbCount = 0;
        for (let i = 0; i < mutableClips.length; i++) {
          if (allocatedFrames[i] < maxSources[i]) absorbCount++;
        }
        if (absorbCount === 0) break;
        const slice = Math.max(1, Math.floor(remainingTarget / absorbCount));
        for (let i = 0; i < mutableClips.length && remainingTarget > 0; i++) {
          const headroom = maxSources[i] - allocatedFrames[i];
          if (headroom > 0) {
            canTakeMore = true;
            const take = Math.min(slice, headroom, remainingTarget);
            allocatedFrames[i] += take;
            remainingTarget -= take;
          }
        }
      }
      mutableClips = mutableClips.map((clip, i) => {
        const maxSource = maxSources[i];
        const finalDuration = allocatedFrames[i];
        const safeDuration = Math.min(finalDuration, maxSource);
        const maxStart = Math.max(0, maxSource - safeDuration);
        const newStart = Math.floor(Math.random() * maxStart);
        const newEnd = newStart + safeDuration;
        return {
          ...clip,
          trimStartFrame: newStart,
          trimEndFrame: newEnd,
          sourceDurationFrames: maxSource,
          endFrame: clip.startFrame + safeDuration
        };
      });
    } else {
      mutableClips = mutableClips.map((clip) => {
        const effectiveMaxDuration = clip.sourceDurationFrames || Math.max(clip.endFrame, 1800);
        const minDuration = Math.max(Math.floor(0.25 * fps), 1);
        const maxDuration = Math.min(effectiveMaxDuration, 10 * fps);
        if (maxDuration <= minDuration) return clip;
        const newDuration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
        const maxStart = Math.max(0, effectiveMaxDuration - newDuration);
        const newStart = Math.floor(Math.random() * maxStart);
        const newEnd = newStart + newDuration;
        return {
          ...clip,
          trimStartFrame: newStart,
          trimEndFrame: newEnd,
          sourceDurationFrames: effectiveMaxDuration,
          endFrame: clip.startFrame + newDuration
        };
      });
    }
    const combinedClips = [...fixedClips, ...mutableClips].sort((a, b) => a.startFrame - b.startFrame);
    let currentFrame = 0;
    const finalizedClips = combinedClips.map((clip) => {
      const duration = (clip.trimEndFrame || 0) - (clip.trimStartFrame || 0);
      const start = currentFrame;
      const end = start + duration;
      currentFrame = end;
      return {
        ...clip,
        startFrame: start,
        endFrame: end
      };
    });
    let newSelectedSegment = selectedSegment;
    if (selectedSegment) {
      const updatedClip = finalizedClips.find((c) => c.id === selectedSegment.clipId);
      if (updatedClip) {
        newSelectedSegment = {
          ...selectedSegment,
          startFrame: updatedClip.trimStartFrame ?? 0,
          endFrame: updatedClip.trimEndFrame ?? 0
        };
      }
    }
    set({ clips: finalizedClips, selectedSegment: newSelectedSegment });
  },
  pinClip: (id, pinned) => {
    set((state) => ({
      clips: state.clips.map((c) => c.id === id ? { ...c, isPinned: pinned } : c)
    }));
  },
  lockClip: (id, locked) => {
    set((state) => ({
      clips: state.clips.map((c) => c.id === id ? { ...c, locked } : c)
    }));
  },
  setClipVolume: (id, volume) => {
    set((state) => ({
      clips: state.clips.map((c) => c.id === id ? { ...c, volume: Math.max(0, Math.min(100, volume)) } : c)
    }));
  },
  setClipMuted: (id, muted) => {
    set((state) => ({
      clips: state.clips.map((c) => c.id === id ? { ...c, isMuted: muted } : c)
    }));
  },
  setGlobalMute: (muted) => set({ globalMute: muted }),
  selectSegment: (clipId, startFrame, endFrame) => {
    set({ selectedSegment: { clipId, startFrame, endFrame } });
  },
  clearSegmentSelection: () => set({ selectedSegment: null }),
  // Replaces moveSegment for Source Trim updates
  updateClipSource: (clipId, newTrimStart, newTrimEnd) => {
    const { selectedSegment } = get();
    const newDuration = newTrimEnd - newTrimStart;
    set((state) => ({
      clips: state.clips.map(
        (c) => c.id === clipId ? {
          ...c,
          trimStartFrame: newTrimStart,
          trimEndFrame: newTrimEnd,
          endFrame: c.startFrame + newDuration
          // Sync timeline duration
        } : c
      ),
      // Loop back to selected segment if matches
      selectedSegment: selectedSegment && selectedSegment.clipId === clipId ? {
        ...selectedSegment,
        startFrame: newTrimStart,
        endFrame: newTrimEnd
      } : selectedSegment
    }));
  },
  moveSegment: (clipId, newStartFrame) => {
    const { selectedSegment } = get();
    if (!selectedSegment) return;
    const duration = selectedSegment.endFrame - selectedSegment.startFrame;
    get().updateClipSource(clipId, newStartFrame, newStartFrame + duration);
  },
  shuffleClips: () => {
    const { clips } = get();
    const seed = useProjectStore.getState().settings.seed || generateSeed();
    const rng = new SeededRandom(seed);
    const canShuffle = (c) => c.origin !== "manual" && !c.locked && !c.isPinned;
    const shuffleableClips = clips.filter(canShuffle);
    if (shuffleableClips.length < 2) return;
    const shuffled = rng.shuffle(shuffleableClips);
    let shuffledIndex = 0;
    const newClips = clips.map((clip) => {
      if (!canShuffle(clip)) return clip;
      return shuffled[shuffledIndex++];
    });
    set({ clips: newClips });
  },
  swapClip: (id) => {
    const { clips } = get();
    const sourceIndex = clips.findIndex((c) => c.id === id);
    if (sourceIndex === -1) return;
    const sourceClip = clips[sourceIndex];
    if (sourceClip.isPinned) {
      console.warn("Cannot swap pinned clip");
      return;
    }
    const validTargets = clips.map((c, i) => ({ c, i })).filter(({ c, i }) => !c.isPinned && i !== sourceIndex);
    if (validTargets.length === 0) return;
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    const newClips = [...clips];
    newClips[sourceIndex] = target.c;
    newClips[target.i] = sourceClip;
    set({ clips: newClips });
  },
  chaos: () => {
    get().shuffleClips();
    get().setGlobalFlux();
  },
  // Phase 3: Speed controls
  setClipSpeed: (id, speed) => {
    set((state) => ({
      clips: state.clips.map((clip) => {
        if (clip.id === id) {
          const segmentLength = (clip.trimEndFrame || 0) - (clip.trimStartFrame || 0);
          const newDuration = Math.round(segmentLength / speed);
          return { ...clip, speed, endFrame: clip.startFrame + newDuration };
        }
        return clip;
      })
    }));
    get().magnetizeClips();
  },
  setGlobalPlaybackSpeed: (globalPlaybackSpeed) => set({ globalPlaybackSpeed }),
  setClipFolded: (id, isFolded) => set((state) => ({
    clips: state.clips.map(
      (clip) => clip.id === id ? { ...clip, isFolded } : clip
    )
  })),
  setAllClipsFolded: (isFolded) => set((state) => ({
    clips: state.clips.map((clip) => ({ ...clip, isFolded }))
  })),
  // Grid implementations
  createGrid: (numCells, gridFormat, initialClip) => {
    const newGrid = {
      id: uuidv4(),
      type: "grid",
      path: "",
      filename: `Grid ${numCells}x`,
      startFrame: 0,
      endFrame: 150,
      // Default 5s at 30fps
      sourceDurationFrames: 150,
      trimStartFrame: 0,
      trimEndFrame: 150,
      track: 1,
      speed: 1,
      volume: 100,
      reversed: false,
      locked: false,
      origin: "manual",
      gridFormat,
      numCells,
      backgroundMode: "blur",
      cells: Array.from({ length: numCells }).map((_, i) => ({
        id: uuidv4(),
        clip: i === 0 && initialClip ? initialClip : null,
        x: 0,
        y: 0,
        width: 1,
        height: 1
      }))
    };
    set((state) => ({ clips: [...state.clips, newGrid] }));
  },
  updateGrid: (id, updates) => set((state) => ({
    clips: state.clips.map(
      (c) => c.id === id && c.type === "grid" ? { ...c, ...updates } : c
    )
  })),
  updateGridCell: (gridId, cellId, updates) => set((state) => ({
    clips: state.clips.map((c) => {
      if (c.id === gridId && c.type === "grid") {
        const grid = c;
        return {
          ...grid,
          cells: grid.cells.map(
            (cell) => cell.id === cellId ? { ...cell, ...updates } : cell
          )
        };
      }
      return c;
    })
  })),
  distributeMediaToGrid: (gridId, files) => {
    if (!files.length) return;
    set((state) => {
      const gridIndex = state.clips.findIndex((c) => c.id === gridId && c.type === "grid");
      if (gridIndex === -1) return state;
      const grid = state.clips[gridIndex];
      const newCells = [...grid.cells];
      const fps = 30;
      const gridDurationFrames = grid.endFrame - grid.startFrame || 150;
      const filesAvailable = files.map((f) => ({
        ...f,
        durationFrames: Math.floor(f.duration * fps),
        usedUntil: 0
      }));
      let currentFileIndex = 0;
      for (let i = 0; i < grid.numCells; i++) {
        const fIndex = currentFileIndex % filesAvailable.length;
        const file = filesAvailable[fIndex];
        let startTrim = file.usedUntil;
        let endTrim = startTrim + gridDurationFrames;
        if (endTrim > file.durationFrames) {
          startTrim = 0;
          endTrim = gridDurationFrames > file.durationFrames ? file.durationFrames : gridDurationFrames;
        }
        file.usedUntil = endTrim;
        newCells[i] = {
          ...newCells[i],
          clip: {
            id: uuidv4(),
            mediaLibraryId: file.id,
            type: file.type,
            path: file.path,
            filename: file.filename,
            startFrame: 0,
            endFrame: gridDurationFrames,
            sourceDurationFrames: file.durationFrames,
            trimStartFrame: startTrim,
            trimEndFrame: endTrim,
            track: 1,
            speed: 1,
            volume: 100,
            reversed: false,
            isMuted: false,
            isPinned: false,
            origin: "manual",
            locked: false
          }
        };
        currentFileIndex++;
      }
      const newClips = [...state.clips];
      newClips[gridIndex] = { ...grid, cells: newCells };
      return { clips: newClips };
    });
  },
  shuffleGridItems: (gridId) => set((state) => {
    const grid = state.clips.find((c) => c.id === gridId && c.type === "grid");
    if (!grid) return state;
    const cells = [...grid.cells];
    const seed = useProjectStore.getState().settings.seed || generateSeed();
    const rng = new SeededRandom(seed + gridId);
    const cellClips = cells.map((c) => c.clip);
    const shuffledClips = rng.shuffle(cellClips);
    const newCells = cells.map((cell, i) => ({
      ...cell,
      clip: shuffledClips[i]
    }));
    return {
      clips: state.clips.map((c) => c.id === gridId ? { ...c, cells: newCells } : c)
    };
  }),
  shuffleAllGrids: () => {
    const { clips } = get();
    clips.forEach((clip) => {
      if (clip.type === "grid") {
        get().shuffleGridItems(clip.id);
      }
    });
  },
  setTransitionStrategy: (transitionStrategy) => set({ transitionStrategy }),
  nukeLibrary: () => set({ clips: [], selectedClipIds: [], selectedSegment: null }),
  setClipDuration: (id, durationInSeconds) => {
    set((state) => {
      const fps = DEFAULT_FPS;
      const durationFrames = secondsToFrames(durationInSeconds, fps);
      return {
        clips: state.clips.map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            sourceDurationFrames: durationFrames,
            endFrame: c.startFrame + durationFrames
            // Extend to full length by default if imported fresh
            // Note: If we had a trimmer, we might not want to reset endFrame, 
            // but for the "Truncation" bug, resetting to full length is the fix.
          };
        })
      };
    });
  },
  // Phase 18: Sequence Actions
  magnetizeClips: () => {
    set((state) => {
      const sortedClips = [...state.clips].sort((a, b) => {
        if (a.track !== b.track) return (a.track || 0) - (b.track || 0);
        return a.startFrame - b.startFrame;
      });
      let currentFrame = 0;
      const newClips = sortedClips.map((clip) => {
        const duration = clip.endFrame - clip.startFrame;
        if (clip.track === 1 || !clip.track) {
          const newStart = currentFrame;
          const newEnd = newStart + duration;
          currentFrame = newEnd;
          return {
            ...clip,
            startFrame: newStart,
            endFrame: newEnd
            // IMPORANT: trimStartFrame and trimEndFrame stay exactly as they were
            // The duration (end - start) matches (trimEnd - trimStart)
          };
        }
        return clip;
      });
      return { clips: newClips };
    });
  },
  reorderClips: (fromIndex, toIndex) => {
    set((state) => {
      const currentClips = [...state.clips].sort((a, b) => a.startFrame - b.startFrame);
      const [movedClip] = currentClips.splice(fromIndex, 1);
      currentClips.splice(toIndex, 0, movedClip);
      let currentFrame = 0;
      const updatedClips = currentClips.map((clip) => {
        const duration = clip.endFrame - clip.startFrame;
        const start = currentFrame;
        const end = start + duration;
        currentFrame = end;
        return { ...clip, startFrame: start, endFrame: end };
      });
      return { clips: updatedClips };
    });
  },
  regenerateTimeline: (sourceFiles, seed) => {
    set((state) => {
      if (sourceFiles.length === 0) return state;
      const rng = new SeededRandom(seed);
      const protectedClips = state.clips.filter(
        (c) => c.origin === "manual" || c.locked || c.isPinned
      );
      const numClips = rng.randInt(5, 15);
      const newClips = [];
      for (let i = 0; i < numClips; i++) {
        const sourceFile = rng.choice(sourceFiles);
        if (!sourceFile) continue;
        const fps = 30;
        const sourceDurationFrames = Math.floor(sourceFile.duration * fps);
        const minFrames = 2 * fps;
        if (sourceDurationFrames < minFrames) continue;
        const maxFrames = Math.min(8 * fps, sourceDurationFrames);
        const durationFrames = rng.randInt(minFrames, maxFrames);
        const maxStart = sourceDurationFrames - durationFrames;
        const startFrame = rng.randInt(0, maxStart);
        newClips.push({
          id: uuidv4(),
          type: sourceFile.type,
          path: sourceFile.path,
          filename: sourceFile.filename,
          startFrame: 0,
          endFrame: durationFrames,
          sourceDurationFrames,
          trimStartFrame: startFrame,
          trimEndFrame: startFrame + durationFrames,
          speed: 1,
          volume: 100,
          isMuted: false,
          isPinned: false,
          origin: "auto",
          locked: false,
          track: 1,
          reversed: false
        });
      }
      const allClips = [...protectedClips, ...newClips];
      let currentFrame = 0;
      const updatedClips = allClips.map((clip) => {
        const duration = clip.endFrame - clip.startFrame;
        const start = currentFrame;
        const end = start + duration;
        currentFrame = end;
        return { ...clip, startFrame: start, endFrame: end };
      });
      return { clips: updatedClips };
    });
  },
  detectBeats: async (id, audioBuffer) => {
    try {
      console.log("[ClipStore] Analyzing audio for clip:", id);
      const result = await analyzeAudio(audioBuffer);
      set((state) => ({
        clips: state.clips.map(
          (c) => c.id === id ? {
            ...c,
            bpm: result.bpm,
            beatMarkers: result.peaks
          } : c
        )
      }));
      console.log("[ClipStore] Analysis complete:", result);
    } catch (error) {
      console.error("[ClipStore] Audio analysis failed:", error);
    }
  }
}));
export {
  useClipStore
};
