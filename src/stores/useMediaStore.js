import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { extractAllMetadata, cancelExtraction, resetExtractionCache } from '../utils/metadataExtractor';

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
    videoSeekTimes: {}, // { [filePath]: seconds } — persists seek position across view transitions

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

    trailerSettings: {
        template: 'social', // 'social' | 'epic' | 'gym' | 'kinetic' | 'custom'
        templates: ['social'],
        targetDuration: 30, // seconds
        shortestClip: 0.2,
        longestClip: 1.0,
        allowDuplicates: true,
        allowSameSegment: false,
        mediaType: 'video', // 'video' | 'image'
        orientationFilter: 'all', // 'all' | 'horizontal' | 'vertical' | 'square'
        audioMixStrategy: 'muted', // 'muted' | 'subtle' | 'original' | 'ducking'
        slowmoPolicy: 'none', // 'none' | 'mixed' | 'all'
        audioTimelineStrategy: 'loop', // 'loop' | 'fade' | 'continue'
        matchAudioDuration: true,
        beatSensitivity: 0.5,
        // === Pro Engine: Editing Styles ===
        editingStyleMix: 'none', // 'none' | 'light' | 'heavy' | 'every'
        editingStyles: ['rubber-band-standard', 'multi-boomerang'],
        styleConfig: {
            rampFastSpeed: 2.5,
            rampSlowSpeed: 0.25,
            fastPortion: 0.12,
            slowPortion: 0.38,
            zoomRange: 145,
            boomerangSlices: 4,
            reversalChance: 0.85,
            burstMode: 'short',
        },
        // === Pro Engine: Transitions ===
        transitionsEnabled: true,
        transitionPreset: 'cinematic',
        maxSimultaneousTransitions: 1,
        simultaneousTransitionDelay: 0.2,
        // === Pro Engine: Grid Layouts ===
        includeGrids: 'off', // 'off' | 'mixed' | 'grids-only'
        // === Pro Engine: Orientation Filter ===
        orientationFilter: 'all', // 'all' | 'horizontal' | 'vertical' | 'square'
        // === Pro Engine: Beat Sync Intelligence ===
        beatPattern: 'auto', // 'auto' | 'every' | 'half' | 'quarter' | 'drops' | 'risers-drops'
        beatSyncStrategy: 'auto', // 'auto' | 'cut-on-beat' | 'transition-on-beat' | 'effect-on-drop' | 'riser-buildup' | 'groove-ride'
        selectedSegments: ['intro', 'buildup', 'drop', 'breakdown', 'chorus', 'verse', 'outro', 'bridge'],
    },
    setTrailerSettings: (settings) => set(state => ({ trailerSettings: { ...state.trailerSettings, ...settings } })),
    
    isTrailerModalOpen: false,
    setTrailerModalOpen: (val) => set({ isTrailerModalOpen: val }),

    trailerDraftSequence: null,
    setTrailerDraftSequence: (seq) => set({ trailerDraftSequence: seq }),
    clearTrailerDraftSequence: () => set({ trailerDraftSequence: null }),
    trailerUnsavedPromptEnabled: true,
    setTrailerUnsavedPromptEnabled: (val) => set({ trailerUnsavedPromptEnabled: val }),

    // === STREAM SETTINGS ===
    streamFeaturedFrequency: 'always', // 'always' | 'hourly' | 'daily'
    setStreamFeaturedFrequency: (val) => set({ streamFeaturedFrequency: val }),
    streamFeaturedSeed: 0,
    setStreamFeaturedSeed: (val) => set({ streamFeaturedSeed: val }),
    streamLastFeatured: 0, // Timestamp
    setStreamLastFeatured: (val) => set({ streamLastFeatured: val }),
    streamRowScrollMode: 'float', // 'auto' | 'float'
    setStreamRowScrollMode: (val) => set({ streamRowScrollMode: val }),
    streamLayoutMode: 'mixed', // 'mixed' | 'horizontal' | 'vertical'
    setStreamLayoutMode: (val) => set({ streamLayoutMode: val }),
    streamClusteringMode: 'prefix', // 'prefix' | 'delimiter'
    setStreamClusteringMode: (val) => set({ streamClusteringMode: val }),
    streamCategorizationMode: 'both', // 'folders' | 'system' | 'both'
    setStreamCategorizationMode: (val) => set({ streamCategorizationMode: val }),

    // === MULTI-SELECTION STATE ===
    explorerSelectedFiles: new Set(),
    setExplorerSelectedFiles: (updater) => set(state => ({ 
        explorerSelectedFiles: typeof updater === 'function' ? updater(state.explorerSelectedFiles) : updater 
    })),
    clearExplorerSelection: () => set({ explorerSelectedFiles: new Set() }),



    // === SLIDESHOW STATE ===
    slideshowActive: false,
    slideshowRandom: false,
    slideshowDuration: 5, // Default 5s (range: 1-90)
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
    adjustSlideshowDuration: (delta) => set(state => ({ slideshowDuration: Math.max(1, Math.min(90, state.slideshowDuration + delta)) })),
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

                // Kick off background metadata extraction after scan finishes
                if (type === 'SCAN_COMPLETE') {
                    setTimeout(() => extractAllMetadata(), 500);
                }
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
        nextGroup: 'g', // G key
        prevGroup: 'f', // F key
        volumeUp: 'ArrowUp',
        volumeDown: 'ArrowDown',
        scrollUp: 'ArrowUp', // Gallery View
        scrollDown: 'ArrowDown', // Gallery View
        randomJump: 'r', // R key — skip to random spot in video(s)
        toggleView: 'Escape', // ESC — cycle views sequentially
        fullscreen: ['Shift', 'F'], // Shift+F for fullscreen
        movieMode: 'm', // M key
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
    slideshowAutoAdvance: true,
    setSlideshowAutoAdvance: (val) => set({ slideshowAutoAdvance: val }),
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
    // Multi-select aspect ratio filters (Left Sidebar toggles)
    // When all three are active => show all. Toggling off one hides that orientation.
    aspectRatioFilters: ['horizontal', 'vertical', 'square'],
    toggleAspectRatioFilter: (orientation) => {
        set(state => {
            const current = state.aspectRatioFilters;
            const has = current.includes(orientation);
            // Don't allow deselecting all — keep at least one
            if (has && current.length <= 1) return {};
            const next = has ? current.filter(o => o !== orientation) : [...current, orientation];
            return { aspectRatioFilters: next };
        });
        get().updateProcessedFiles();
    },

    // === DISPLAY OPTIONS ===
    showJumpButtons: false,
    toggleJumpButtons: () => set(state => ({ showJumpButtons: !state.showJumpButtons })),
    controlsMode: 'full', // 'full' | 'standard' | 'shrunk'
    setControlsMode: (mode) => set({ controlsMode: mode }),
    cycleControlsMode: () => set(state => {
        const modes = ['full', 'standard', 'shrunk'];
        const next = modes[(modes.indexOf(state.controlsMode) + 1) % modes.length];
        return { controlsMode: next };
    }),

    // === ACTIVITY LOG (Studio Page) ===
    activityLog: [],
    addActivity: (entry) => set(state => ({
        activityLog: [{ ...entry, timestamp: Date.now(), id: Date.now() + Math.random() }, ...state.activityLog].slice(0, 200)
    })),
    clearActivityLog: () => set({ activityLog: [] }),

    // === STUDIO → GRID DRILL-DOWN FILTER ===
    // When a user clicks a stat/bar/row in Studio, this filter is set and they
    // are navigated to Grid view with only those files visible.
    studioFilter: null, // { type: string, label: string, filePaths: string[] } | null
    setStudioFilter: (filter) => {
        set({ studioFilter: filter });
        get().updateProcessedFiles();
    },
    clearStudioFilter: () => {
        set({ studioFilter: null });
        get().updateProcessedFiles();
    },

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
                // Absolute orientation: width > height = horizontal, height > width = vertical, equal = square
                const w = f.width || 0;
                const h = f.height || 0;
                
                if (metadataFilters.aspectRatio === 'horizontal') return w > h;
                if (metadataFilters.aspectRatio === 'vertical') return h > w;
                if (metadataFilters.aspectRatio === 'square') return w === h;
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

    setAppViewMode: (mode) => set(state => {
        const nextState = {
            appViewMode: mode,
            previousViewMode: state.appViewMode !== mode ? state.appViewMode : state.previousViewMode
        };
        // Safety: Wipe slideshow auto-advance states when leaving slideshow
        // but PRESERVE currentFileIndex, gridColumns, gridRows so video position is maintained
        if (mode !== 'slideshow') {
            nextState.slideshowActive = false;
            nextState.slideshowAutoAdvance = false;
            nextState.superSlideshowActive = false;
            nextState.slideshowIdle = false;
        }
        return nextState;
    }),
    setMediaContextMenu: (menu) => set({ mediaContextMenu: menu }),

    // Video seek position persistence across Standard ↔ Slideshow transitions
    setVideoSeekTime: (filePath, time) => set(state => ({
        videoSeekTimes: { ...state.videoSeekTimes, [filePath]: time }
    })),
    getVideoSeekTime: (filePath) => get().videoSeekTimes[filePath] || 0,
    clearVideoSeekTime: (filePath) => set(state => {
        const next = { ...state.videoSeekTimes };
        delete next[filePath];
        return { videoSeekTimes: next };
    }),

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
        const { processedFiles, setCurrentFileIndex, setAppViewMode, appViewMode } = get();
        const index = processedFiles.findIndex(f => f.path === path);
        if (index !== -1) {
            setCurrentFileIndex(index);
            if (appViewMode === 'stream') {
                set({ 
                    slideshowAutoAdvance: false, 
                    gridColumns: 1, 
                    gridRows: 1,
                    slideshowActive: true
                });
            } else {
                set({ slideshowActive: true });
            }
            setAppViewMode('slideshow');
        } else {
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
    clearFiles: () => {
        cancelExtraction();
        resetExtractionCache();
        set({ files: [], folders: [], currentFileIndex: -1, currentFolder: null, activeFolders: [] });
    },
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
    toggleMovieMode: () => set((state) => ({ 
        movieMode: !state.movieMode,
        // Safety: If we're exiting movie mode, turn off the slideshow timer so it doesn't bleed into standard grid
        slideshowActive: state.movieMode ? false : state.slideshowActive
    })),
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
    _metadataDebounce: null,
    updateFileMetadata: (path, metadata) => {
        set((state) => ({
            files: state.files.map(f => f.path === path ? { ...f, ...metadata } : f)
        }));
        // Debounce the sort recalculation during batch extraction
        if (get()._metadataDebounce) clearTimeout(get()._metadataDebounce);
        const timeout = setTimeout(() => {
            get().updateProcessedFiles();
        }, 1000);
        set({ _metadataDebounce: timeout });
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
    setFolderSortMode: (mode) => set({ folderSortMode: mode }),

    setSidebarGridColumns: (cols) => set({ sidebarGridColumns: cols }),


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
        const { files, folders, fileTypeFilter, sortStack, activeFolders, explorerSearchQuery, showDuplicates, excludedFolders, excludedItems, studioFilter, aspectRatioFilters } = get();

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

        // 0.3 Studio drill-down filter (highest priority — restricts to specific file set)
        if (studioFilter && studioFilter.filePaths && studioFilter.filePaths.length > 0) {
            const pathSet = new Set(studioFilter.filePaths);
            filtered = filtered.filter(f => pathSet.has(f.path));
        }

        // 0.4 Multi-select aspect ratio filter (Left Sidebar toggles)
        if (aspectRatioFilters && aspectRatioFilters.length < 3) {
            filtered = filtered.filter(f => {
                const w = f.width || 0;
                const h = f.height || 0;
                if (w === 0 && h === 0) return true; // No metadata yet, show it
                const isHoriz = w > h;
                const isVert = h > w;
                const isSquare = w === h;
                if (isHoriz && aspectRatioFilters.includes('horizontal')) return true;
                if (isVert && aspectRatioFilters.includes('vertical')) return true;
                if (isSquare && aspectRatioFilters.includes('square')) return true;
                return false;
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
                // Absolute orientation: width > height = landscape, height > width = portrait, equal = square
                const w = f.width || 0;
                const h = f.height || 0;
                if (metadataFilters.aspectRatio === 'horizontal') return w > h;
                if (metadataFilters.aspectRatio === 'vertical') return h > w;
                if (metadataFilters.aspectRatio === 'square') return w === h;
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
        viewMode: state.viewMode, // Grid layout persistence across sessions
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
        aspectRatioFilters: state.aspectRatioFilters, // Multi-select orientation filter
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
        favoritesOnly: state.favoritesOnly,
        keyboardBindings: state.keyboardBindings,
        controlsMode: state.controlsMode
    }),
}));

// Helper to get safe sort values
function getSortValue(file, field) {
    switch (field) {
        case 'name':
        case 'title': return file.name;
        case 'type': return file.type;
        case 'size': return file.size || 0;
        case 'date':
        case 'lastModified':
        case 'dateModified': return file.lastModified || 0;
        case 'dateCreated':
        case 'dateAdded': return file.created || file.lastModified || 0;
        case 'mediaDate': return file.mediaDate || file.lastModified || 0;
        case 'dimensions': return (file.width || 0) * (file.height || 0); // Frame area (H × W)
        case 'frameSize': {
            // Sort by height first, then width (useful for grouping resolutions)
            const h = file.height || 0;
            const w = file.width || 0;
            return h * 100000 + w;
        }
        case 'aspectRatio': return (file.width || 1) / (file.height || 1);
        case 'length':
        case 'duration': return file.duration || 0;
        case 'framerate': return file.framerate || file.fps || 0;
        case 'bitrate': return file.bitrate || 0;
        case 'year': {
            const ts = file.mediaDate || file.lastModified || 0;
            return ts ? new Date(ts).getFullYear() : 0;
        }
        case 'folder':
        case 'folders': return file.folderPath || '';
        case 'path': return (file.folderPath || '') + '/' + file.name;
        case 'nameLength': return file.name.length;
        default: return 0;
    }
}

export default useMediaStore;
