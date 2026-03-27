import React, { useState, useRef, useEffect } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import {
    FolderOpen, Save, FileUp, RefreshCw, Trash2, RotateCcw,
    Monitor, Grid, Layers, Layout, LayoutDashboard, Info,
    Sun, Moon, Cloud, Check, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { openDirectory } from '../../utils/fileSystem';
import { clearThumbnailCache } from '../../utils/thumbnailCache';

// SUBMENU COMPONENT
const SubMenu = ({ label, icon: Icon, children, isOpen, onMouseEnter, onMouseLeave }) => {
    return (
        <div
            className="relative px-4 py-2 hover:bg-white/10 flex items-center justify-between cursor-pointer group"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} />}
                <span>{label}</span>
            </div>
            <ChevronRight size={12} />

            {/* Submenu Dropdown */}
            {isOpen && (
                <div className="absolute left-full top-0 ml-1 w-48 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg shadow-xl py-1 z-50">
                    {children}
                </div>
            )}
        </div>
    );
};

// MENU ITEM
const MenuItem = ({ label, icon: Icon, onClick, shortcut, active, danger }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick?.();
        }}
        className={clsx(
            "w-full px-4 py-2 flex items-center justify-between text-left hover:bg-white/10 transition-colors",
            active ? "text-[var(--accent-primary)] font-medium" : "text-[var(--text-primary)]",
            danger && "text-red-400 hover:text-red-300 hover:bg-red-500/10"
        )}
    >
        <div className="flex items-center gap-2">
            {Icon && <Icon size={14} className={clsx(active && "text-[var(--accent-primary)]")} />}
            <span>{label}</span>
        </div>
        {shortcut && <span className="text-secondary text-[10px] opacity-50 font-mono">{shortcut}</span>}
        {active && <Check size={14} />}
    </button>
);

const MenuBar = ({ onOpenGuide }) => {
    const {
        setFolderHandle, clearFiles, addFiles, setFolders, setCurrentFolder,
        saveSession, loadSession,
        viewMode, setViewMode, setGridLayout, gridColumns, gridRows,
        theme, setTheme, themeMode, setThemeMode
    } = useMediaStore();

    const [activeMenu, setActiveMenu] = useState(null);
    const [hoveredSubMenu, setHoveredSubMenu] = useState(null);
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
                setHoveredSubMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenFolder = async () => {
        const handle = await openDirectory();
        if (handle) {
            setFolderHandle(handle);
            setCurrentFolder(`/${handle.name}`);
            clearFiles();
            // Trigger scan (usually moved to a separate file logic, but keeping inline for now)
            // ... (worker logic assumed centralized or handled by sidebar/layout)
            // Ideally Sidebar handles the scan. 
            // For now, let's assume Sidebar watches folderHandle or we trigger it via Store.
            // Actually, we pass a worker. Sidebar has the worker logic inside it. 
            // We should ideally lift the worker to Layout or Store. 
            // Reuse logic? Dispatch event?
            // For now, let's just trigger a reload or sidebar detection if possible.
            // Actually, `LeftSidebar` has the scanning logic. 
            // If we set folder handle in store, Sidebar might need to react.
            // FIXME: Logic split. We'll just set store and let Sidebar effect pick it up?
            // Sidebar doesn't have an effect on folderHandle. It initiates scan on button click.
            // Let's trigger a custom event or straightforward: Just ask UI to reload.
            window.location.reload(); // Brute force simplicity for "Open" from top.
        }
        setActiveMenu(null);
    };

    const toggleMenu = (menu) => {
        setActiveMenu(activeMenu === menu ? null : menu);
        setHoveredSubMenu(null);
    };

    // LAYOUT HELPERS
    // 2x2 Vertical (Side-by-Side): 2 Columns, 1 Row? No, that's just 2 cols.
    // "vertical is side by side" -> 2 items. | A | B |
    // "Horizontal is one on top of the other" -> 2 items. | A |
    //                                                     | B |
    const setDualSideBySide = () => setGridLayout(2, 1);
    const setDualStacked = () => setGridLayout(1, 2);

    // Quad Grid 4x4 -> 2x2 grid (4 items)
    const setQuadGrid = () => setGridLayout(2, 2);
    // Quad Strip -> 4 vertical items side by side? 4 Columns, 1 Row.
    const setQuadStrip = () => setGridLayout(4, 1);

    // Hero: 3 items (1 big)
    const setHeroStrip = () => setGridLayout(3, 1); // Or 1x3 vertical

    return (
        <div ref={menuRef} className="h-8 glass-header flex items-center px-4 gap-4 text-xs select-none z-50">
            <div className="font-bold text-[var(--accent-primary)] mr-2 tracking-widest">MMM</div>

            {/* FILE MENU */}
            <div className="relative">
                <button
                    onClick={() => toggleMenu('file')}
                    className={clsx("px-3 py-1 rounded hover:bg-white/10 transition-colors", activeMenu === 'file' && "bg-white/10 text-white")}
                >
                    File
                </button>
                {activeMenu === 'file' && (
                    <div className="absolute top-full left-0 w-56 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-b-lg shadow-xl py-1 flex flex-col z-50">
                        <MenuItem label="Open Folder" icon={FolderOpen} onClick={() => { /* See note above */ window.location.reload(); }} shortcut="Ctrl+O" />
                        <div className="h-px bg-white/10 my-1 mx-2" />
                        <MenuItem label="Save Session" icon={Save} onClick={() => { saveSession(); setActiveMenu(null); }} />
                        <MenuItem label="Load Session" icon={FileUp} onClick={() => { loadSession(); setActiveMenu(null); }} />
                        <div className="h-px bg-white/10 my-1 mx-2" />
                        <MenuItem label="Reload App" icon={RefreshCw} onClick={() => window.location.reload()} danger />
                    </div>
                )}
            </div>

            {/* EDIT MENU */}
            <div className="relative">
                <button
                    onClick={() => toggleMenu('edit')}
                    className={clsx("px-3 py-1 rounded hover:bg-white/10 transition-colors", activeMenu === 'edit' && "bg-white/10 text-white")}
                >
                    Edit
                </button>
                {activeMenu === 'edit' && (
                    <div className="absolute top-full left-0 w-56 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-b-lg shadow-xl py-1 flex flex-col z-50">
                        <MenuItem label="Clear Thumbnail Cache" icon={Trash2} onClick={() => { clearThumbnailCache(); window.location.reload(); }} />
                        <MenuItem label="Reset Settings" icon={RotateCcw} onClick={() => { localStorage.clear(); window.location.reload(); }} danger />
                    </div>
                )}
            </div>

            {/* VIEW MENU */}
            <div className="relative">
                <button
                    onClick={() => toggleMenu('view')}
                    className={clsx("px-3 py-1 rounded hover:bg-white/10 transition-colors", activeMenu === 'view' && "bg-white/10 text-white")}
                >
                    View
                </button>
                {activeMenu === 'view' && (
                    <div className="absolute top-full left-0 w-64 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-b-lg shadow-xl py-1 flex flex-col z-50">

                        {/* LAYOUTS */}

                        <div className="h-px bg-white/10 my-1 mx-2" />

                        {/* LAYOUTS */}
                        <MenuItem label="Single View" icon={Monitor} onClick={() => setGridLayout(1, 1)} active={viewMode === 'single'} />
                        <MenuItem label="Dual Vertical (Side-by-Side)" icon={Columns} onClick={setDualSideBySide} active={gridColumns === 2 && gridRows === 1} />
                        <MenuItem label="Dual Stacked (Horizontal)" icon={Rows} onClick={setDualStacked} active={gridColumns === 1 && gridRows === 2} />
                        <MenuItem label="Quad Grid (2x2)" icon={Grid} onClick={setQuadGrid} active={gridColumns === 2 && gridRows === 2} />
                        <MenuItem label="Quad Strip (4x1)" icon={Layout} onClick={setQuadStrip} active={gridColumns === 4 && gridRows === 1} />
                        <MenuItem label="Hero Strip (3 items)" icon={LayoutDashboard} onClick={setHeroStrip} active={gridColumns === 3 && gridRows === 1} />
                    </div>
                )}
            </div>

            {/* INFO MENU */}
            <div className="relative">
                <button
                    onClick={() => toggleMenu('info')}
                    className={clsx("px-3 py-1 rounded hover:bg-white/10 transition-colors", activeMenu === 'info' && "bg-white/10 text-white")}
                >
                    Info
                </button>
                {activeMenu === 'info' && (
                    <div className="absolute top-full left-0 w-48 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-b-lg shadow-xl py-1 flex flex-col z-50">
                        <MenuItem label="User Guide" icon={Info} onClick={() => { onOpenGuide(true); setActiveMenu(null); }} />
                    </div>
                )}
            </div>

        </div>
    );
};

export default MenuBar;
