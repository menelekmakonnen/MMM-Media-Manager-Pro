import React, { useMemo, useRef, useState, useEffect } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Wand2, X, Clock, Zap, Settings2, Video, Image as ImageIcon, Flame, Scissors, Check, PlayCircle, FolderMinus, ChevronDown, ChevronRight, Layers, Music, Upload, Play, Pause, Trash2, Dna, Loader2, Crown, Sparkles, Shuffle, Grid3X3, Monitor, Smartphone, Square as SquareIcon } from 'lucide-react';
import { analyzeAudio } from '../../utils/editorUtils/audioAnalysis';
import { TRANSITION_PRESETS } from '@mmm-pro/lib/transitions';
import { DEFAULT_STYLE_CONFIG } from '@mmm-pro/lib/trailerGenerator';

const TEMPLATES = [
    { id: 'social', name: 'Social Cuts', desc: '0.1s - 0.5s cuts', icon: Zap, settings: { shortestClip: 0.1, longestClip: 0.5, allowDuplicates: true } },
    { id: 'kinetic', name: 'Kinetic Pulse', desc: 'Ultra-fast 0.1s-0.3s', icon: Flame, settings: { shortestClip: 0.1, longestClip: 0.3, allowDuplicates: true } },
    { id: 'epic', name: 'Epic Trailer', desc: 'Dramatic 0.5s-2.0s', icon: Wand2, settings: { shortestClip: 0.5, longestClip: 2.0, allowDuplicates: false } },
    { id: 'gym', name: 'Workout Edit', desc: 'Paced 0.2s-0.8s', icon: Video, settings: { shortestClip: 0.2, longestClip: 0.8, allowDuplicates: true } },
    { id: 'wedding', name: 'Wedding', desc: 'Elegant 1.0s-3.0s', icon: Wand2, settings: { shortestClip: 1.0, longestClip: 3.0, allowDuplicates: false } },
    { id: 'hyperlapse', name: 'Hyperlapse', desc: 'Fast flow 0.15s-0.4s', icon: Zap, settings: { shortestClip: 0.15, longestClip: 0.4, allowDuplicates: true } },
    { id: 'filmscore', name: 'Film Score', desc: 'Breathing 1.5s-4.0s', icon: Video, settings: { shortestClip: 1.5, longestClip: 4.0, allowDuplicates: false } },
    { id: 'montage', name: 'Montage', desc: 'Mixed 0.3s-1.5s', icon: Flame, settings: { shortestClip: 0.3, longestClip: 1.5, allowDuplicates: true } },
    { id: 'vlog', name: 'Vlog Recap', desc: 'Story 0.8s-2.5s', icon: Video, settings: { shortestClip: 0.8, longestClip: 2.5, allowDuplicates: false } },
    { id: 'custom', name: 'Custom', desc: 'Manual boundaries', icon: Settings2, settings: null }
];

const GODMODE_TIERS = [
    { label: 'Simple', color: 'text-emerald-400', bg: 'bg-emerald-500' },
    { label: 'Moderate', color: 'text-sky-400', bg: 'bg-sky-500' },
    { label: 'High Energy', color: 'text-amber-400', bg: 'bg-amber-500' },
    { label: 'Maximum Chaos', color: 'text-red-400', bg: 'bg-red-500' },
];

const GODMODE_PRESETS = [
    // ── Simple / Minimal ──
    { id: 'gm-clean-cut', name: 'Clean Cut', icon: Scissors, desc: 'Straight cuts, zero effects',
      pacing: 'montage', slowmo: 'none', duration: 30, tier: 0 },
    { id: 'gm-slideshow', name: 'Slideshow', icon: Video, desc: 'Long elegant holds, no ramps',
      pacing: 'filmscore', slowmo: 'none', duration: 60, tier: 0 },
    { id: 'gm-soft-story', name: 'Soft Story', icon: Video, desc: 'Gentle vlog pacing, no effects',
      pacing: 'vlog', slowmo: 'none', duration: 45, tier: 0 },
    { id: 'gm-quick-recap', name: 'Quick Recap', icon: Zap, desc: 'Fast straight cuts, no styling',
      pacing: 'social', slowmo: 'none', duration: 15, tier: 0 },
    // ── Moderate ──
    { id: 'gm-gentle-zoom', name: 'Gentle Zoom', icon: Video, desc: 'Soft zooms, cinematic pace',
      pacing: 'filmscore', slowmo: 'breathe', duration: 60, tier: 1 },
    { id: 'gm-wedding', name: 'Wedding Film', icon: Wand2, desc: 'Elegant slow zooms + gentle ramps',
      pacing: 'wedding', slowmo: 'breathe', duration: 45, tier: 1 },
    { id: 'gm-montage-mix', name: 'Montage Mix', icon: Flame, desc: 'Mixed pacing, light rubber-band',
      pacing: 'montage', slowmo: 'mixed-slow', duration: 30, tier: 1 },
    { id: 'gm-photo-reel', name: 'Photo Reel', icon: ImageIcon, desc: 'Slow paced, dreamy mixed media',
      pacing: 'wedding', slowmo: 'ramped-inverse', duration: 45, tier: 1 },
    { id: 'gm-travel-diary', name: 'Travel Diary', icon: Video, desc: 'Vlog pacing + soft dreamy effects',
      pacing: 'vlog', slowmo: 'ramped-inverse', duration: 30, tier: 1 },
    // ── High Energy ──
    { id: 'gm-music-video', name: 'Music Video', icon: Music, desc: 'Beat-sync boomerangs + zoom ramps',
      pacing: 'social', slowmo: 'pulse', duration: 30, tier: 2 },
    { id: 'gm-action-trailer', name: 'Action Trailer', icon: Flame, desc: 'Dramatic pacing, hard speed ramps',
      pacing: 'epic', slowmo: 'dramatic', duration: 60, tier: 2 },
    { id: 'gm-instagram', name: 'IG Epic Edit', icon: Video, desc: 'Vertical-ready snappy cuts + zoom',
      pacing: 'social', slowmo: 'mixed-fast', duration: 15, tier: 2 },
    { id: 'gm-boomerang', name: 'Boomerang Edit', icon: Zap, desc: 'Full boomerang + stutter chaos',
      pacing: 'kinetic', slowmo: 'slowmo-fast', duration: 15, tier: 2 },
    { id: 'gm-hyperlapse', name: 'Hyperlapse Reel', icon: Zap, desc: 'Fast flow + pulse drops',
      pacing: 'hyperlapse', slowmo: 'pulse', duration: 20, tier: 2 },
    { id: 'gm-cinematic', name: 'Cinematic Short', icon: Video, desc: 'Film-score pacing + noir style',
      pacing: 'filmscore', slowmo: 'ramped', duration: 90, tier: 2 },
    { id: 'gm-gym-pump', name: 'Gym Pump', icon: Flame, desc: 'Workout pacing + pulse-drop effects',
      pacing: 'gym', slowmo: 'pulse', duration: 20, tier: 2 },
    // ── Maximum Chaos ──
    { id: 'gm-tiktok', name: 'TikTok Viral', icon: Zap, desc: 'Maximum chaos, every effect at once',
      pacing: 'kinetic', slowmo: 'mixed-all', duration: 10, tier: 3 },
    { id: 'gm-whiplash', name: 'Whiplash Cut', icon: Flame, desc: 'Extreme speed contrast on every clip',
      pacing: 'kinetic', slowmo: 'slowmo-fast', duration: 15, tier: 3 },
    { id: 'gm-stutter-storm', name: 'Stutter Storm', icon: Zap, desc: 'Rapid micro-boomerangs everywhere',
      pacing: 'kinetic', slowmo: 'fast-slowmo', duration: 10, tier: 3 },
    { id: 'gm-sensory-overload', name: 'Sensory Overload', icon: Zap, desc: 'Every effect, hyperlapse pacing',
      pacing: 'hyperlapse', slowmo: 'mixed-all', duration: 15, tier: 3 },
];

const SliderControl = ({ label, icon: Icon, value, min, max, step, onChange, unit = 's', disabled = false }) => (
    <div className={clsx("flex flex-col gap-2", disabled && "opacity-50 pointer-events-none")}>
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-white/70">
            <span className="flex items-center gap-1.5"><Icon size={12} /> {label}</span>
            <span className="text-[var(--accent-primary)] font-mono">{parseFloat(value).toFixed(1)}{unit}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-primary)] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-white/30 font-mono">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
        </div>
    </div>
);

const DualRangeSlider = ({ label, value, min, max, onChange, unit = 's', disabled = false }) => {
    const trackRef = useRef(null);
    const [dragging, setDragging] = useState(null); // 'start', 'end', or null

    const updateValue = (e) => {
        if (!trackRef.current || !dragging) return;
        const rect = trackRef.current.getBoundingClientRect();
        let percent = (e.clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        let val = min + percent * (max - min);
        val = Math.round(val * 10) / 10;
        
        const [start, end] = value;
        if (dragging === 'start') {
            onChange([Math.min(val, end - 1), end]);
        } else {
            onChange([start, Math.max(val, start + 1)]);
        }
    };

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => updateValue(e);
        const handleMouseUp = () => setDragging(null);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, value]);

    const startPercent = ((value[0] - min) / (max - min)) * 100;
    const endPercent = ((value[1] - min) / (max - min)) * 100;

    return (
        <div className={clsx("flex flex-col gap-2 relative", disabled && "opacity-50 pointer-events-none")}>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-white/70">
                <span className="flex items-center gap-1.5"><Scissors size={12} /> {label}</span>
                <span className="text-[var(--accent-primary)] font-mono">{value[0].toFixed(1)}{unit} - {value[1].toFixed(1)}{unit}</span>
            </div>
            <div className="h-6 flex items-center relative py-2 select-none">
                {/* Background Track */}
                <div 
                    ref={trackRef} 
                    className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer" 
                    onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const val = min + percent * (max - min);
                        if (Math.abs(val - value[0]) < Math.abs(val - value[1])) setDragging('start');
                        else setDragging('end');
                        updateValue(e);
                    }} 
                />
                
                {/* Fill */}
                <div 
                    className="absolute h-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full pointer-events-none shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                />
                
                {/* Min Thumb */}
                <div 
                    onMouseDown={(e) => { e.stopPropagation(); setDragging('start'); }}
                    className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-ew-resize -mt-0 transform -translate-x-1/2 hover:scale-125 transition-transform"
                    style={{ left: `${startPercent}%` }}
                />
                
                {/* Max Thumb */}
                <div 
                    onMouseDown={(e) => { e.stopPropagation(); setDragging('end'); }}
                    className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-ew-resize -mt-0 transform -translate-x-1/2 hover:scale-125 transition-transform"
                    style={{ left: `${endPercent}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
};

const WaveformVisualizer = ({ duration, peaks, start, end }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !peaks || peaks.length === 0 || !duration) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Draw baseline
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw peaks
        ctx.fillStyle = 'rgba(168, 85, 247, 0.6)'; // Purple matches theme
        const barWidth = Math.max(1, width / (duration * 10)); // Arbitrary density

        peaks.forEach(peak => {
            const x = (peak.time / duration) * width;
            const barHeight = peak.energy * height * 0.8; // scale by energy
            const y = (height - barHeight) / 2;
            ctx.fillRect(x - (barWidth/2), y, barWidth, barHeight);
        });

        // Overlay active region
        const startX = (start / duration) * width;
        const endX = (end / duration) * width;
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue tint for selected
        ctx.fillRect(startX, 0, endX - startX, height);
        
        // Render boundary lines
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(startX - 1, 0, 2, height);
        ctx.fillRect(endX - 1, 0, 2, height);

    }, [peaks, duration, start, end]);

    return (
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={80} 
            className="w-full h-20 bg-black/40 rounded-lg border border-white/5"
        />
    );
};

const TrailerModal = ({ isEmbedded = false }) => {
    const [showExclusions, setShowExclusions] = React.useState(false);
    const [godMode, setGodMode] = React.useState(false);
    const [godModeDuration, setGodModeDuration] = React.useState(30);
    const [audioFile, setAudioFile] = React.useState(null);
    const [audioUrl, setAudioUrl] = React.useState(null);
    const [audioPlaying, setAudioPlaying] = React.useState(false);
    const [showAudioTrim, setShowAudioTrim] = React.useState(false);
    const [audioMeta, setAudioMeta] = React.useState({ duration: 0 });
    const [audioTrimStart, setAudioTrimStart] = React.useState(0);
    const [audioTrimEnd, setAudioTrimEnd] = React.useState(30);
    const audioRef = useRef(null);
    const audioInputRef = useRef(null);
    const [isRandomizingAudio, setIsRandomizingAudio] = React.useState(false);
    const [audioPeaks, setAudioPeaks] = React.useState([]);
    const { 
        isTrailerModalOpen, setTrailerModalOpen, 
        trailerSettings, setTrailerSettings,
        explorerSelectedFiles, getSortedFiles, setAppViewMode, setTrailerDraftSequence,
        files, folders, toggleFolderExclusion, excludedFolders
    } = useMediaStore();

    // Audio file handling
    const handleAudioUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(file);
        setAudioFile(file);
        setAudioUrl(url);
        setShowAudioTrim(true);
        setAudioPlaying(false);
    };

    // Waveform reactivity
    useEffect(() => {
        if (!audioFile) return;
        let active = true;
        
        const reanalyze = async () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const arrayBuffer = await audioFile.arrayBuffer();
                const buffer = await ctx.decodeAudioData(arrayBuffer);
                const { peaks } = await analyzeAudio(buffer, trailerSettings.beatSensitivity);
                if (active) setAudioPeaks(peaks);
            } catch (e) {
                console.warn("Waveform decoding failed", e);
            }
        };

        const t = setTimeout(reanalyze, 300);
        return () => { active = false; clearTimeout(t); };
    }, [audioFile, trailerSettings.beatSensitivity]);

    const handleAudioLoaded = async () => {
        const dur = audioRef.current?.duration || 0;
        setAudioMeta({ duration: dur });
        
        if (trailerSettings.audioTrimEnd) {
            setAudioTrimStart(trailerSettings.audioTrimStart || 0);
            setAudioTrimEnd(trailerSettings.audioTrimEnd);
        } else {
            setAudioTrimStart(0);
            setAudioTrimEnd(Math.min(dur, trailerSettings.targetDuration));
        }
    };

    const handleRandomizeAudioBeat = async () => {
        if (!audioFile) return;
        setIsRandomizingAudio(true);
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            const { peaks } = await analyzeAudio(buffer, trailerSettings.beatSensitivity);

            const targetDur = trailerSettings.targetDuration || 30;
            const safePeaks = peaks.filter(p => p.time <= buffer.duration - targetDur);
            
            if (safePeaks.length > 0) {
                const randPeak = safePeaks[Math.floor(Math.random() * safePeaks.length)];
                setAudioTrimStart(randPeak.time);
                setAudioTrimEnd(randPeak.time + targetDur);
                setShowAudioTrim(true); // Open the Trimmer UI to reveal the new selection natively
            }
        } catch (e) {
            console.warn("Failed to natively randomise audio bounds", e);
        } finally {
            setIsRandomizingAudio(false);
        }
    };

    const toggleAudioPreview = () => {
        if (!audioRef.current) return;
        if (audioPlaying) {
            audioRef.current.pause();
            setAudioPlaying(false);
        } else {
            audioRef.current.currentTime = audioTrimStart;
            audioRef.current.play().catch(() => {});
            setAudioPlaying(true);
        }
    };

    const handleConfirmAudio = () => {
        const trimmedDuration = audioTrimEnd - audioTrimStart;
        setTrailerSettings({ 
            audioFile: audioFile?.name,
            audioUrl,
            audioTrimStart,
            audioTrimEnd,
            useAudioGuide: true,
            ...(trailerSettings.matchAudioDuration ? { targetDuration: Math.round(trimmedDuration) } : {})
        });
        setShowAudioTrim(false);
        if (audioRef.current) audioRef.current.pause();
        setAudioPlaying(false);
    };

    const handleRemoveAudio = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioFile(null);
        setAudioUrl(null);
        setShowAudioTrim(false);
        setAudioPlaying(false);
        setTrailerSettings({ audioUrl: null, audioFile: null, useAudioGuide: false });
    };

    // Stats calculation
    const currentPool = useMemo(() => {
        let pool = getSortedFiles();
        if (explorerSelectedFiles.size > 0) {
            pool = pool.filter(f => explorerSelectedFiles.has(f.path));
        }
        
        const typeMatch = pool.filter(f => {
            if (trailerSettings.mediaType === 'video') return f.type === 'video';
            if (trailerSettings.mediaType === 'image') return f.type === 'image';
            if (trailerSettings.mediaType === 'gif') return f.name.toLowerCase().endsWith('.gif');
            return true;
        });

        return {
            total: typeMatch.length,
            duration: typeMatch.reduce((acc, f) => acc + (f.duration || 0), 0)
        };
    }, [explorerSelectedFiles, trailerSettings.mediaType, files]);

    const handleTemplateSelect = (tmpl) => {
        if (tmpl.settings) {
            setTrailerSettings({ template: tmpl.id, ...tmpl.settings });
        } else {
            setTrailerSettings({ template: 'custom' });
        }
    };

    const handleGenerate = () => {
        setTrailerModalOpen(false);
        if (isEmbedded) {
            setTrailerDraftSequence([]); // Trigger Router to mount TrailerView
        } else {
            setTrailerDraftSequence([]);
            setAppViewMode('trailer');
        }
    };

    const handleGodModeGenerate = (preset) => {
        const pacingTmpl = TEMPLATES.find(t => t.id === preset.pacing);
        const finalSettings = {
            template: preset.pacing,
            targetDuration: godModeDuration,
            allowDuplicates: true,
            useAllClips: true,
            slowmoPolicy: preset.slowmo || 'none',
            // === Pro Engine fields from God Mode ===
            editingStyleMix: preset.tier >= 2 ? 'heavy' : preset.tier >= 1 ? 'light' : 'none',
            editingStyles: preset.tier >= 2 ? ['rubber-band-standard', 'rubber-band-zoom', 'multi-boomerang', 'triple-shot'] : ['rubber-band-standard', 'multi-boomerang'],
            styleConfig: { ...DEFAULT_STYLE_CONFIG },
            transitionsEnabled: preset.tier >= 1,
            transitionPreset: preset.tier >= 3 ? 'dynamic' : preset.tier >= 2 ? 'kinetic' : 'cinematic',
            maxSimultaneousTransitions: preset.tier >= 3 ? 3 : 1,
            beatPattern: 'auto',
            beatSyncStrategy: 'auto',
            ...(pacingTmpl?.settings || {}),
            ...(trailerSettings.useAudioGuide ? {
                useAudioGuide: true,
                audioFile: trailerSettings.audioFile,
                audioUrl: trailerSettings.audioUrl,
                audioTrimStart,
                audioTrimEnd,
            } : {}),
        };
        setTrailerSettings(finalSettings);
        // Trigger generation immediately
        setTrailerModalOpen(false);
        if (isEmbedded) {
            setTrailerDraftSequence([]);
        } else {
            setTrailerDraftSequence([]);
            setAppViewMode('trailer');
        }
    };

    if (!isTrailerModalOpen && !isEmbedded) return null;

    const modalLayoutClass = isEmbedded 
        ? "relative w-full max-w-4xl mx-auto my-12 bg-[#11111a]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col"
        : "relative bg-[#11111a] w-full max-w-3xl max-h-[90vh] rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col";

    return (
        <div className={clsx("flex items-center justify-center p-4 overflow-y-auto", isEmbedded ? "min-h-full" : "fixed inset-0 z-[100000]")}>
            {!isEmbedded && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-black/80 backdrop-blur-xl" 
                    onClick={() => setTrailerModalOpen(false)} 
                />
            )}
            
            <motion.div 
                initial={isEmbedded ? false : { opacity: 0, scale: 0.95, y: 20 }}
                animate={isEmbedded ? false : { opacity: 1, scale: 1, y: 0 }}
                exit={isEmbedded ? false : { opacity: 0, scale: 0.95, y: 20 }}
                className={modalLayoutClass}
            >
                {/* Header Container */}
                <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg">
                                <Wand2 size={20} className="text-white drop-shadow-md" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                                    Trailer Generator <span className="text-[10px] uppercase bg-white/10 px-1.5 py-0.5 rounded text-purple-300">Beta</span>
                                </h2>
                                <p className="text-xs text-white/50 font-medium">Procedurally generate rapid-cut sequences from your library.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setTrailerModalOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Form Content - scrollable */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
                    
                    {/* Hidden Audio Input */}
                    <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    
                    {/* Media Type & Selection Info */}
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Target Media Type</label>
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                {[
                                    { id: 'video', icon: Video, label: 'Videos' },
                                    { id: 'image', icon: ImageIcon, label: 'Photos' },
                                    { id: 'gif', icon: Zap, label: 'GIFs' }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setTrailerSettings({ mediaType: type.id })}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all",
                                            trailerSettings.mediaType === type.id 
                                                ? "bg-[var(--accent-primary)] text-white shadow-md" 
                                                : "text-white/40 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <type.icon size={14} /> {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full sm:w-1/3 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col justify-center gap-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] pointer-events-none rounded-full" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Media Pool</span>
                            <span className="text-2xl font-black text-white flex items-baseline gap-1">
                                {currentPool.total} <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Available</span>
                            </span>
                            {explorerSelectedFiles.size > 0 ? (
                                <span className="text-[10px] text-emerald-400 font-bold border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full self-start inline-block">Custom Selection Active</span>
                            ) : (
                                <span className="text-[10px] text-blue-400 font-bold border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded-full self-start inline-block">Entire Library Active</span>
                            )}
                        </div>
                    </div>

                    {/* Audio Guide Panel */}
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20 p-5 space-y-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Music size={16} className={clsx(trailerSettings.useAudioGuide ? "text-purple-400" : "text-white/40")} />
                                <span className="text-sm font-bold text-white">Audio Guide & Beat Mapping</span>
                            </div>
                            {trailerSettings.useAudioGuide && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-white/40 leading-tight">
                            Upload an audio track to automatically map your clips to the music's high-energy peaks. Transition durations will mathematically sync with the drum beats.
                        </p>
                        
                        {!trailerSettings.useAudioGuide ? (
                            <button
                                onClick={() => audioInputRef.current?.click()}
                                className="w-full flex justify-center items-center gap-2 py-3 border border-dashed border-white/20 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/10 text-white/50 hover:text-white transition-all text-xs font-bold"
                            >
                                <Upload size={14} /> Select Audio File
                            </button>
                        ) : (
                            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button onClick={toggleAudioPreview} className="text-white hover:text-purple-400 transition-colors">
                                        {audioPlaying ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                    <div className="flex flex-col truncate">
                                        <span className="text-xs font-bold text-white truncate">{trailerSettings.audioFile}</span>
                                        <span className="text-[10px] text-white/40 font-mono">
                                            {trailerSettings.audioTrimStart?.toFixed(1) || 0}s - {trailerSettings.audioTrimEnd?.toFixed(1) || 0}s ({(trailerSettings.targetDuration || 0).toFixed(1)}s Edit)
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        if (trailerSettings.useAudioGuide) {
                                            setAudioTrimStart(trailerSettings.audioTrimStart || 0);
                                            setAudioTrimEnd(trailerSettings.audioTrimEnd || trailerSettings.targetDuration);
                                        }
                                        setShowAudioTrim(true);
                                    }} className="p-2 bg-white/10 hover:bg-white/20 rounded shadow transition-colors text-white/70 hover:text-white">
                                        <Scissors size={14} />
                                    </button>
                                    <button onClick={handleRemoveAudio} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded shadow transition-colors text-red-400 hover:text-red-200">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {trailerSettings.useAudioGuide && (
                            <div className="pt-3 border-t border-white/5 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Source Clip Mixing Strategy</label>
                                <select
                                    value={trailerSettings.audioMixStrategy || 'muted'}
                                    onChange={(e) => setTrailerSettings({ audioMixStrategy: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 text-white text-xs font-bold rounded-md px-3 py-2 outline-none hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <option className="bg-black text-white" value="muted">Muted (Music Only)</option>
                                    <option className="bg-black text-white" value="subtle">Subtle Background (20% Volume)</option>
                                    <option className="bg-black text-white" value="original">Original Release (Full Volume)</option>
                                    <option className="bg-black text-white" value="ducking">Smart Ducking (Paced Alternating)</option>
                                </select>
                                
                                <div className="pt-4 border-t border-white/5 mt-4 group">
                                    <SliderControl
                                        label="Beat Sensitivity Core"
                                        icon={Zap}
                                        value={trailerSettings.beatSensitivity}
                                        min={0.0} max={1.0} step={0.1} unit=""
                                        onChange={(v) => setTrailerSettings({ beatSensitivity: v })}
                                    />
                                    <p className="text-[9px] text-white/30 uppercase mt-2 tracking-widest font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        Higher bounds detect micro-beats like hi-hats. Lower bounds isolate hard drops. Realtime visualizer.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ GOD MODE PANEL ═══ */}
                    <div className={clsx("border rounded-xl overflow-hidden transition-all", godMode ? "border-yellow-500/30" : "border-white/5")}>
                        <button onClick={() => setGodMode(!godMode)}
                            className={clsx("w-full flex items-center justify-between px-5 py-4 transition-all",
                                godMode ? "bg-gradient-to-r from-yellow-900/30 to-amber-900/20" : "bg-black/20 hover:bg-white/5")}>
                            <div className="flex items-center gap-3">
                                <Crown size={18} className={clsx(godMode ? "text-yellow-400" : "text-white/30")} />
                                <div className="flex flex-col items-start">
                                    <div className={clsx("text-sm font-black uppercase tracking-wider", godMode ? "text-yellow-200" : "text-white/60")}>God Mode</div>
                                    <div className="text-[9px] text-white/30">One-click pro-grade presets — skip manual config</div>
                                </div>
                            </div>
                            <div className={clsx("w-10 h-5 rounded-full transition-colors relative", godMode ? "bg-yellow-500" : "bg-black border border-white/20")}>
                                <div className={clsx("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", godMode ? "translate-x-5" : "translate-x-0.5")} />
                            </div>
                        </button>

                        {godMode && (
                            <div className="p-5 border-t border-yellow-500/20 space-y-5 bg-gradient-to-b from-yellow-900/10 to-transparent">
                                {/* Duration Slider */}
                                <SliderControl label="Target Duration" icon={Clock} value={godModeDuration}
                                    min={5} max={180} step={5} unit="s" onChange={v => setGodModeDuration(v)} />
                                <div className="flex gap-2 flex-wrap">
                                    {[5, 10, 15, 30, 60, 90].map(val => (
                                        <button key={val} onClick={() => setGodModeDuration(val)}
                                            className={clsx("px-3 py-1.5 rounded-md text-[10px] font-bold transition-all border",
                                                godModeDuration === val ? "bg-yellow-500 text-black border-yellow-400 shadow-lg" : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10")}>
                                            {val}s
                                        </button>
                                    ))}
                                </div>

                                {/* Tier Preset Grid */}
                                {GODMODE_TIERS.map((tier, tierIdx) => {
                                    const tierPresets = GODMODE_PRESETS.filter(p => p.tier === tierIdx);
                                    return (
                                        <div key={tier.label} className="space-y-2">
                                            <div className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", tier.color)}>
                                                <div className={clsx("w-2 h-2 rounded-full", tier.bg)} />
                                                {tier.label}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {tierPresets.map(preset => {
                                                    const Icon = preset.icon;
                                                    return (
                                                        <button key={preset.id}
                                                            onClick={() => handleGodModeGenerate(preset)}
                                                            className="flex flex-col gap-1.5 p-3 text-left rounded-lg transition-all border border-white/5 bg-white/5 hover:bg-yellow-500/15 hover:border-yellow-500/30 group active:scale-95">
                                                            <div className="flex items-center gap-2">
                                                                <Icon size={14} className={clsx("text-white/40 group-hover:text-yellow-400 transition-colors")} />
                                                                <span className="text-[11px] font-bold text-white/80 group-hover:text-yellow-200 truncate">{preset.name}</span>
                                                            </div>
                                                            <span className="text-[9px] text-white/30 leading-tight">{preset.desc}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Manual controls disabled overlay when God Mode active */}
                    <div className={clsx(godMode && "opacity-30 pointer-events-none select-none")}>

                    {/* Generator Templates */}
                    <div className="space-y-3 shrink-0">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex justify-between">
                            Pacing Templates
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => handleTemplateSelect(tmpl)}
                                    className={clsx(
                                        "flex flex-col gap-3 p-3 text-left rounded-xl transition-all border group relative overflow-hidden",
                                        trailerSettings.template === tmpl.id 
                                            ? "bg-purple-500/10 border-purple-500/50" 
                                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                    )}
                                >
                                    {trailerSettings.template === tmpl.id && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent pointer-events-none" />
                                    )}
                                    <div className="flex justify-between items-start">
                                        <div className={clsx(
                                            "p-1.5 rounded-lg shadow-inner",
                                            trailerSettings.template === tmpl.id ? "bg-purple-500 text-white" : "bg-black/50 text-white/50 group-hover:text-white/90"
                                        )}>
                                            <tmpl.icon size={16} />
                                        </div>
                                        {trailerSettings.template === tmpl.id && <Check size={14} className="text-purple-400" />}
                                    </div>
                                    <div>
                                        <div className={clsx("text-xs font-bold truncate", trailerSettings.template === tmpl.id ? "text-purple-200" : "text-white/80")}>{tmpl.name}</div>
                                        <div className="text-[10px] text-white/40 font-mono mt-0.5">{tmpl.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>



                    {/* Boundaries Row */}
                    <div className="grid sm:grid-cols-2 gap-8 bg-black/20 p-5 rounded-xl border border-white/5 shrink-0">
                        <div className="space-y-4">
                            <SliderControl
                                label="Target Duration"
                                icon={Clock}
                                value={trailerSettings.targetDuration}
                                min={5} max={180} step={5} unit="s"
                                onChange={(v) => setTrailerSettings({ targetDuration: v })}
                                disabled={trailerSettings.useAudioGuide && trailerSettings.matchAudioDuration}
                            />
                            <div className="flex gap-2">
                                {[5, 10, 15, 30].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setTrailerSettings({ targetDuration: val })}
                                        disabled={trailerSettings.useAudioGuide && trailerSettings.matchAudioDuration}
                                        className={clsx(
                                            "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all border",
                                            trailerSettings.targetDuration === val
                                                ? "bg-[var(--accent-primary)] text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                                : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white",
                                            (trailerSettings.useAudioGuide && trailerSettings.matchAudioDuration) && "opacity-50 pointer-events-none"
                                        )}
                                    >
                                        {val}s
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <SliderControl
                                label="Shortest Clip"
                                icon={Scissors}
                                value={trailerSettings.shortestClip}
                                min={0.1} max={5.0} step={0.1} unit="s"
                                onChange={(v) => {
                                    setTrailerSettings({ 
                                        shortestClip: v, 
                                        longestClip: Math.max(v, trailerSettings.longestClip) 
                                    });
                                }}
                            />
                            <SliderControl
                                label="Longest Clip"
                                icon={Scissors}
                                value={trailerSettings.longestClip}
                                min={0.5} max={10.0} step={0.1} unit="s"
                                onChange={(v) => {
                                    setTrailerSettings({ 
                                        longestClip: v,
                                        shortestClip: Math.min(v, trailerSettings.shortestClip)
                                    });
                                }}
                            />
                        </div>
                    </div>

                    {/* Cinematic Speed Settings */}
                    <div className="space-y-3 shrink-0">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Clock size={12} className="text-blue-400" /> Cinematic Speed
                        </label>
                        <select
                            value={trailerSettings.slowmoPolicy || 'none'}
                            onChange={(e) => setTrailerSettings({ slowmoPolicy: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 text-white text-xs font-bold rounded-md px-3 py-2.5 outline-none hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            <optgroup label="Standard">
                                <option className="bg-black text-white" value="none">Normal Speed (1.0x)</option>
                                <option className="bg-black text-white" value="slowmo">Slow Motion (0.5x)</option>
                                <option className="bg-black text-white" value="fast">Fast (1.5x)</option>
                                <option className="bg-black text-white" value="timelapse">Timelapse (2.5x)</option>
                                <option className="bg-black text-white" value="hyperfast">Hyperfast (4.0x)</option>
                            </optgroup>
                            <optgroup label="Mixed">
                                <option className="bg-black text-white" value="mixed-slow">Mixed Slow (Random Occasional Slow-Mo)</option>
                                <option className="bg-black text-white" value="mixed-fast">Mixed Fast (Random Occasional Speed-Up)</option>
                                <option className="bg-black text-white" value="mixed-all">Mixed All (Random Slow + Fast)</option>
                                <option className="bg-black text-white" value="slowmo-fast">Slow→Fast Bias (75% Slow, 25% Fast)</option>
                                <option className="bg-black text-white" value="fast-slowmo">Fast→Slow Bias (75% Fast, 25% Slow)</option>
                            </optgroup>
                            <optgroup label="Dynamic Curves">
                                <option className="bg-black text-white" value="dramatic">Dramatic Build (Slow → Fast)</option>
                                <option className="bg-black text-white" value="dramatic-reverse">Dramatic Reverse (Fast → Slow)</option>
                                <option className="bg-black text-white" value="ramped">Ramped Arc (Fast → Slow → Fast)</option>
                                <option className="bg-black text-white" value="ramped-inverse">Ramped Inverse (Slow → Fast → Slow)</option>
                                <option className="bg-black text-white" value="pulse">Pulse (Alternating 0.5x / 1.8x)</option>
                                <option className="bg-black text-white" value="breathe">Breathe (Gentle 0.7x ↔ 1.3x wave)</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* ═══ EDITING STYLES ENGINE (from Pro) ═══ */}
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                        <button onClick={() => setTrailerSettings({ _showStylesPanel: !trailerSettings._showStylesPanel })}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className={clsx(trailerSettings.editingStyleMix !== 'none' ? 'text-cyan-400' : 'text-white/30')} />
                                <span className="text-sm font-bold text-white">Editing Styles</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {trailerSettings.editingStyleMix !== 'none' && (
                                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                        {trailerSettings.editingStyleMix}
                                    </span>
                                )}
                                {trailerSettings._showStylesPanel ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
                            </div>
                        </button>
                        {trailerSettings._showStylesPanel && (
                            <div className="p-4 border-t border-white/5 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Style Intensity</label>
                                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                        {[{ id: 'none', label: 'Off' }, { id: 'light', label: 'Light (20%)' }, { id: 'heavy', label: 'Heavy (50%)' }, { id: 'every', label: 'Every Clip' }].map(opt => (
                                            <button key={opt.id}
                                                onClick={() => setTrailerSettings({ editingStyleMix: opt.id })}
                                                className={clsx(
                                                    'flex-1 py-2 px-2 rounded-md text-[10px] font-bold transition-all',
                                                    trailerSettings.editingStyleMix === opt.id
                                                        ? 'bg-cyan-500 text-white shadow-md'
                                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                                )}>{opt.label}</button>
                                        ))}
                                    </div>
                                </div>
                                {trailerSettings.editingStyleMix !== 'none' && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Styles</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {[
                                                { id: 'rubber-band-standard', name: 'Rubber Band', desc: 'Fast→Slow→Reverse' },
                                                { id: 'rubber-band-zoom', name: 'Zoom Rubber', desc: 'Push-in + Pull-out' },
                                                { id: 'rubber-band-zoom-speed', name: 'Zoom+Speed', desc: 'Combined ramp+zoom' },
                                                { id: 'multi-boomerang', name: 'Boomerang', desc: 'Forward/reverse slices' },
                                                { id: 'triple-shot', name: 'Triple Shot', desc: 'Burst of 3 sub-clips' },
                                            ].map(style => {
                                                const isActive = (trailerSettings.editingStyles || []).includes(style.id);
                                                return (
                                                    <button key={style.id}
                                                        onClick={() => {
                                                            const current = trailerSettings.editingStyles || [];
                                                            setTrailerSettings({
                                                                editingStyles: isActive
                                                                    ? current.filter(s => s !== style.id)
                                                                    : [...current, style.id]
                                                            });
                                                        }}
                                                        className={clsx(
                                                            'flex flex-col gap-1 p-3 rounded-lg border text-left transition-all',
                                                            isActive ? 'bg-cyan-500/15 border-cyan-500/40' : 'bg-white/5 border-white/5 hover:border-white/20'
                                                        )}>
                                                        <span className={clsx('text-[11px] font-bold', isActive ? 'text-cyan-200' : 'text-white/70')}>{style.name}</span>
                                                        <span className="text-[9px] text-white/30">{style.desc}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <SliderControl label="Zoom Range" icon={Zap}
                                                value={trailerSettings.styleConfig?.zoomRange || 145}
                                                min={110} max={200} step={5} unit="%"
                                                onChange={v => setTrailerSettings({ styleConfig: { ...(trailerSettings.styleConfig || {}), zoomRange: v } })} />
                                            <SliderControl label="Reversal Chance" icon={Shuffle}
                                                value={trailerSettings.styleConfig?.reversalChance || 0.85}
                                                min={0} max={1} step={0.05} unit=""
                                                onChange={v => setTrailerSettings({ styleConfig: { ...(trailerSettings.styleConfig || {}), reversalChance: v } })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ TRANSITIONS ENGINE (from Pro) ═══ */}
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                        <button onClick={() => setTrailerSettings({ _showTransitionsPanel: !trailerSettings._showTransitionsPanel })}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2">
                                <Shuffle size={16} className={clsx(trailerSettings.transitionsEnabled ? 'text-violet-400' : 'text-white/30')} />
                                <span className="text-sm font-bold text-white">Transitions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {trailerSettings.transitionsEnabled && (
                                    <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                        {trailerSettings.transitionPreset || 'cinematic'}
                                    </span>
                                )}
                                {trailerSettings._showTransitionsPanel ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
                            </div>
                        </button>
                        {trailerSettings._showTransitionsPanel && (
                            <div className="p-4 border-t border-white/5 space-y-4">
                                <label className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">Enable Transitions</span>
                                    <div className="relative cursor-pointer" onClick={() => setTrailerSettings({ transitionsEnabled: !trailerSettings.transitionsEnabled })}>
                                        <div className={clsx('w-10 h-5 rounded-full transition-colors', trailerSettings.transitionsEnabled ? 'bg-violet-500' : 'bg-black border border-white/20')}>
                                            <div className={clsx('w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform', trailerSettings.transitionsEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
                                        </div>
                                    </div>
                                </label>
                                {trailerSettings.transitionsEnabled && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Transition Preset</label>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                {Object.keys(TRANSITION_PRESETS).map(preset => (
                                                    <button key={preset}
                                                        onClick={() => setTrailerSettings({ transitionPreset: preset })}
                                                        className={clsx(
                                                            'py-2 px-3 rounded-lg text-[10px] font-bold capitalize transition-all border',
                                                            trailerSettings.transitionPreset === preset
                                                                ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                                                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                                        )}>{preset}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <SliderControl label="Simultaneous FX" icon={Layers}
                                            value={trailerSettings.maxSimultaneousTransitions || 1}
                                            min={1} max={5} step={1} unit=""
                                            onChange={v => setTrailerSettings({ maxSimultaneousTransitions: v })} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ═══ ORIENTATION FILTER (from Pro) ═══ */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Monitor size={12} className="text-sky-400" /> Orientation Filter
                        </label>
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                            {[
                                { id: 'all', label: 'All', icon: Grid3X3 },
                                { id: 'horizontal', label: 'Landscape', icon: Monitor },
                                { id: 'vertical', label: 'Portrait', icon: Smartphone },
                                { id: 'square', label: 'Square', icon: SquareIcon },
                            ].map(opt => (
                                <button key={opt.id}
                                    onClick={() => setTrailerSettings({ orientationFilter: opt.id })}
                                    className={clsx(
                                        'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-[10px] font-bold transition-all',
                                        trailerSettings.orientationFilter === opt.id
                                            ? 'bg-sky-500 text-white shadow-md'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'
                                    )}>
                                    <opt.icon size={12} /> {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Behavior Toggles */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <label className="flex flex-1 items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-white">Allow Duplicate Files</span>
                                <span className="text-[10px] text-white/40 leading-tight">Same file can appear multiple times with different trims.</span>
                            </div>
                            <div className="relative">
                                <input 
                                    type="checkbox" className="sr-only" 
                                    checked={trailerSettings.allowDuplicates}
                                    onChange={(e) => setTrailerSettings({ allowDuplicates: e.target.checked })}
                                />
                                <div className={clsx("w-10 h-5 rounded-full transition-colors", trailerSettings.allowDuplicates ? "bg-purple-500" : "bg-black relative border border-white/20")}>
                                    <div className={clsx("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", trailerSettings.allowDuplicates ? "translate-x-5" : "translate-x-0.5")} />
                                </div>
                            </div>
                        </label>
                        
                        <label className={clsx("flex flex-1 items-center justify-between p-4 rounded-xl border border-white/5 transition-colors cursor-pointer", !trailerSettings.allowDuplicates ? "opacity-30 pointer-events-none bg-transparent" : "bg-white/5 hover:bg-white/10")}>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-white">Allow Same Segments</span>
                                <span className="text-[10px] text-white/40 leading-tight">Can repeat the exact same portion of a video.</span>
                            </div>
                            <div className="relative">
                                <input 
                                    type="checkbox" className="sr-only" 
                                    checked={trailerSettings.allowSameSegment}
                                    onChange={(e) => setTrailerSettings({ allowSameSegment: e.target.checked })}
                                />
                                <div className={clsx("w-10 h-5 rounded-full transition-colors", trailerSettings.allowSameSegment ? "bg-purple-500" : "bg-black relative border border-white/20")}>
                                    <div className={clsx("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", trailerSettings.allowSameSegment ? "translate-x-5" : "translate-x-0.5")} />
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Force All Clips Toggle */}
                    <label className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-white flex items-center gap-2"><Layers size={14} className="text-emerald-400" /> Force All Clips Into Sequence</span>
                            <span className="text-[10px] text-white/40 leading-tight">Every file in the pool appears at least once. Generator can add more passes creatively beyond that guarentee.</span>
                        </div>
                        <div className="relative flex-shrink-0 ml-4">
                            <input 
                                type="checkbox" className="sr-only" 
                                checked={trailerSettings.useAllClips || false}
                                onChange={(e) => setTrailerSettings({ useAllClips: e.target.checked })}
                            />
                            <div className={clsx("w-10 h-5 rounded-full transition-colors", trailerSettings.useAllClips ? "bg-emerald-500" : "bg-black relative border border-white/20")}>
                                <div className={clsx("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", trailerSettings.useAllClips ? "translate-x-5" : "translate-x-0.5")} />
                            </div>
                        </div>
                    </label>

                    {/* Advanced Tree: Exclusions */}
                    <div className="border border-white/5 rounded-xl overflow-hidden bg-black/20">
                        <button 
                            onClick={() => setShowExclusions(!showExclusions)}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <FolderMinus size={16} className="text-red-400" />
                                <span className="text-sm font-bold text-white">Advanced Exclusions</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {excludedFolders.length > 0 && (
                                    <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                                        {excludedFolders.length} Excluded
                                    </span>
                                )}
                                {showExclusions ? <ChevronDown size={16} className="text-white/50" /> : <ChevronRight size={16} className="text-white/50" />}
                            </div>
                        </button>
                        
                        {showExclusions && (
                            <div className="p-4 border-t border-white/5 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                {folders.length === 0 ? (
                                    <span className="text-xs text-white/30 text-center block py-2 font-medium">No folders configured.</span>
                                ) : (
                                    folders.map(folder => {
                                        const isExcluded = excludedFolders.includes(folder.path);
                                        return (
                                            <label 
                                                key={folder.path}
                                                className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={isExcluded} 
                                                    onChange={() => toggleFolderExclusion(folder.path)} 
                                                />
                                                <div className={clsx("w-4 h-4 rounded-sm border flex items-center justify-center transition-colors", isExcluded ? "bg-red-500 border-red-500" : "border-white/20 bg-black/50")}>
                                                    {isExcluded && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className={clsx("text-xs font-medium truncate", isExcluded ? "text-white/40 line-through" : "text-white/80")}>
                                                    {folder.name || folder.path.split('/').pop()}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    </div>{/* end godMode disabled wrapper */}

                </div>

                <AnimatePresence>
                    {showAudioTrim && (
                        <motion.div
                            initial={{ opacity: 0, y: '100%' }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: '100%' }}
                            className="absolute inset-0 z-50 bg-[#11111a] flex flex-col"
                        >
                            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2"><Scissors size={16} className="text-purple-400" /> Audio Trimmer</h3>
                                <button onClick={() => { setShowAudioTrim(false); audioRef.current?.pause(); setAudioPlaying(false); }} className="text-white/50 hover:text-white"><X size={18} /></button>
                            </div>
                            
                            <div className="flex-1 p-6 flex flex-col gap-6 justify-center">
                                {/* Hidden Audio Element for metadata and playback */}
                                <audio 
                                    ref={audioRef} 
                                    src={audioUrl || ''} 
                                    onLoadedMetadata={handleAudioLoaded}
                                    onTimeUpdate={(e) => {
                                        if (e.target.currentTime >= audioTrimEnd) {
                                            e.target.pause();
                                            setAudioPlaying(false);
                                            e.target.currentTime = audioTrimStart;
                                        }
                                    }}
                                />
                                
                                <div className="text-center flex items-center justify-center gap-3">
                                    <div className="flex flex-col items-center">
                                        <p className="text-xs text-white/50 mb-1">Total Track Length: {audioMeta.duration.toFixed(1)}s</p>
                                        <p className="text-sm font-bold text-white">Select a segment to guide your trailer</p>
                                    </div>
                                    <button 
                                        onClick={handleRandomizeAudioBeat}
                                        disabled={isRandomizingAudio || !audioFile}
                                        className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/40 hover:to-blue-500/40 rounded-lg text-purple-300 border border-purple-500/30 transition-all flex items-center gap-2"
                                        title="Snap Random beat to sequence limit"
                                    >
                                        {isRandomizingAudio ? <Loader2 size={16} className="animate-spin" /> : <Dna size={16} />}
                                    </button>
                                </div>
                                
                                <div className="space-y-6">
                                    <WaveformVisualizer duration={audioMeta.duration} peaks={audioPeaks} start={audioTrimStart} end={audioTrimEnd} />

                                    <DualRangeSlider
                                        label="Active Audio Region"
                                        value={[audioTrimStart, audioTrimEnd]}
                                        min={0} max={audioMeta.duration || 1} step={0.5} unit="s"
                                        onChange={(v) => {
                                            setAudioTrimStart(v[0]);
                                            setAudioTrimEnd(v[1]);
                                        }}
                                    />
                                    
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <p className="text-xs font-bold text-white">Match Target Duration</p>
                                                <p className="text-[10px] text-white/50">Lock output length to { (audioTrimEnd - audioTrimStart).toFixed(1) }s</p>
                                            </div>
                                            <div className="relative flex-shrink-0 ml-4 cursor-pointer" onClick={() => setTrailerSettings({ matchAudioDuration: !trailerSettings.matchAudioDuration })}>
                                                <div className={clsx("w-10 h-5 rounded-full transition-colors", trailerSettings.matchAudioDuration ? "bg-purple-500" : "bg-black relative border border-white/20")}>
                                                    <div className={clsx("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", trailerSettings.matchAudioDuration ? "translate-x-5" : "translate-x-0.5")} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {!trailerSettings.matchAudioDuration && (
                                            <AnimatePresence>
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-purple-500/20 flex flex-col gap-2">
                                                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Unmatched Audio Strategy</p>
                                                    <select 
                                                        value={trailerSettings.audioTimelineStrategy || 'loop'}
                                                        onChange={(e) => setTrailerSettings({ audioTimelineStrategy: e.target.value })}
                                                        className="w-full bg-black/50 border border-purple-500/30 text-white text-xs font-bold rounded-md px-3 py-2 outline-none cursor-pointer"
                                                    >
                                                        <option className="bg-black" value="loop">Loop Audio Region</option>
                                                        <option className="bg-black" value="fade">Fade Out Early & Silence</option>
                                                        <option className="bg-black" value="continue">Continue Natively Past Region</option>
                                                    </select>
                                                </motion.div>
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex justify-center mt-4">
                                    <button onClick={toggleAudioPreview} className="p-4 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white">
                                        {audioPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                                <button onClick={() => { setShowAudioTrim(false); audioRef.current?.pause(); setAudioPlaying(false); }} className="px-5 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleConfirmAudio} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors">
                                    Confirm Selection
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-2xl">
                    <button 
                        onClick={() => setTrailerModalOpen(false)}
                        className="px-5 py-2.5 rounded-lg text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleGenerate}
                        disabled={currentPool.total === 0}
                        className="px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:grayscale"
                    >
                        <PlayCircle size={16} /> Generate Trailer
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default TrailerModal;
