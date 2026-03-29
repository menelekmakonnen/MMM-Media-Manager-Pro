import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMediaStore = create(persist((set, get) => ({
    // === FOLDER & FILES ===
    folderHandle: null,
    folders: [],
    currentFolder: null,
    activeFolders: [], // Array of selected folder paths
    files: [],
    currentFileIndex: -1,
    excludedFolders: [],
    excludedItems: [],
    favoriteItems: [],
    favoritesOnly: false,
    pinnedGrids: {},
    mediaContextMenu: null,

    // === FILTERING ===
    fileTypeFilter: ['video'], // Default to video per request
    appViewMode: 'standard', // 'standard' | 'gallery' | 'slideshow' | 'fullscreen'
    previousViewMode: 'standard', // For backing out of slideshow
    mediaFitMode: 'contain', // 'contain' | 'cover' - Global setting for media fitting

    // === GALLERY STATE ===
    galleryZoom: 200,
    galleryFilter: { sortBy: 'name', sortOrder: 'asc' },
    galleryViewMode: 'media', // 'media' | 'both'
    galleryOrientation: 'vertical', // 'vertical' | 'horizontal' | 'square'
    explorerSearchQuery: '',
    itemRotations: {},
    processedFiles: [],
    visibleLimit: 1000, // Chunked loading limit
    isScanning: false,
    scannedCount: 0,
    currentWorker: null,

    // === TRAILER SETTINGS ===
    trailerSettings: {
        template: 'social', // 'social' | 'epic' | 'gym' | 'kinetic' | 'custom'
        targetDuration: 30, // seconds
        shortestClip: 0.2,
        longestClip: 1.0,
        allowDuplicates: true,
        allowSameSegment: false,
        mediaType: 'video', // 'video' | 'image'
        audioMixStrategy: 'muted', // 'muted' | 'subtle' | 'original' | 'ducking'
        slowmoPolicy: 'none', // 'none' | 'mixed' | 'all'
        audioTimelineStrategy: 'loop', // 'loop' | 'fade' | 'continue'
        matchAudioDuration: true
    },
    setTrailerSettings: (settings) => set(state => ({ trailerSettings: { ...state.trailerSettings, ...settings } })),
    
    isTrailerModalOpen: false,
    setTrailerModalOpen: (val) => set({ isTrailerModalOpen: val }),

    // === MULTI-SELECTION STATE ===
    explorerSelectedFiles: new Set(),
    setExplorerSelectedFiles: (updater) => set(state => ({ 
        explorerSelectedFiles: typeof updater === 'function' ? updater(state.explorerSelectedFiles) : updater 
    })),
    clearExplorerSelection: () => set({ explorerSelectedFiles: new Set() }),



    // === SLIDESHOW STATE ===
    slideshowActive: false,
    slideshowRandom: false,
    slideshowDuration: 5, // Default 5s
    slideshowTransition: 'fade', // 'none' | 'fade' | 'slide' | 'zoom' | 'swipe' | 'flip' | ...
    superSlideshowActive: false,
    slideshowIdle: false, // For hiding UI in immersive mode

    // === PLAYBACK STATE ===
    masterVolume: 1.0,
    isMasterMuted: false,

    // === ACTIONS: Slideshow ===
    setSlideshowDuration: (duration) => set({ slideshowDuration: duration }),
    setSlideshowTransition: (mode) => set({ slideshowTransition: mode }),
    setSuperSlideshowActive: (active) => set({ superSlideshowActive: active }),
    toggleSuperSlideshow: () => set(state => ({ superSlideshowActive: !state.superSlideshowActive })),
    setSlideshowIdle: (idle) => set({ slideshowIdle: idle }),
    adjustSlideshowDuration: (delta) => set(state => ({ slideshowDuration: Math.max(1, state.slideshowDuration + delta) })),
    triggerRandomStart: () => set(state => ({ shuffleSeed: state.shuffleSeed + 1 })), // Re-use shuffle seed to trigger effects

    // === ACTIONS: Playback ===
    setMasterVolume: (vol) => set({ masterVolume: vol }),
    setIsMasterMuted: (val) => set({ isMasterMuted: val }),
    isChaosMode: false,
    toggleChaosMode: () => set(state => ({ isChaosMode: !state.isChaosMode })),

    // === ACTIONS: Performance ===
    showMoreItems: () => set(state => ({ visibleLimit: state.visibleLimit + 1000 })),
    resetVisibleLimit: () => set({ visibleLimit: 1000 }),

    // === ACTIONS: Scanning ===
    startScan: (handle, append = false) => {
        if (!handle) return;
        const { clearFiles, addFiles, setFolders, addFilesOnly, addFoldersOnly, updateProcessedFiles } = get();

        if (!append) {
            clearFiles();
            set({ scannedCount: 0, processedFiles: [] });
        }

        set({ isScanning: true });

        // Terminate existing worker if any
        const oldWorker = get().currentWorker;
        if (oldWorker) oldWorker.terminate();

        const worker = new Worker(new URL('../workers/fileScanner.worker.js', import.meta.url), { type: 'module' });
        set({ currentWorker: worker });

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'FILES_FOUND') {
                if (append) addFilesOnly(payload);
                else addFiles(payload);
                set((state) => ({ scannedCount: state.scannedCount + payload.length }));
                updateProcessedFiles(); // Update the cache
            } else if (type === 'FOLDERS_FOUND') {
                const sortedFoldersList = payload.sort((a, b) => a.path.localeCompare(b.path));
                if (append) addFoldersOnly(sortedFoldersList);
                else setFolders(sortedFoldersList);
            } else if (type === 'SCAN_COMPLETE' || type === 'SCAN_CANCELLED') {
                set({ isScanning: false, currentWorker: null });
                worker.terminate();
                updateProcessedFiles(); // Final update
            } else if (type === 'SCAN_ERROR') {
                set({ isScanning: false, currentWorker: null });
                worker.terminate();
            }
        };
        worker.postMessage({ type: 'START_SCAN', dirHandle: handle });
    },

    cancelScan: () => {
        const { currentWorker } = get();
        if (currentWorker) {
            currentWorker.postMessage({ type: 'CANCEL_SCAN' });
        }
    },

    setExplorerSearchQuery: (query) => {
        set({ explorerSearchQuery: query });
        get().updateProcessedFiles();
    },
    updateProcessedFiles: (immediate = false) => {
        const { _procTimeout, _lastProcTime, isScanning } = get();
        if (_procTimeout) clearTimeout(_procTimeout);

        const now = Date.now();
        const lastTime = _lastProcTime || 0;
        const delay = isScanning ? 2500 : 100; // Increased scan throttle to 2.5s for massive folders

        // If immediate or enough time passed, run now
        if (immediate || (now - lastTime > delay)) {
            const sorted = get().calculateSortedFiles();
            set({ processedFiles: sorted, _procTimeout: null, _lastProcTime: now });
            return;
        }

        // Otherwise schedule a trailing update
        const timeout = setTimeout(() => {
            const sorted = get().calculateSortedFiles();
            set({ processedFiles: sorted, _procTimeout: null, _lastProcTime: Date.now() });
        }, delay);

        set({ _procTimeout: timeout });
    },
    _procTimeout: null,
    _lastProcTime: 0,

    setExplorerSearchQuery: (query) => {
        set({ explorerSearchQuery: query });
        get().updateProcessedFiles();
    },
    
    // === SETTINGS VIEW CONFIGURATIONS ===
    defaultGridCount: 1, setDefaultGridCount: (c) => set({ defaultGridCount: c }),
    cinemaModeOnLaunch: false, setCinemaModeOnLaunch: (v) => set({ cinemaModeOnLaunch: v }),
    continuousPlayback: true, setContinuousPlayback: (v) => set({ continuousPlayback: v }),
    slideTransitionEffect: 'fade', setSlideTransitionEffect: (v) => set({ slideTransitionEffect: v }),
    slideshowCursorHide: true, setSlideshowCursorHide: (v) => set({ slideshowCursorHide: v }),
    galleryDefaultZoom: 200, setGalleryDefaultZoom: (v) => set({ galleryDefaultZoom: v }),
    galleryDisplayMode: 'both', setGalleryDisplayMode: (v) => set({ galleryDisplayMode: v }),
    metadataOverlayGallery: true, setMetadataOverlayGallery: (v) => set({ metadataOverlayGallery: v }),
    editorAutoSave: true, setEditorAutoSave: (v) => set({ editorAutoSave: v }),
    editorDefaultTransition: 500, setEditorDefaultTransition: (v) => set({ editorDefaultTransition: v }),
    hardwareAcceleration: true, setHardwareAcceleration: (v) => set({ hardwareAcceleration: v }),
    settingsStartupTab: 'general', setSettingsStartupTab: (v) => set({ settingsStartupTab: v }),
    showSettingsTooltips: true, setShowSettingsTooltips: (v) => set({ showSettingsTooltips: v }),

    keyboardBindings: {
        playPause: ' ', // Space
        nextItem: 'ArrowRight',
        prevItem: 'ArrowLeft',
        nextGroup: ['Control', 'ArrowRight'],
        prevGroup: ['Control', 'ArrowLeft'],
        volumeUp: 'ArrowUp',
        volumeDown: 'ArrowDown',
        scrollUp: 'ArrowUp', // Gallery View
        scrollDown: 'ArrowDown', // Gallery View
        grid1: '1', grid2: '2', grid3: '3', grid4: '4',
        grid6: '6', grid9: '9', grid12: '5'
    },
    setKeyboardBinding: (action, keyCombo) => set(state => ({
        keyboardBindings: { ...state.keyboardBindings, [action]: keyCombo }
    })),
    
    // === GLOBAL PLAYBACK STATE ===
    globalIsPlaying: false,
    setGlobalIsPlaying: (playing) => set({ globalIsPlaying: playing }),
    toggleGlobalPlay: () => set(state => ({ globalIsPlaying: !state.globalIsPlaying })),

    globalViewMode: 'normal',
    fullscreenMode: false,
    movieMode: false,
    cinemaMode: false, // New: Hides sidebars & thins controls
    viewMode: 'single', // 'single' | 'grid' | 'custom'
    explorerViewMode: 'grid',
    sidebarViewMode: 'grid',
    sidebarGridColumns: 3,
    gridColumns: 1,
    gridRows: 1,
    theme: 'outer-space',
    themeMode: 'dark',
    toggleThemeMode: () => set(state => ({ themeMode: state.themeMode === 'dark' ? 'deep' : 'dark' })),
    threeGridEqual: false,
    setThreeGridEqual: (val) => set({ threeGridEqual: val }),
    nineGridHero: false,
    setNineGridHero: (val) => set({ nineGridHero: val }),

    // === MASONRY STATE ===
    masonryScrollPosition: 0,
    setMasonryScrollPosition: (pos) => set({ masonryScrollPosition: pos }),

    // === SORTING ===
    sortStack: [{ field: 'name', order: 'asc' }],
    sortOrder: 'asc',
    groupBy: 'none',
    shuffleSeed: 0,
    folderSortMode: 'name', // 'name' | 'count' | 'date' | 'age'
    metadataFilters: {
        aspectRatio: 'all', // 'all' | 'landscape' | 'portrait' | 'square'
        nameLength: 'all',  // 'all' | 'short' | 'medium' | 'long'
        resolution: 'all'   // 'all' | 'low' | 'high' | '4k'
    },

    // === DISPLAY OPTIONS ===
    showJumpButtons: false,
    toggleJumpButtons: () => set(state => ({ showJumpButtons: !state.showJumpButtons })),
    grayscaleInactive: false,
    setGrayscaleInactive: (val) => set({ grayscaleInactive: val }),
    thumbnailSize: 120,
    setThumbnailSize: (size) => set({ thumbnailSize: size }),
    thumbnailOrientation: 'vertical',
    setThumbnailOrientation: (ori) => set({ thumbnailOrientation: ori }),
    zoomMode: 'fit',
    widescreen: false,
    setWidescreen: (val) => set({ widescreen: val }),
    explorerGridColumns: 3,
    showDuplicates: false,
    setShowDuplicates: (val) => set(state => {
        const newState = { showDuplicates: val };
        // Trigger file refresh if changing duplicate visibility
        setTimeout(() => useMediaStore.getState().updateProcessedFiles(), 0);
        return newState;
    }),
    slideshowActive: false,
    slideshowRandom: false,
    setSlideshowRandom: (val) => set({ slideshowRandom: val }),

    setExplorerGridColumns: (cols) => set({ explorerGridColumns: cols }),

    // === ACTIONS: Gallery & View ===
    setGalleryZoom: (zoom) => set({ galleryZoom: zoom }),
    setGalleryFilter: (filter) => set(state => ({ galleryFilter: { ...state.galleryFilter, ...filter } })),
    setGalleryViewMode: (mode) => set({ galleryViewMode: mode }),
    setGalleryOrientation: (orientation) => set({ galleryOrientation: orientation }),
    getGalleryFiles: () => {
        const { files, activeFolders, showDuplicates, metadataFilters, excludedFolders, excludedItems } = get();
        let filtered = files;

        // Apply Exclusions
        if (excludedItems && excludedItems.length > 0) {
            const itemSet = new Set(excludedItems);
            filtered = filtered.filter(f => !itemSet.has(f.path));
        }
        if (excludedFolders && excludedFolders.length > 0) {
            filtered = filtered.filter(f => {
                return !excludedFolders.some(folder => f.folderPath === folder || f.folderPath?.startsWith(folder + '/'));
            });
        }

        const favOnly = get().favoritesOnly;
        const favs = get().favoriteItems;
        if (favOnly) {
            if (favs && favs.length > 0) {
                const favSet = new Set(favs);
                filtered = filtered.filter(f => favSet.has(f.path));
            } else {
                filtered = [];
            }
        }

        const folderSet = activeFolders && activeFolders.length > 0 ? new Set(activeFolders) : null;
        if (folderSet) {
            filtered = filtered.filter(f => {
                if (folderSet.has(f.folderPath)) return true;
                for (const af of activeFolders) {
                    if (f.folderPath?.startsWith(af + '/')) return true;
                }
                return false;
            });
        }

        // Apply Metadata Filters for parity
        if (metadataFilters.aspectRatio !== 'all') {
            filtered = filtered.filter(f => {
                // Determine aspect ratio, default to landscape if missing but allow fallback
                const w = f.width || (f.hasVideos ? 1920 : 1500); 
                const h = f.height || (f.hasVideos ? 1080 : 1000);
                const ar = w / h;
                
                if (metadataFilters.aspectRatio === 'landscape') return ar > 1.2;
                if (metadataFilters.aspectRatio === 'portrait') return ar < 0.8;
                if (metadataFilters.aspectRatio === 'square') return ar >= 0.8 && ar <= 1.2;
                return true;
            });
        }
        if (metadataFilters.nameLength !== 'all') {
            filtered = filtered.filter(f => {
                const len = f.name.length;
                if (metadataFilters.nameLength === 'short') return len < 15;
                if (metadataFilters.nameLength === 'medium') return len >= 15 && len < 40;
                if (metadataFilters.nameLength === 'long') return len >= 40;
                return true;
            });
        }

        // Duplicates
        if (!showDuplicates) {
            const groups = new Map();
            filtered.forEach(file => {
                const key = `${file.name}-${file.size}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(file);
            });
            const uniqueFiles = [];
            groups.forEach(groupFiles => uniqueFiles.push(groupFiles[0]));
            filtered = uniqueFiles;
        }

        return filtered;
    },

    setAppViewMode: (mode) => set(state => ({
        appViewMode: mode,
        previousViewMode: state.appViewMode !== mode ? state.appViewMode : state.previousViewMode
    })),
    setMediaContextMenu: (menu) => set({ mediaContextMenu: menu }),

    sendToEditor: async (mediaItem, currentFrame = 0, fullClip = false) => {
        const { useClipStore } = await import('./clipStore');
        const clipStore = useClipStore.getState();
        const fps = 30; // default assumptions
        const durationFrames = mediaItem.duration ? Math.ceil(mediaItem.duration * fps) : 150; // default 5s
        
        let startF = 0;
        let endF = durationFrames;
        
        if (!fullClip && currentFrame > 0) {
            startF = currentFrame;
        }

        const newClip = {
            id: crypto.randomUUID(),
            mediaLibraryId: mediaItem.id || mediaItem.path,
            type: mediaItem.type,
            path: mediaItem.path,
            filename: mediaItem.name || mediaItem.filename,
            startFrame: clipStore.clips.reduce((max, c) => Math.max(max, c.endFrame), 0), // Append to end
            endFrame: clipStore.clips.reduce((max, c) => Math.max(max, c.endFrame), 0) + (endF - startF),
            sourceDurationFrames: durationFrames,
            trimStartFrame: startF,
            trimEndFrame: endF,
            track: 1,
            speed: 1,
            volume: 100,
            reversed: false,
            isMuted: false,
            isPinned: false,
            origin: "manual",
            locked: false
        };
        clipStore.addClip(newClip);
        clipStore.selectSingleClip(newClip.id);
        
        // Switch view last
        set(state => ({
            appViewMode: 'editor',
            previousViewMode: state.appViewMode !== 'editor' ? state.appViewMode : state.previousViewMode
        }));
    },

    startSlideshowAt: (path) => {
        const { processedFiles, setCurrentFileIndex, setAppViewMode } = get();
        const index = processedFiles.findIndex(f => f.path === path);
        if (index !== -1) {
            setCurrentFileIndex(index);
            setAppViewMode('slideshow');
            set({ slideshowActive: true });
        } else {
            // Fallback if not found in processed (e.g. filter hidden it?), try raw or warn?
            // For now, if not in processed, we shouldn't show it as it breaks the "match grid" rule.
            console.warn("File not found in current view filters:", path);
        }
    },



    // === ACTIONS: Folder & Files ===
    setFolderHandle: (handle) => set({ folderHandle: handle }),
    setFolders: (folders) => set({ folders }),
    setCurrentFolder: (path) => {
        // Force clear processed list to ensure UI update and prevent stale state
        set({ currentFolder: path, activeFolders: [path], visibleLimit: 1000, processedFiles: [] });
        get().updateProcessedFiles(true); // Immediate update
    },
    toggleActiveFolder: (path) => {
        set((state) => {
            const folders = new Set(state.activeFolders);
            if (folders.has(path)) folders.delete(path);
            else folders.add(path);
            return { activeFolders: Array.from(folders), currentFolder: path };
        });
        get().updateProcessedFiles();
    },
    setFiles: (files) => set({ files }),
    clearFiles: () => set({ files: [], folders: [], currentFileIndex: -1, currentFolder: null, activeFolders: [] }),
    addFiles: (newFiles) => set((state) => ({ files: state.files.concat(newFiles) })),

    // === ACTIONS: Exclusions ===
    toggleFolderExclusion: (path) => {
        set((state) => {
            const current = new Set(state.excludedFolders);
            if (current.has(path)) current.delete(path);
            else current.add(path);
            return { excludedFolders: Array.from(current) };
        });
        get().updateProcessedFiles();
    },
    toggleItemExclusion: (path) => {
        set((state) => {
            const current = new Set(state.excludedItems);
            if (current.has(path)) current.delete(path);
            else current.add(path);
            return { excludedItems: Array.from(current) };
        });
        get().updateProcessedFiles();
    },
    clearExclusions: () => {
        set({ excludedFolders: [], excludedItems: [] });
        get().updateProcessedFiles();
    },

    // === ACTIONS: Favorites & Pins ===
    toggleFavorite: (path) => {
        set((state) => {
            const current = new Set(state.favoriteItems || []);
            if (current.has(path)) current.delete(path);
            else current.add(path);
            return { favoriteItems: Array.from(current) };
        });
        get().updateProcessedFiles();
    },
    setFavoritesOnly: (val) => {
        set({ favoritesOnly: val });
        get().updateProcessedFiles();
    },
    togglePin: (slotIndex, file) => {
        set((state) => {
            const current = { ...(state.pinnedGrids || {}) };
            if (current[slotIndex] && current[slotIndex].path === file.path) {
                delete current[slotIndex];
            } else {
                current[slotIndex] = file;
            }
            return { pinnedGrids: current };
        });
    },
    clearPins: () => set({ pinnedGrids: {} }),
    unpinItem: (slotIndex) => {
        set((state) => {
            const current = { ...(state.pinnedGrids || {}) };
            delete current[slotIndex];
            return { pinnedGrids: current };
        });
    },

    // === ACTIONS: Filtering ===
    setFileTypeFilter: (type) => {
        set((state) => {
            if (type === 'all') return { fileTypeFilter: ['all'] };
            // If already selecting one type, and clicking it again, go to 'all' or keep as is? 
            // The user wants 'video' as default and colorful toggles.
            let current = state.fileTypeFilter.includes('all') ? [] : [...state.fileTypeFilter];
            if (current.includes(type)) {
                current = current.filter(t => t !== type);
            } else {
                current.push(type);
            }
            if (current.length === 0) return { fileTypeFilter: ['video'] }; // Default back to video
            return { fileTypeFilter: current };
        });
        get().updateProcessedFiles();
    },
    // setExplorerSearchQuery: (query) => set({ explorerSearchQuery: query }), // This was duplicated, removed here.

    // === ACTIONS: Navigation ===
    setCurrentFileIndex: (index) => set({ currentFileIndex: index }),

    getCurrentFile: () => {
        const { processedFiles, currentFileIndex } = get();
        if (currentFileIndex >= 0 && currentFileIndex < processedFiles.length) {
            return processedFiles[currentFileIndex];
        }
        return null;
    },

    nextFile: () => {
        const { processedFiles, currentFileIndex } = get();
        if (processedFiles.length === 0) return;
        const nextIndex = (currentFileIndex + 1) % processedFiles.length;
        set({ currentFileIndex: nextIndex });

        // Ensure the new index is visible if in grid view (auto-load more)
        const { visibleLimit, showMoreItems } = get();
        if (nextIndex >= visibleLimit) {
            showMoreItems();
        }
    },

    prevFile: () => set((state) => {
        const { processedFiles } = get();
        if (processedFiles.length === 0) return {};
        // Fix loopback logic: (current - 1 + total) % total
        const newIndex = (state.currentFileIndex - 1 + processedFiles.length) % processedFiles.length;
        return { currentFileIndex: newIndex };
    }),

    firstFile: () => set({ currentFileIndex: 0 }),
    lastFile: () => {
        const { processedFiles } = get();
        set({ currentFileIndex: processedFiles.length - 1 });
    },

    // Skip by grid size (for groups)
    skipGroup: (direction = 1) => {
        const { gridColumns, gridRows, currentFileIndex, pinnedGrids } = get();
        const sorted = get().getSortedFiles();
        if (sorted.length === 0) return;

        // How many slots are actually advancing? (Subtract pinned slots)
        const totalSlots = gridColumns * gridRows;
        const activePins = Object.keys(pinnedGrids || {}).length;
        const advanceCount = Math.max(1, totalSlots - activePins);

        let newIndex;
        if (direction > 0) {
            newIndex = (currentFileIndex + advanceCount) % sorted.length;
        } else {
            newIndex = (currentFileIndex - advanceCount + sorted.length * advanceCount) % sorted.length;
        }

        set({ currentFileIndex: newIndex });

        // Auto-load more items if we zoom past the virtualization threshold
        const { visibleLimit, showMoreItems } = get();
        if (newIndex >= visibleLimit) {
            showMoreItems();
        }
    },

    // === ACTIONS: View Modes ===
    setGlobalViewMode: (mode) => set({ globalViewMode: mode }),
    setFullscreenMode: (val) => set({ fullscreenMode: val }),
    toggleFullscreen: () => set((state) => ({ fullscreenMode: !state.fullscreenMode })),
    toggleMovieMode: () => set((state) => ({ movieMode: !state.movieMode })),
    toggleCinemaMode: () => set((state) => ({ cinemaMode: !state.cinemaMode })), // Action
    setViewMode: (mode) => set({ viewMode: mode }),
    setExplorerViewMode: (mode) => set({ explorerViewMode: mode }),
    setSidebarViewMode: (mode) => set({ sidebarViewMode: mode }),
    setGridLayout: (columns, rows) => set({ gridColumns: columns, gridRows: rows, viewMode: 'custom' }),
    setTheme: (theme) => set({ theme }),
    setThemeMode: () => set({ themeMode: 'dark' }), // Enforced Dark Mode
    toggleSlideshow: () => set((state) => ({ slideshowActive: !state.slideshowActive })),
    setSlideshowRandom: (val) => set({ slideshowRandom: val }),
    toggleMediaFitMode: () => set((state) => {
        const newMode = state.mediaFitMode === 'cover' ? 'contain' : 'cover';
        return { mediaFitMode: newMode };
    }),

    // === ACTIONS: Sorting ===
    setSortStack: (stack) => {
        set({ sortStack: stack });
        get().updateProcessedFiles();
    },
    toggleSort: (field) => {
        if (field === 'random') {
            get().shuffleFiles();
            return;
        }
        set((state) => {
            const existing = state.sortStack.find(s => s.field === field);
            if (existing) {
                return { sortStack: [{ field, order: existing.order === 'asc' ? 'desc' : 'asc' }] };
            }
            return { sortStack: [{ field, order: 'asc' }] };
        });
        get().updateProcessedFiles();
    },

    shuffleFiles: () => {
        set((state) => ({
            shuffleSeed: (state.shuffleSeed || 0) + 1,
            sortStack: [{ field: 'random', order: 'asc' }],
            currentFileIndex: 0
        }));
        get().updateProcessedFiles(true);
    },

    // ... ACTIONS: Metadata ...
    setMetadataFilters: (filters) => {
        set((state) => ({ metadataFilters: { ...state.metadataFilters, ...filters } }));
        get().updateProcessedFiles();
    },
    updateFileMetadata: (path, metadata) => {
        set((state) => ({
            files: state.files.map(f => f.path === path ? { ...f, ...metadata } : f)
        }));
        get().updateProcessedFiles();
    },

    // ... GRID TOGGLES ...
    // Cycles: Returns next state based on current columns/rows
    toggleDual: () => set((state) => {
        // Cycle: 2x1 (SideBySide) -> 1x2 (Stacked) -> 2x1
        const isStacked = state.gridColumns === 1 && state.gridRows === 2;
        if (isStacked) return { gridColumns: 2, gridRows: 1, viewMode: 'custom' };
        return { gridColumns: 1, gridRows: 2, viewMode: 'custom' };
    }),
    toggleTriple: () => set((state) => {
        // Cycle: 3x1 (Hero) -> 3x1 (Equal) -> 1x3 (Hero) -> 1x3 (Equal) -> 3x1 (Hero)
        const isVert = state.gridRows === 3;
        const isEqual = state.threeGridEqual;

        if (!isVert && !isEqual) return { threeGridEqual: true }; // Hero Horz -> Equal Horz
        if (!isVert && isEqual) return { gridColumns: 1, gridRows: 3, threeGridEqual: false, viewMode: 'custom' }; // Equal Horz -> Hero Vert
        if (isVert && !isEqual) return { threeGridEqual: true }; // Hero Vert -> Equal Vert
        return { gridColumns: 3, gridRows: 1, threeGridEqual: false, viewMode: 'custom' }; // Equal Vert -> Hero Horz
    }),
    toggleThreeGridEqual: () => set(state => ({ threeGridEqual: !state.threeGridEqual })),
    toggleQuad: () => set((state) => {
        // Cycle: 2x2 (Grid) -> 4x1 (Vert Strip) -> 1x4 (Horz Strip) -> 2x2
        const is2x2 = state.gridColumns === 2 && state.gridRows === 2;
        const is4x1 = state.gridColumns === 4 && state.gridRows === 1;

        if (is2x2) return { gridColumns: 4, gridRows: 1, viewMode: 'custom' };
        if (is4x1) return { gridColumns: 1, gridRows: 4, viewMode: 'custom' };
        return { gridColumns: 2, gridRows: 2, viewMode: 'custom' };
    }),

    toggleSix: () => set((state) => {
        // Cycle: 3x2 (Horizontal Grid) -> 2x3 (Vertical Grid) -> 3x2
        const is3x2 = state.gridColumns === 3 && state.gridRows === 2;
        if (is3x2) return { gridColumns: 2, gridRows: 3, viewMode: 'custom' };
        return { gridColumns: 3, gridRows: 2, viewMode: 'custom' };
    }),

    toggleNine: () => set((state) => {
        // Cycle: 3x3 (Equal) -> 3x3 (Hero) -> 3x3 (Equal)
        const is3x3 = state.gridColumns === 3 && state.gridRows === 3;
        if (is3x3) {
            return { nineGridHero: !state.nineGridHero };
        }
        return { gridColumns: 3, gridRows: 3, nineGridHero: false, viewMode: 'custom' };
    }),

    toggleTwelve: () => set((state) => {
        // Cycle: 4x3 (Horizontal) -> 3x4 (Vertical)
        const is4x3 = state.gridColumns === 4 && state.gridRows === 3;
        if (is4x3) return { gridColumns: 3, gridRows: 4, viewMode: 'custom' };
        return { gridColumns: 4, gridRows: 3, viewMode: 'custom' };
    }),

    setSortOrder: (order) => {
        set({ sortOrder: order });
        get().updateProcessedFiles();
    },
    setGroupBy: (groupBy) => {
        set({ groupBy });
        get().updateProcessedFiles();
    },
    toggleSortOrder: () => {
        set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }));
        get().updateProcessedFiles();
    },
    shuffleFiles: () => {
        set((state) => ({
            sortBy: 'random',
            sortStack: [{ field: 'random', order: 'asc' }],
            shuffleSeed: state.shuffleSeed + 1
        }));
        get().updateProcessedFiles();
    },
    setFolderSortMode: (mode) => set({ folderSortMode: mode }),
    setShowDuplicates: (val) => {
        set({ showDuplicates: val });
        get().updateProcessedFiles();
    },
    setSidebarGridColumns: (cols) => set({ sidebarGridColumns: cols }),

    // === ACTIONS: Display ===
    // === ACTIONS: Display ===
    setGrayscaleInactive: (value) => set({ grayscaleInactive: value }),
    setThumbnailSize: (size) => set({ thumbnailSize: size }),
    setThumbnailOrientation: (orientation) => set({ thumbnailOrientation: orientation }),
    setZoomMode: (mode) => set({ zoomMode: mode }),
    setWidescreen: (value) => set({ widescreen: value }),

    // === ROTATION & SPEED ===
    masterPlaybackRate: 1,
    setMasterPlaybackRate: (rate) => set({ masterPlaybackRate: rate }),
    globalRotation: 0,
    setGlobalRotation: (deg) => set({ globalRotation: deg }),
    // itemRotations: {}, // Map of ID or Path -> Rotation // Moved to filtering section
    rotateItem: (path, deg) => set((state) => ({ itemRotations: { ...state.itemRotations, [path]: deg } })),



    // === FOLDER ACTIONS (Extended) ===
    addFilesOnly: (newFiles) => set((state) => {
        // Optimization: Removed O(N^2) Set mapping loop. Rely on standard duplicate filtering instead to maintain UI speed on 77k+ appends.
        return { files: state.files.concat(newFiles) };
    }),
    addFoldersOnly: (newFolders) => set((state) => {
        const folderMap = new Map(state.folders.map(f => [f.path, f]));
        newFolders.forEach(f => folderMap.set(f.path, f));
        return { folders: Array.from(folderMap.values()) };
    }),

    // === COMPUTED: Sorted Files ===
    calculateSortedFiles: () => {
        const { files, folders, fileTypeFilter, sortStack, activeFolders, explorerSearchQuery, showDuplicates, excludedFolders, excludedItems } = get();

        // 0. Filter by Exclusions
        let filtered = files;
        if (excludedItems && excludedItems.length > 0) {
            const itemSet = new Set(excludedItems);
            filtered = filtered.filter(f => !itemSet.has(f.path));
        }
        if (excludedFolders && excludedFolders.length > 0) {
            filtered = filtered.filter(f => {
                return !excludedFolders.some(folder => f.folderPath === folder || f.folderPath?.startsWith(folder + '/'));
            });
        }

        // 0.5 Filter by Favorites
        const favOnly = get().favoritesOnly;
        const favs = get().favoriteItems;
        if (favOnly) {
            if (favs && favs.length > 0) {
                const favSet = new Set(favs);
                filtered = filtered.filter(f => favSet.has(f.path));
            } else {
                filtered = [];
            }
        }

        // 1. Filter by Active Folders (if any)
        if (activeFolders && activeFolders.length > 0) {
            const folderSet = new Set(activeFolders);
            filtered = filtered.filter(f => {
                if (folderSet.has(f.folderPath)) return true;
                // Optimization: Avoid startsWith for every file if possible
                return activeFolders.some(folder => f.folderPath?.startsWith(folder + '/'));
            });
        }

        // 2. Filter by Type (Multi-select)
        if (!fileTypeFilter.includes('all')) {
            filtered = filtered.filter(f => {
                if (fileTypeFilter.includes('gif') && f.name.toLowerCase().endsWith('.gif')) return true;
                if (fileTypeFilter.includes('video') && f.type === 'video') return true;
                if (fileTypeFilter.includes('image') && f.type === 'image' && !f.name.toLowerCase().endsWith('.gif')) return true;
                return false;
            });
        }

        // 2b. Filter by Metadata
        const { metadataFilters } = get();
        if (metadataFilters.aspectRatio !== 'all') {
            filtered = filtered.filter(f => {
                const ar = (f.width || 1) / (f.height || 1);
                if (metadataFilters.aspectRatio === 'landscape') return ar > 1.2;
                if (metadataFilters.aspectRatio === 'portrait') return ar < 0.8;
                if (metadataFilters.aspectRatio === 'square') return ar >= 0.8 && ar <= 1.2;
                return true;
            });
        }
        if (metadataFilters.nameLength !== 'all') {
            filtered = filtered.filter(f => {
                const len = f.name.length;
                if (metadataFilters.nameLength === 'short') return len < 15;
                if (metadataFilters.nameLength === 'medium') return len >= 15 && len < 40;
                if (metadataFilters.nameLength === 'long') return len >= 40;
                return true;
            });
        }

        // 3. Search Filter
        if (explorerSearchQuery) {
            const q = explorerSearchQuery.toLowerCase();
            filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
        }

        // 4. Duplicate Detection (Optional)
        if (!showDuplicates) {
            const groups = new Map();
            // Group by name + size
            filtered.forEach(file => {
                const key = `${file.name}-${file.size}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(file);
            });

            const folderMap = new Map(folders.map(f => [f.path, f]));
            const uniqueFiles = [];
            groups.forEach(groupFiles => {
                if (groupFiles.length === 1) {
                    uniqueFiles.push(groupFiles[0]);
                } else {
                    // Preference logic: Pick file in the folder with most media items
                    const sortedGroup = [...groupFiles].sort((a, b) => {
                        const folderA = folderMap.get(a.folderPath);
                        const folderB = folderMap.get(b.folderPath);
                        return (folderB?.fileCount || 0) - (folderA?.fileCount || 0);
                    });
                    uniqueFiles.push(sortedGroup[0]);
                }
            });
            filtered = uniqueFiles;
        }

        // 5. Multi-Sort
        if (sortStack && sortStack.length > 0 && sortStack[0].field === 'random') {
            const { shuffleSeed } = get();
            
            // Simple robust hash for consistent but randomized order based on seed
            const hashString = (raw) => {
                const str = String(raw); // Force to string to prevent .length crash on numbers
                let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
                for (let i = 0, ch; i < str.length; i++) {
                    ch = str.charCodeAt(i);
                    h1 = Math.imul(h1 ^ ch, 2654435761);
                    h2 = Math.imul(h2 ^ ch, 1597334677);
                }
                h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
                return (h1 >>> 0);
            };

            return [...filtered].sort((a, b) => {
                // Ensure unique combinations of strings and fallback IDs
                const strA = `${a.path || a.name || 'a'}_${shuffleSeed}`;
                const strB = `${b.path || b.name || 'b'}_${shuffleSeed}`;
                const hashA = hashString(strA);
                const hashB = hashString(strB);
                return hashA - hashB;
            });
        }

        return [...filtered].sort((a, b) => {
            if (!sortStack || sortStack.length === 0) return 0;

            for (const sort of sortStack) {
                const { field, order } = sort;
                const multiplier = order === 'asc' ? 1 : -1;

                // Optimized handling using pre-calculated sortKey
                if (field === 'name') {
                    const valA = a.sortKey || a.name.toLowerCase();
                    const valB = b.sortKey || b.name.toLowerCase();
                    if (valA < valB) return -1 * multiplier;
                    if (valA > valB) return 1 * multiplier;
                    continue;
                }

                const valA = getSortValue(a, field);
                const valB = getSortValue(b, field);

                if (valA < valB) return -1 * multiplier;
                if (valA > valB) return 1 * multiplier;
            }
            return 0;
        });
    },

    getSortedFiles: () => {
        const { processedFiles, visibleLimit } = get();
        return processedFiles.slice(0, visibleLimit);
    },
    getAllProcessedFiles: () => get().processedFiles,
}), {
    name: 'mmmam-storage', // unique name
    partialize: (state) => ({
        theme: state.theme,
        themeMode: state.themeMode,
        gridColumns: state.gridColumns,
        gridRows: state.gridRows,
        sidebarGridColumns: state.sidebarGridColumns,
        thumbnailSize: state.thumbnailSize,
        thumbnailOrientation: state.thumbnailOrientation,
        zoomMode: state.zoomMode,
        widescreen: state.widescreen,
        showDuplicates: state.showDuplicates,
        folderSortMode: state.folderSortMode,
        sortStack: state.sortStack,
        mediaFitMode: state.mediaFitMode, // persist preference
        showJumpButtons: state.showJumpButtons,
        metadataFilters: state.metadataFilters,
        fileTypeFilter: state.fileTypeFilter,
        threeGridEqual: state.threeGridEqual,
        threeGridEqual: state.threeGridEqual,
        nineGridHero: state.nineGridHero,
        galleryZoom: state.galleryZoom,
        galleryFilter: state.galleryFilter,
        galleryViewMode: state.galleryViewMode,
        galleryOrientation: state.galleryOrientation,
        slideshowDuration: state.slideshowDuration,
        slideshowTransition: state.slideshowTransition,
        masterVolume: state.masterVolume,
        isMasterMuted: state.isMasterMuted,
        excludedFolders: state.excludedFolders,
        excludedItems: state.excludedItems,
        favoriteItems: state.favoriteItems,
        favoritesOnly: state.favoritesOnly
    }),
}));

// Helper to get safe sort values
function getSortValue(file, field) {
    switch (field) {
        case 'name': return file.name;
        case 'type': return file.type;
        case 'size': return file.size || 0;
        case 'date':
        case 'lastModified': return file.lastModified || 0;
        case 'dateAdded': return file.created || file.lastModified || 0;
        case 'dimensions': return (file.width || 0) * (file.height || 0); // Area
        case 'aspectRatio': return (file.width || 1) / (file.height || 1);
        case 'path': return (file.folderPath || '') + '/' + file.name;
        case 'nameLength': return file.name.length;
        default: return 0;
    }
}

export default useMediaStore;
