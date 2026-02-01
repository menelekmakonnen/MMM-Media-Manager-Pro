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

    // === FILTERING ===
    fileTypeFilter: ['video'], // Default to video per request
    explorerSearchQuery: '',
    itemRotations: {},
    processedFiles: [],
    visibleLimit: 1000, // Chunked loading limit
    isScanning: false,
    scannedCount: 0,
    currentWorker: null,

    // === SLIDESHOW STATE ===
    slideshowActive: false,
    slideshowRandom: false,
    slideshowDuration: 5, // Default 5s (3, 5, 10, 30)
    slideshowTransition: 'slide', // 'fade' | 'slide' | 'zoom' | 'swipe' | 'flip'
    superSlideshowActive: false,

    // === ACTIONS: Slideshow ===
    setSlideshowDuration: (duration) => set({ slideshowDuration: duration }),
    setSlideshowTransition: (mode) => set({ slideshowTransition: mode }),
    setSuperSlideshowActive: (active) => set({ superSlideshowActive: active }),
    toggleSuperSlideshow: () => set(state => ({ superSlideshowActive: !state.superSlideshowActive })),

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
        const delay = isScanning ? 1500 : 100; // Increased scan throttle to 1.5s

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
    globalViewMode: 'normal',
    fullscreenMode: false,
    movieMode: false,
    viewMode: 'single', // 'single' | 'grid' | 'custom'
    explorerViewMode: 'grid',
    sidebarViewMode: 'grid',
    sidebarGridColumns: 3,
    gridColumns: 1,
    gridRows: 1,
    theme: 'default',
    themeMode: 'dark',
    threeGridEqual: false,
    nineGridHero: false,

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
    grayscaleInactive: false,
    thumbnailSize: 120,
    thumbnailOrientation: 'vertical',
    zoomMode: 'fit',
    widescreen: false,
    explorerGridColumns: 3,
    showDuplicates: false,
    slideshowActive: false,
    slideshowRandom: false,

    setExplorerGridColumns: (cols) => set({ explorerGridColumns: cols }),



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
    addFiles: (newFiles) => set((state) => ({ files: [...state.files, ...newFiles] })),

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
        const { getSortedFiles, currentFileIndex } = get();
        const sorted = getSortedFiles();
        if (currentFileIndex >= 0 && currentFileIndex < sorted.length) {
            return sorted[currentFileIndex];
        }
        return null;
    },

    nextFile: () => {
        const sorted = get().getSortedFiles();
        const { currentFileIndex } = get();
        if (sorted.length === 0) return;
        const nextIndex = (currentFileIndex + 1) % sorted.length;
        set({ currentFileIndex: nextIndex });
    },

    prevFile: () => set((state) => {
        const sorted = get().getSortedFiles();
        if (sorted.length === 0) return {};
        // Fix loopback logic: (current - 1 + total) % total
        const newIndex = (state.currentFileIndex - 1 + sorted.length) % sorted.length;
        return { currentFileIndex: newIndex };
    }),

    firstFile: () => set({ currentFileIndex: 0 }),
    lastFile: () => {
        const sorted = get().getSortedFiles();
        set({ currentFileIndex: sorted.length - 1 });
    },

    // Skip by grid size (for groups)
    skipGroup: (direction = 1) => {
        const { gridColumns, gridRows, currentFileIndex } = get();
        const sorted = get().getSortedFiles();
        if (sorted.length === 0) return;

        const groupSize = gridColumns * gridRows;
        const newIndex = currentFileIndex + (groupSize * direction);

        // Wrap around
        const wrappedIndex = ((newIndex % sorted.length) + sorted.length) % sorted.length;
        set({ currentFileIndex: wrappedIndex });
    },

    // === ACTIONS: View Modes ===
    setGlobalViewMode: (mode) => set({ globalViewMode: mode }),
    setFullscreenMode: (val) => set({ fullscreenMode: val }),
    toggleFullscreen: () => set((state) => ({ fullscreenMode: !state.fullscreenMode })),
    toggleMovieMode: () => set((state) => ({ movieMode: !state.movieMode })),
    setViewMode: (mode) => set({ viewMode: mode }),
    setExplorerViewMode: (mode) => set({ explorerViewMode: mode }),
    setSidebarViewMode: (mode) => set({ sidebarViewMode: mode }),
    setGridLayout: (columns, rows) => set({ gridColumns: columns, gridRows: rows, viewMode: 'custom' }),
    setTheme: (theme) => set({ theme }),
    setThemeMode: () => set({ themeMode: 'dark' }), // Enforced Dark Mode
    toggleSlideshow: () => set((state) => ({ slideshowActive: !state.slideshowActive })),
    setSlideshowRandom: (val) => set({ slideshowRandom: val }),

    // === ACTIONS: Sorting ===
    setSortStack: (stack) => {
        set({ sortStack: stack });
        get().updateProcessedFiles();
    },
    toggleSort: (field) => {
        set((state) => {
            const existing = state.sortStack.find(s => s.field === field);
            if (existing) {
                return { sortStack: [{ field, order: existing.order === 'asc' ? 'desc' : 'asc' }] };
            }
            return { sortStack: [{ field, order: 'asc' }] };
        });
        get().updateProcessedFiles();
    },

    // === ACTIONS: Metadata ===
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

    // === GRID TOGGLES ===
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
        set((state) => ({ sortBy: 'random', shuffleSeed: state.shuffleSeed + 1 }));
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
        const existingPaths = new Set(state.files.map(f => f.path));
        const unique = newFiles.filter(f => !existingPaths.has(f.path));
        return { files: [...state.files, ...unique] };
    }),
    addFoldersOnly: (newFolders) => set((state) => {
        const folderMap = new Map(state.folders.map(f => [f.path, f]));
        newFolders.forEach(f => folderMap.set(f.path, f));
        return { folders: Array.from(folderMap.values()) };
    }),

    // === COMPUTED: Sorted Files ===
    calculateSortedFiles: () => {
        const { files, folders, fileTypeFilter, sortStack, activeFolders, explorerSearchQuery, showDuplicates } = get();

        // 1. Filter by Active Folders (if any)
        let filtered = files;
        if (activeFolders && activeFolders.length > 0) {
            // DEBUG: Log filtering attempt
            console.log('[useMediaStore] Filtering by Active Folders:', activeFolders, 'Total Files:', files.length);

            const folderSet = new Set(activeFolders);
            filtered = files.filter(f => {
                if (folderSet.has(f.folderPath)) return true;
                // Optimization: Avoid startsWith for every file if possible
                return activeFolders.some(folder => f.folderPath?.startsWith(folder + '/'));
            });
            console.log('[useMediaStore] Filtered Result:', filtered.length);
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
        metadataFilters: state.metadataFilters,
        fileTypeFilter: state.fileTypeFilter,
        threeGridEqual: state.threeGridEqual,
        nineGridHero: state.nineGridHero
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
