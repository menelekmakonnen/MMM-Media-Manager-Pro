import React, { useState } from 'react';
import useMediaStore from '../../../stores/useMediaStore';
import clsx from 'clsx';
import { Settings2, Keyboard, Sliders, Layout, Film, Image as ImageIcon, LayoutGrid, Check, CheckCircle2, MonitorPlay, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BridgeStatus from '../../BridgeStatus';
import ProBridgeActions from '../../ProBridgeActions';

const SettingsView = () => {
    const { settingsStartupTab, setSettingsStartupTab } = useMediaStore();
    const [activeTab, setActiveTab] = useState(settingsStartupTab || 'general');

    const tabs = [
        { id: 'general', label: 'General / System', icon: Settings2 },
        { id: 'appearance', label: 'Appearance & Themes', icon: Layout },
        { id: 'standard', label: 'Grid / Slideshow', icon: LayoutGrid },
        { id: 'stream', label: 'Stream Engine', icon: MonitorPlay },
        { id: 'gallery', label: 'Gallery Engine', icon: ImageIcon },
        { id: 'editor', label: 'Timeline Editor', icon: Film },
        { id: 'keyboard', label: 'Keyboard Mapping', icon: Keyboard },
        { id: 'bridge', label: 'Pro Bridge', icon: Link2 },
        { id: 'self', label: 'App Settings', icon: Sliders }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralSettings />;
            case 'appearance': return <AppearanceSettings />;
            case 'standard': return <StandardSlideshowSettings />;
            case 'stream': return <StreamSettings />;
            case 'gallery': return <GallerySettings />;
            case 'editor': return <EditorSettings />;
            case 'keyboard': return <KeyboardSettings />;
            case 'bridge': return <ProBridgeSettings />;
            case 'self': return <SelfSettings />;
            default: return null;
        }
    };

    return (
        <div className="h-full w-full flex bg-transparent text-white overflow-hidden relative font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[var(--accent-primary)]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[var(--accent-secondary)]/5 blur-[150px] rounded-full pointer-events-none" />

            {/* Premium Glass Sidebar */}
            <div className="w-72 border-r border-white/5 bg-white/[0.02] backdrop-blur-2xl flex flex-col pt-8 shrink-0 z-10 shadow-2xl relative">
                <div className="px-8 pb-8 mb-4 border-b border-white/5 shrink-0">
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                        <div className="p-2 bg-[var(--accent-primary)]/20 rounded-xl border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-primary)]">
                            <Settings2 size={24} className="text-[var(--accent-primary)]" />
                        </div>
                        Settings
                    </h2>
                    <p className="text-xs text-gray-500 mt-3 font-medium tracking-wide">Configure MMMedia Darkroom</p>
                </div>
                
                <div className="flex-1 overflow-y-auto w-full px-4 py-2 space-y-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all group relative overflow-hidden",
                                    isActive 
                                        ? "text-white shadow-lg bg-white/10 border border-white/10" 
                                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTabIndicator"
                                        className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]"
                                    />
                                )}
                                <Icon size={18} className={clsx(
                                    "transition-transform",
                                    isActive ? "text-[var(--accent-primary)] scale-110" : "text-gray-500 group-hover:scale-110"
                                )} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-12 relative z-10 scroll-smooth">
                <div className="max-w-4xl mx-auto pb-32">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

/* --- GLOBAL UI SUBCOMPONENTS --- */

const SettingsHeader = ({ title, description }) => (
    <div className="mb-10">
        <h3 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">{title}</h3>
        {description && <p className="text-base text-gray-400 mt-2 font-medium max-w-2xl">{description}</p>}
    </div>
);

const SettingSection = ({ title, children }) => (
    <div className="mb-8 bg-[#11131A]/80 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative group hover:border-white/10 transition-colors">
        {title && (
            <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]/80 drop-shadow-sm">{title}</h4>
            </div>
        )}
        <div className="p-8 space-y-8">
            {children}
        </div>
    </div>
);

const ToggleSwitch = ({ label, description, checked, onChange }) => {
    const { showSettingsTooltips } = useMediaStore();
    return (
        <div className="flex items-center justify-between gap-8 group/toggle cursor-pointer" onClick={() => onChange(!checked)}>
            <div className="flex-1 w-full max-w-xl">
                <h5 className="font-bold text-gray-200 text-base">{label}</h5>
                {showSettingsTooltips && description && <p className="text-sm text-gray-400/90 mt-1.5 leading-relaxed">{description}</p>}
            </div>
            <button
                className={clsx(
                    "w-14 h-7 rounded-full relative transition-all duration-300 focus:outline-none flex-shrink-0 shadow-inner overflow-hidden",
                    checked ? "bg-[var(--accent-primary)]" : "bg-white/10 hover:bg-white/20"
                )}
            >
                <div className={clsx(
                    "absolute top-1 left-1 bg-white w-5 h-5 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center",
                    checked ? "translate-x-7" : "translate-x-0"
                )}>
                    {checked && <Check size={12} className="text-[var(--accent-primary)]" />}
                </div>
            </button>
        </div>
    );
};

const NumberInput = ({ label, description, value, onChange, min = 0, max = 100000, step = 1 }) => {
    const { showSettingsTooltips } = useMediaStore();
    return (
        <div className="flex items-center justify-between gap-8 group/input">
            <div className="flex-1 w-full max-w-xl">
                <h5 className="font-bold text-gray-200 text-base">{label}</h5>
                {showSettingsTooltips && description && <p className="text-sm text-gray-400/90 mt-1.5 leading-relaxed">{description}</p>}
            </div>
            <input 
                type="number" 
                value={value} 
                onChange={(e) => onChange(Number(e.target.value))} 
                min={min} max={max} step={step}
                className="w-28 bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-white font-mono text-center focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all shadow-inner"
            />
        </div>
    );
};

const SelectInput = ({ label, description, value, onChange, options }) => {
    const { showSettingsTooltips } = useMediaStore();
    return (
        <div className="flex items-center justify-between gap-8 group/input">
            <div className="flex-1 w-full max-w-xl">
                <h5 className="font-bold text-gray-200 text-base">{label}</h5>
                {showSettingsTooltips && description && <p className="text-sm text-gray-400/90 mt-1.5 leading-relaxed">{description}</p>}
            </div>
            <select 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-black/40 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all min-w-[180px] shadow-inner font-sans appearance-none cursor-pointer"
                style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#11131A] text-white">{opt.label}</option>
                ))}
            </select>
        </div>
    );
};

const Divider = () => <div className="block border-t border-white/5 my-8"></div>;

/* --- SETTINGS TABS CONTENT --- */

const GeneralSettings = () => {
    const { 
        showDuplicates, setShowDuplicates, 
        folderSortMode, hardwareAcceleration, setHardwareAcceleration 
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="General System Config" description="Core OS interaction and high level filesystem rules." />
            
            <SettingSection title="File Parsing Rules">
                <ToggleSwitch 
                    label="Show Duplicate Files" 
                    description="When disabled, files across the filesystem with identically matching sizes and names are reduced down to a single visual element."
                    checked={showDuplicates}
                    onChange={setShowDuplicates}
                />
            </SettingSection>

            <SettingSection title="Explorer Tree Directives">
                 <SelectInput
                     label="Default Folder Sorting Mode"
                     description="Determines how sub-folder chains in the Left Sidebar Explorer are sequentially arranged."
                     value={folderSortMode || 'name'}
                     onChange={() => {}} 
                     options={[
                         {label: 'By Name (A-Z)', value: 'name'},
                         {label: 'By Item Count', value: 'count'},
                         {label: 'By Creation Date', value: 'date'},
                         {label: 'By Modification Age', value: 'age'}
                     ]}
                 />
            </SettingSection>

            <SettingSection title="Hardware & Optimization">
                 <ToggleSwitch 
                    label="Background Hardware Acceleration" 
                    description="Permit features like the Video Timeline Editor or automated processing agents to pull from system GPU threads rather than CPU alone. (Useful if rendering gets sluggish)."
                    checked={hardwareAcceleration}
                    onChange={setHardwareAcceleration}
                />
            </SettingSection>
        </div>
    );
};

const THEMES = [
    { id: 'default', name: 'Darkroom Base', color: 'bg-[#3b82f6]', border: 'border-blue-500' },
    { id: 'outer-space', name: 'Outer Space', color: 'bg-[#c084fc]', border: 'border-indigo-400' },
    { id: 'winter', name: 'Winter Glass', color: 'bg-[#0ea5e9]', border: 'border-blue-300' },
    { id: 'spring', name: 'Spring Blossom', color: 'bg-[#ec4899]', border: 'border-pink-400' },
    { id: 'summer', name: 'Summer Ocean', color: 'bg-[#14b8a6]', border: 'border-teal-400' },
    { id: 'autumn', name: 'Autumn Rust', color: 'bg-[#ea580c]', border: 'border-orange-500' },
    { id: 'harmattan', name: 'Harmattan Dust', color: 'bg-[#a16207]', border: 'border-yellow-600' }
];

const AppearanceSettings = () => {
    const { 
        theme, setTheme,
        themeMode, toggleThemeMode, 
        thumbnailSize, setThumbnailSize,
        thumbnailOrientation, setThumbnailOrientation,
        showSettingsTooltips
    } = useMediaStore();
    
    return (
        <div className="space-y-6">
            <SettingsHeader title="Global Appearance" description="Aesthetic layout styling, colors, and universal rendering." />
            
            <SettingSection title="Color Engine">
                <div className="space-y-6">
                    <div>
                        <h5 className="font-bold text-gray-200 text-base mb-4">Application Theme Identity</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={clsx(
                                        "flex items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105 active:scale-95 group",
                                        theme === t.id 
                                            ? `bg-white/10 ${t.border} shadow-[0_0_20px_rgba(255,255,255,0.05)]` 
                                            : "bg-white/5 border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <span className={clsx("w-6 h-6 rounded-full shadow-inner flex items-center justify-center", t.color)}>
                                        {theme === t.id && <CheckCircle2 size={14} className="text-white drop-shadow-md" />}
                                    </span>
                                    <span className={clsx("text-sm font-bold", theme === t.id ? "text-white" : "text-gray-400 group-hover:text-gray-200")}>
                                        {t.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <Divider />
                    <ToggleSwitch 
                        label="Deep Space Focus (AMOLED Mode)" 
                        description="If toggled, the application will drop the ambient space fog renderer and switch entirely into a pitch-black background mode to save energy and increase image contrast."
                        checked={themeMode === 'deep'}
                        onChange={toggleThemeMode}
                    />
                </div>
            </SettingSection>

            <SettingSection title="Preview Object Sizing">
                 <NumberInput
                     label="Explorer Thumbnail Paint Size (px)"
                     description="Scale the explicit resolution mapping for side-bars and tooltips. Lowering this increases speed but introduces blur."
                     value={thumbnailSize}
                     onChange={setThumbnailSize}
                     min={50} max={400} step={10}
                 />
                 <Divider />
                 <SelectInput
                     label="Aspect Masking"
                     description="Force thumbnails spanning layout elements to respect a single layout geometry type."
                     value={thumbnailOrientation}
                     onChange={setThumbnailOrientation}
                     options={[
                         {label: 'Vertical Mode (IG/Tiktok)', value: 'vertical'},
                         {label: 'Horizontal Mode (Cinema)', value: 'horizontal'},
                         {label: '1:1 Uniform Crop', value: 'square'}
                     ]}
                 />
            </SettingSection>
        </div>
    );
};

const StandardSlideshowSettings = () => {
    const { 
        defaultGridCount, setDefaultGridCount,
        cinemaModeOnLaunch, setCinemaModeOnLaunch,
        continuousPlayback, setContinuousPlayback,
        mediaFitMode, toggleMediaFitMode,
        threeGridEqual, setThreeGridEqual,
        nineGridHero, setNineGridHero,
        grayscaleInactive, setGrayscaleInactive,
        widescreen, setWidescreen,
        slideTransitionEffect, setSlideTransitionEffect,
        slideshowDuration, setSlideshowDuration,
        slideshowRandom, setSlideshowRandom,
        slideshowCursorHide, setSlideshowCursorHide
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="Grid Engine & Presentations" description="Control behaviors specifically for Standard View and Slideshow Show View." />
            
            <SettingSection title="Standard View Initialization">
                <SelectInput
                     label="Default Grid Start Capacity"
                     description="When loading the application, instantly set the viewer to one of these multi-track sizes."
                     value={defaultGridCount}
                     onChange={(v) => setDefaultGridCount(Number(v))}
                     options={[
                         {label: 'Single Player (1x1)', value: 1},
                         {label: 'Dual Player (2x1)', value: 2},
                         {label: 'Triple Player (3x1)', value: 3},
                         {label: 'Quad Dashboard (2x2)', value: 4},
                         {label: 'Six Grid Matrix (3x2)', value: 6},
                         {label: 'Nine Grid Box (3x3)', value: 9},
                         {label: 'Twelve Tracker (4x3)', value: 12}
                     ]}
                 />
                 <Divider />
                 <ToggleSwitch 
                    label="Auto-enter Cinema Mode" 
                    description="Hide lateral sidebars immediately when switching to Standard view."
                    checked={cinemaModeOnLaunch}
                    onChange={setCinemaModeOnLaunch}
                />
            </SettingSection>

            <SettingSection title="Grid Layout Nuances">
                <ToggleSwitch 
                    label="Lock Media to Cover Frame (Global)" 
                    description="If toggled, unrotated videos/images expand completely until touching grid edges instead of boxing dynamically (Fit)."
                    checked={mediaFitMode === 'cover'}
                    onChange={() => toggleMediaFitMode()}
                />
                <Divider />
                <ToggleSwitch 
                    label="Widescreen Mode Alignment" 
                    description="Trim vertical paddings across the application grid array to support ultra-widescreen monitors."
                    checked={widescreen}
                    onChange={setWidescreen}
                />
                <Divider />
                <ToggleSwitch 
                    label="Equal 3-Grid (Left-Align)" 
                    description="Instead of granting the lead spot ~50% visual focus in a Tri-Grid, force all items 33/33/33 width."
                    checked={threeGridEqual}
                    onChange={setThreeGridEqual}
                />
                <Divider />
                <ToggleSwitch 
                    label="Hero Focus (Nine grid Matrix)" 
                    description="The Top-Left video consumes 4 sub-box squares giving it a massive lead. Turn off for equal rows."
                    checked={nineGridHero}
                    onChange={setNineGridHero}
                />
                <Divider />
                <ToggleSwitch 
                    label="Dimming Inactive Grid Borders" 
                    description="Only the video explicitly hovering or receiving interaction maintains its RGB mapping, all others fade into pure black-and-white."
                    checked={grayscaleInactive}
                    onChange={setGrayscaleInactive}
                />
            </SettingSection>

            <SettingSection title="Slideshow Show Config">
                 <SelectInput
                     label="Core Transition Animation"
                     description="Changes the interpolation engine moving files between the active rendering array."
                     value={slideTransitionEffect}
                     onChange={setSlideTransitionEffect}
                     options={[
                         {label: 'Smooth Fade', value: 'fade'},
                         {label: 'Slide Over', value: 'slide'},
                         {label: 'Bounce Zoom', value: 'zoom'},
                         {label: 'Tinder Swipe', value: 'swipe'},
                         {label: 'Instant Refresh', value: 'none'}
                     ]}
                 />
                 <Divider />
                 <NumberInput
                     label="Interval Step Rate (ms)"
                     description="How long static documents and images rest on screen before automated skip triggers (minimum 1000)."
                     value={slideshowDuration}
                     onChange={setSlideshowDuration}
                     min={1000} max={90000} step={250}
                 />
                 <Divider />
                 <ToggleSwitch 
                    label="Random Start Shuffling" 
                    description="Launch auto-presentations by scrambling the hash map order natively rather than playing A-Z."
                    checked={slideshowRandom}
                    onChange={setSlideshowRandom}
                />
                <Divider />
                <ToggleSwitch 
                    label="Continuous Video Looping" 
                    description="Videos inside slideshows will repeat instantly instead of skipping. If disabled, a video hitting its EOF will trigger the Next item."
                    checked={continuousPlayback}
                    onChange={setContinuousPlayback}
                />
                <Divider />
                <ToggleSwitch 
                    label="Inactivity Cursor Blackout" 
                    description="Auto-hides your mouse if it rests out of the layout bounds for over 2 seconds in a presentation."
                    checked={slideshowCursorHide}
                    onChange={setSlideshowCursorHide}
                />
            </SettingSection>
        </div>
    );
};

const GallerySettings = () => {
    const { 
        galleryDefaultZoom, setGalleryDefaultZoom, 
        galleryDisplayMode, setGalleryDisplayMode,
        metadataOverlayGallery, setMetadataOverlayGallery
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="Gallery Engine" description="Manage logic strictly related to the Masonry Layout page." />
            
            <SettingSection title="Display Density">
                <NumberInput
                     label="Base Zoom Calculation (px"
                     description="Set the absolute starting width boundaries for a dynamically rendered column wrap."
                     value={galleryDefaultZoom}
                     onChange={setGalleryDefaultZoom}
                     min={80} max={600} step={20}
                 />
            </SettingSection>

            <SettingSection title="Gallery Information Rendering">
                <SelectInput
                     label="Item Filter Display Mode"
                     description="When loading massive directories, should the top section display the sub-folder path arrays or just the flat file matrix directly?"
                     value={galleryDisplayMode}
                     onChange={setGalleryDisplayMode}
                     options={[
                         {label: 'Hybrid (Folders & Files)', value: 'both'},
                         {label: 'Direct Files Only (Flatten)', value: 'files'}
                     ]}
                 />
                 <Divider />
                 <ToggleSwitch 
                    label="Information Bar Overlay" 
                    description="Keep Date/Size information actively injected under file names, reducing clutter if toggled off."
                    checked={metadataOverlayGallery}
                    onChange={setMetadataOverlayGallery}
                />
            </SettingSection>
        </div>
    );
};

const EditorSettings = () => {
    const { 
        editorAutoSave, setEditorAutoSave,
        editorDefaultTransition, setEditorDefaultTransition
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="Non-Linear Editor Config" description="Core structural behaviors when manipulating timeline nodes inside the Editor." />
            
            <SettingSection title="Data Retention">
                 <ToggleSwitch 
                    label="Agressive Auto-Save Strategy" 
                    description="Every atomic state change inside the sequence store triggers a background serialize write preventing data-loss."
                    checked={editorAutoSave}
                    onChange={setEditorAutoSave}
                />
            </SettingSection>

            <SettingSection title="Sequence Construction Default">
                <NumberInput
                     label="Cut Default Transition Length (ms)"
                     description="When snapping two disparate clips adjacently without defined behaviors, set their automatic blend distance."
                     value={editorDefaultTransition}
                     onChange={setEditorDefaultTransition}
                     min={0} max={5000} step={100}
                 />
                 <Divider />
                 <SelectInput
                     label="Target Render Format [VISUAL PROXY]"
                     description="Which format does the internal canvas pipeline aim to stream for the export node."
                     value={'mp4'}
                     onChange={() => {}}
                     options={[
                         {label: 'Browser Ready (webm/vp9)', value: 'webm'},
                         {label: 'Legacy Production (mp4/h264)', value: 'mp4'},
                         {label: 'Metadata Strip (JSON Only)', value: 'json'}
                     ]}
                 />
            </SettingSection>
        </div>
    );
};

const StreamSettings = () => {
    const { 
        streamFeaturedFrequency, setStreamFeaturedFrequency,
        streamRowScrollMode, setStreamRowScrollMode,
        streamLayoutMode, setStreamLayoutMode,
        streamClusteringMode, setStreamClusteringMode,
        streamCategorizationMode, setStreamCategorizationMode
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="Stream Content Engine" description="Configure the cinematic media stream experience." />
            
            <SettingSection title="Hero Spotlight">
                 <SelectInput
                     label="Featured Video Rotation"
                     description="How often should the massive spotlight video at the top of the stream refresh its randomized selection?"
                     value={streamFeaturedFrequency}
                     onChange={setStreamFeaturedFrequency}
                     options={[
                         {label: 'On Every Load', value: 'always'},
                         {label: 'Once Every Hour', value: 'hourly'},
                         {label: 'Once a Day', value: 'daily'}
                     ]}
                 />
            </SettingSection>

            <SettingSection title="Carousel Rows">
                 <SelectInput
                     label="Row Categorization Engine"
                     description="Define what system metadata determines how rows are grouped."
                     value={streamCategorizationMode}
                     onChange={setStreamCategorizationMode}
                     options={[
                         {label: 'Dual System (Folders & Smart Tags)', value: 'both'},
                         {label: 'Strict File Folders Only', value: 'folders'},
                         {label: 'Smart Tags Only (Featured, Dates, Clusters)', value: 'system'}
                     ]}
                 />
                 <Divider />
                 <SelectInput
                     label="Similar Name Clustering"
                     description="How should the dynamically generated rows group similar files together?"
                     value={streamClusteringMode}
                     onChange={setStreamClusteringMode}
                     options={[
                         {label: 'Intelligent Prefix Matching (Default)', value: 'prefix'},
                         {label: 'Delimiter Split (Spaces, Underscores)', value: 'delimiter'}
                     ]}
                 />
                 <Divider />
                 <SelectInput
                     label="Row Sliding Behavior"
                     description="Should the horizontal carousels smoothly float continuously like an ambient screen saver, or only scroll manually on interaction?"
                     value={streamRowScrollMode}
                     onChange={setStreamRowScrollMode}
                     options={[
                         {label: 'Auto float infinitely', value: 'float'},
                         {label: 'Manual Scroll Only', value: 'manual'}
                     ]}
                 />
                 <Divider />
                 <SelectInput
                     label="Layout Formats"
                     description="How should the different aspect ratios of your media be displayed?"
                     value={streamLayoutMode}
                     onChange={setStreamLayoutMode}
                     options={[
                         {label: 'Mixed Ratios (YouTube style mixed)', value: 'mixed'},
                         {label: 'Force Horizontal Cards Only (Cinema)', value: 'horizontal'},
                         {label: 'Force Vertical Cards Only (TikTok)', value: 'vertical'}
                     ]}
                 />
            </SettingSection>
        </div>
    );
};

const KeyGrabber = ({ actionLabel, currentKey, onRebind }) => {
    const [isListening, setIsListening] = useState(false);

    const handleKeyDown = (e) => {
        if (!isListening) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            setIsListening(false);
            return;
        }

        const parts = [];
        if (e.ctrlKey) parts.push('Control');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        
        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            parts.push(e.key === ' ' ? 'Space' : e.key);
        } else {
            return;
        }

        const newBinding = parts.length === 1 ? parts[0] : parts;
        onRebind(newBinding);
        setIsListening(false);
    };

    const displayKey = (keyCombo) => {
        if (!keyCombo) return 'Unbound';
        if (Array.isArray(keyCombo)) return keyCombo.map(k => k === ' ' ? 'Space' : k).join(' + ');
        return keyCombo === ' ' ? 'Space' : keyCombo;
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-4 px-4 rounded-xl transition-colors group/grabber">
            <span className="text-gray-300 font-bold">{actionLabel}</span>
            <button
                onClick={() => setIsListening(true)}
                onKeyDown={handleKeyDown}
                className={clsx(
                    "px-6 py-2.5 rounded-xl text-xs font-mono transition-all min-w-[140px] text-center border shadow-inner",
                    isListening 
                        ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-white animate-pulse shadow-[0_0_20px_var(--accent-primary)]" 
                        : "bg-black/40 border-white/10 text-gray-400 group-hover/grabber:bg-white/10 group-hover/grabber:text-white group-hover/grabber:border-white/20"
                )}
            >
                {isListening ? 'Press key...' : displayKey(currentKey)}
            </button>
        </div>
    );
};

const KeyboardSettings = () => {
    const { keyboardBindings, setKeyboardBinding } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="Keyboard System Overrides" description="Targeted binding remapping for core OS listeners." />
            
            <SettingSection title="Playback & Standard Navigation">
                <KeyGrabber actionLabel="Play / Pause Layout Globally" currentKey={keyboardBindings.playPause} onRebind={(k) => setKeyboardBinding('playPause', k)} />
                <KeyGrabber actionLabel="Advance Active Player" currentKey={keyboardBindings.nextItem} onRebind={(k) => setKeyboardBinding('nextItem', k)} />
                <KeyGrabber actionLabel="Reverse Active Player" currentKey={keyboardBindings.prevItem} onRebind={(k) => setKeyboardBinding('prevItem', k)} />
                <KeyGrabber actionLabel="Skip Complete Batch" currentKey={keyboardBindings.nextGroup} onRebind={(k) => setKeyboardBinding('nextGroup', k)} />
                <KeyGrabber actionLabel="Reverse Complete Batch" currentKey={keyboardBindings.prevGroup} onRebind={(k) => setKeyboardBinding('prevGroup', k)} />
                <KeyGrabber actionLabel="Master Volume Raise (+5%)" currentKey={keyboardBindings.volumeUp} onRebind={(k) => setKeyboardBinding('volumeUp', k)} />
                <KeyGrabber actionLabel="Master Volume Dip (-5%)" currentKey={keyboardBindings.volumeDown} onRebind={(k) => setKeyboardBinding('volumeDown', k)} />
            </SettingSection>

            <SettingSection title="Gallery Navigation Override">
                <KeyGrabber actionLabel="Scroll Page Up" currentKey={keyboardBindings.scrollUp} onRebind={(k) => setKeyboardBinding('scrollUp', k)} />
                <KeyGrabber actionLabel="Scroll Page Down" currentKey={keyboardBindings.scrollDown} onRebind={(k) => setKeyboardBinding('scrollDown', k)} />
            </SettingSection>

            <SettingSection title="Num-row Grid Interceptors">
                <KeyGrabber actionLabel="Force View -> 1x1 Panel" currentKey={keyboardBindings.grid1} onRebind={(k) => setKeyboardBinding('grid1', k)} />
                <KeyGrabber actionLabel="Force View -> 2x1 Panel" currentKey={keyboardBindings.grid2} onRebind={(k) => setKeyboardBinding('grid2', k)} />
                <KeyGrabber actionLabel="Force View -> 3x1 Panel" currentKey={keyboardBindings.grid3} onRebind={(k) => setKeyboardBinding('grid3', k)} />
                <KeyGrabber actionLabel="Force View -> 2x2 Matrix" currentKey={keyboardBindings.grid4} onRebind={(k) => setKeyboardBinding('grid4', k)} />
                <KeyGrabber actionLabel="Force View -> 3x2 Matrix" currentKey={keyboardBindings.grid6} onRebind={(k) => setKeyboardBinding('grid6', k)} />
                <KeyGrabber actionLabel="Force View -> 3x3 Matrix" currentKey={keyboardBindings.grid9} onRebind={(k) => setKeyboardBinding('grid9', k)} />
                <KeyGrabber actionLabel="Force View -> 4x3 Matrix" currentKey={keyboardBindings.grid12} onRebind={(k) => setKeyboardBinding('grid12', k)} />
            </SettingSection>
        </div>
    );
};

const SelfSettings = () => {
    const { 
        settingsStartupTab, setSettingsStartupTab,
        showSettingsTooltips, setShowSettingsTooltips
    } = useMediaStore();

    return (
        <div className="space-y-6">
            <SettingsHeader title="App Configuration" description="How this very page configures state memory." />
            
            <SettingSection title="Meta Config">
                 <SelectInput
                     label="Default Boot Page"
                     description="If you navigate away from settings and back, which tab holds highest priority retention."
                     value={settingsStartupTab}
                     onChange={setSettingsStartupTab}
                     options={[
                         {label: 'General App Config', value: 'general'},
                         {label: 'Appearance Configuration', value: 'appearance'},
                         {label: 'Grid / Slideshow Engine', value: 'standard'},
                         {label: 'Stream Formatter', value: 'stream'},
                         {label: 'Gallery Formatter', value: 'gallery'},
                         {label: 'Timeline Editor Options', value: 'editor'},
                         {label: 'Keyboard Keybindings Tracker', value: 'keyboard'},
                         {label: 'This Page Specifically', value: 'self'}
                     ]}
                 />
                 <Divider />
                 <ToggleSwitch 
                    label="Explain Labels (Tooltips On)" 
                    description="Shows all the descriptive block-text under input titles explaining what they modify. If you disable this, the Settings page becomes incredibly fast and dense."
                    checked={showSettingsTooltips}
                    onChange={setShowSettingsTooltips}
                />
            </SettingSection>

            <SettingSection title="WARNING: APP STATE DESTRUCTION">
                <div className="flex items-center justify-between gap-8 group">
                    <div className="flex-1 max-w-xl">
                        <h5 className="font-bold text-red-400 text-base">Memory Nuke / Hard Reset</h5>
                        {showSettingsTooltips && <p className="text-sm text-red-400/70 mt-1.5 leading-relaxed">This deletes all timelines, resets all settings, forgets external handles, purges all stored blobs. It resets the app purely to launch identity 0.</p>}
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you absolutely sure you want to PURGE all system state?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Factory Reset
                    </button>
                </div>
            </SettingSection>
        </div>
    );
};

const ProBridgeSettings = () => {
    return (
        <div className="space-y-6">
            <SettingsHeader title="MMMedia Pro Bridge" description="Connect to MMMedia Pro for cross-application editing workflows. Save and load .mmm project files, or send clips and media directly to Pro via the live bridge." />
            
            <SettingSection title="Connection Status">
                <BridgeStatus />
            </SettingSection>

            <SettingSection title="Project File Operations">
                <div className="space-y-4">
                    <div>
                        <h5 className="font-bold text-gray-200 text-base mb-2">Save & Load .mmm Projects</h5>
                        <p className="text-sm text-gray-400/90 mb-4 leading-relaxed">
                            The .mmm format is the standard project file shared between MMMedia Darkroom and MMMedia Pro. 
                            Save your current timeline as a .mmm file, or load one from Pro to continue editing here.
                        </p>
                    </div>
                    <ProBridgeActions layout="row" />
                </div>
            </SettingSection>

            <SettingSection title="Protocol Information">
                <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Manifest Version</span>
                        <span className="font-mono text-white/80 bg-black/40 px-3 py-1 rounded-lg border border-white/5">1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Bridge Port</span>
                        <span className="font-mono text-white/80 bg-black/40 px-3 py-1 rounded-lg border border-white/5">19797</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">File Format</span>
                        <span className="font-mono text-white/80 bg-black/40 px-3 py-1 rounded-lg border border-white/5">.mmm (JSON)</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Timing System</span>
                        <span className="font-mono text-white/80 bg-black/40 px-3 py-1 rounded-lg border border-white/5">Frame-based</span>
                    </div>
                </div>
            </SettingSection>
        </div>
    );
};

export default SettingsView;
