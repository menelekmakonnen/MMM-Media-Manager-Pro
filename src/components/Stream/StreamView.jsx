import React, { useMemo, useEffect, useState, useCallback } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import StreamRow from './StreamRow';
import { Play, Plus, Info, Volume2, VolumeX, FolderOpen, MonitorPlay, ChevronLeft, ChevronRight } from 'lucide-react';
import { openDirectory } from '../../utils/fileSystem';
import { saveFolderHandle } from '../../utils/persistence';
import clsx from 'clsx';
import { getThumbnailUrl } from '../../utils/thumbnailCache';
import { getMediaUrl } from '../../utils/mediaUrl';

const StreamView = () => {
    const { 
        getGalleryFiles, 
        streamFeaturedFrequency,
        streamLayoutMode, streamClusteringMode, streamCategorizationMode,
        setFolderHandle, setCurrentFolder, startScan
    } = useMediaStore();

    const [isMuted, setIsMuted] = useState(true);
    const [heroIndex, setHeroIndex] = useState(0);
    const [heroThumbUrl, setHeroThumbUrl] = useState(null);
    const [featuredVideoUrl, setFeaturedVideoUrl] = useState(null);

    const allFiles = getGalleryFiles();
    const validFiles = allFiles.filter(f => f.type === 'video' || (f.type === 'image' && f.name.toLowerCase().endsWith('.gif'))); // strictly videos and GIFs

    // Calculate orientation with ABSOLUTE comparison (width vs height)
    const filesWithAR = validFiles.map(f => {
        const w = f.width || 0;
        const h = f.height || 0;
        return { ...f, isVertical: h > w };
    });

    const categories = useMemo(() => {
        if (filesWithAR.length === 0) return [];

        let cats = [];

        // 1. DATES (System)
        let sortedByDate = [...filesWithAR].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0)).slice(0, 40);
        let oldest = [...filesWithAR].sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0)).slice(0, 40);
        let random1 = [...filesWithAR].sort(() => Math.random() - 0.5).slice(0, 40);

        // 2. FOLDERS
        const folderMap = new Map();
        filesWithAR.forEach(f => {
            if (!f.folderPath) return;
            if (!folderMap.has(f.folderPath)) folderMap.set(f.folderPath, []);
            folderMap.get(f.folderPath).push(f);
        });

        const folderCategories = [];
        for (const [folderPath, items] of folderMap.entries()) {
            if (items.length >= 4) {
                const folderName = folderPath.split('/').pop() || 'Folder';
                folderCategories.push({
                    id: `folder_${folderPath}`,
                    title: `From: ${folderName}`,
                    items: items.slice(0, 40),
                    weight: items.length
                });
            }
        }
        folderCategories.sort((a, b) => b.weight - a.weight);

        // 3. SIMILAR NAMES (Clustering - System)
        const nameGroups = new Map();
        filesWithAR.forEach(f => {
            let key = '';
            if (streamClusteringMode === 'delimiter') {
                const parts = f.name.split(/[_\- ]+/);
                key = parts.length > 1 ? parts[0] : f.name.substring(0, 6);
            } else {
                key = f.name.substring(0, 6).toLowerCase();
            }
            if (key.length >= 3) {
                if (!nameGroups.has(key)) nameGroups.set(key, []);
                nameGroups.get(key).push(f);
            }
        });

        const nameCategories = [];
        for (const [key, items] of nameGroups.entries()) {
            if (items.length >= 4) {
                nameCategories.push({
                    id: `similar_${key}`,
                    title: `Because you like "${key}..."`,
                    items: items.slice(0, 40),
                    weight: items.length
                });
            }
        }
        nameCategories.sort((a, b) => b.weight - a.weight);

        // 4. DEDICATED GIFS (System)
        const allGifs = filesWithAR.filter(f => f.type === 'image' && f.name.toLowerCase().endsWith('.gif'));
        const gifCategories = [];
        for (let i = 0; i < allGifs.length; i += 10) {
            gifCategories.push({
                id: `gifs_${i}`,
                title: `Animated GIFs ${i/10 + 1}`,
                items: allGifs.slice(i, i + 10),
                weight: 100 // prioritize
            });
        }


        // ASSEMBLE based on categorizaton mode
        const mode = streamCategorizationMode || 'both';

        if (mode === 'system' || mode === 'both') {
            cats.push({ id: 'recent', title: 'Recently Added', items: sortedByDate });
            cats.push(...gifCategories.slice(0, 2));
            cats.push(...nameCategories.slice(0, 3));
            cats.push({ id: 'discover1', title: 'Discover Randomly', items: random1 });
            cats.push({ id: 'oldest', title: 'The Archives', items: oldest });
        }

        if (mode === 'folders' || mode === 'both') {
            cats.push(...folderCategories.slice(0, mode === 'folders' ? 10 : 3));
        }

        return cats.filter(c => c.items.length > 0).slice(0, 10);
    }, [filesWithAR, streamClusteringMode, streamCategorizationMode]);

    // Handle Hero Pool Slider
    const heroPool = useMemo(() => {
        const onlyVideos = filesWithAR.filter(f => f.type === 'video');
        if (onlyVideos.length >= 3) return onlyVideos.slice(0, 8); // slider of 8 for more variety
        if (filesWithAR.length > 0) return filesWithAR.slice(0, 8);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamFeaturedFrequency, filesWithAR]);

    // Auto Slider effect
    useEffect(() => {
        if (heroPool.length <= 1) return;
        const interval = setInterval(() => {
            setHeroIndex((prev) => (prev + 1) % heroPool.length);
        }, 10000); // 10 second slide for more viewing time
        return () => clearInterval(interval);
    }, [heroPool.length]);

    // Manual navigation
    const goToPrevSlide = useCallback(() => {
        setHeroIndex(prev => (prev - 1 + heroPool.length) % heroPool.length);
    }, [heroPool.length]);

    const goToNextSlide = useCallback(() => {
        setHeroIndex(prev => (prev + 1) % heroPool.length);
    }, [heroPool.length]);

    const featuredVideo = heroPool[heroIndex] || null;

    useEffect(() => {
        let active = true;
        if (featuredVideo) {
            getThumbnailUrl(featuredVideo).then(url => {
                if (active) setHeroThumbUrl(url);
            });
            if (featuredVideo.type === 'video') {
                getMediaUrl(featuredVideo).then(url => {
                    if (active) setFeaturedVideoUrl(url);
                });
            } else {
                setFeaturedVideoUrl(null);
            }
        }
        return () => { active = false; };
    }, [featuredVideo]);

    const handleOpenFolder = async () => {
        try {
            const handle = await openDirectory();
            if (handle) {
                setFolderHandle(handle);
                setCurrentFolder('/' + handle.name);
                saveFolderHandle(handle);
                startScan(handle);
            }
        } catch (error) {
            console.error('[StreamView] Error opening folder:', error);
        }
    };

    if (!featuredVideo) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-transparent text-white gap-6">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MonitorPlay size={40} className="text-white/20" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black tracking-tight mb-2">No Media Available</h2>
                    <p className="text-white/40 font-medium max-w-sm mb-8">
                        The Stream view requires videos or GIFs to generate its cinematic interface. Open a library to begin.
                    </p>
                    <button 
                        onClick={handleOpenFolder}
                        className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-blue-500 text-white font-black uppercase tracking-wider text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-95 flex items-center gap-2 mx-auto"
                    >
                        <FolderOpen size={18} /> Open Directory
                    </button>
                </div>
            </div>
        );
    }

    // Determine if hero video is vertical for proper fitting
    const heroW = featuredVideo.width || 0;
    const heroH = featuredVideo.height || 0;
    const isHeroVertical = heroH > heroW;

    // Build Rows — use absolute orientation
    let renderedRows = categories.flatMap((cat, i) => {
        const horizontalItems = cat.items.filter(f => !f.isVertical);
        const verticalItems = cat.items.filter(f => f.isVertical);
        
        const rows = [];
        
        if (horizontalItems.length > 0) {
            rows.push(<StreamRow key={cat.id + '_horz'} title={cat.title} items={horizontalItems} isVertical={false} floatReverse={i % 2 !== 0} />);
        }
        
        if (verticalItems.length > 0) {
            rows.push(<StreamRow key={cat.id + '_vert'} title={`${cat.title} (Vertical)`} items={verticalItems} isVertical={true} floatReverse={i % 2 === 0} />);
        }
        
        return rows;
    });

    return (
        <div className="w-full h-full bg-[#111] overflow-y-auto no-scrollbar relative font-sans select-none pb-24">
            {/* HERO / FEATURED VIDEO SLIDER — REVAMPED FOR ROOMINESS */}
            <div className="relative w-full h-[85vh] min-h-[600px] max-h-[950px] bg-black group/hero overflow-hidden">
                <div key={featuredVideo.id} className="absolute inset-0 animate-in fade-in duration-1000">
                    
                    {/* Always display thumbnail cover as fallback/background */}
                    {heroThumbUrl && (
                        <img 
                            src={heroThumbUrl}
                            className={clsx(
                                "absolute inset-0 w-full h-full transition-opacity duration-[2000ms]",
                                featuredVideo.type === 'video' ? "opacity-30" : "opacity-80 zoom-fast-animation",
                                isHeroVertical ? "object-contain" : "object-cover"
                            )}
                            alt="Featured Background"
                        />
                    )}

                    {/* Blurred background fill for vertical videos */}
                    {isHeroVertical && heroThumbUrl && (
                        <img
                            src={heroThumbUrl}
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 pointer-events-none"
                            alt=""
                        />
                    )}

                    {featuredVideo.type === 'video' && featuredVideoUrl && (
                        <video 
                            src={featuredVideoUrl}
                            className={clsx(
                                "absolute inset-0 w-full h-full opacity-80 mix-blend-screen",
                                isHeroVertical ? "object-contain" : "object-cover"
                            )}
                            autoPlay 
                            loop 
                            muted={isMuted}
                            playsInline
                        />
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#111]/30 to-transparent" />
                </div>
                
                {/* Hero Content */}
                <div className="absolute bottom-[12%] left-10 md:left-20 max-w-4xl text-left z-10 flex flex-col gap-4">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(0,0,0,1)] tracking-tight leading-[1.1] pb-2 break-words text-wrap">
                        {featuredVideo.name.replace(/\.[^/.]+$/, "")}
                    </h1>
                    
                    {/* Hero Meta Info */}
                    <div className="flex items-center gap-3 drop-shadow-md flex-wrap">
                        {featuredVideo.type === 'image' && <span className="text-[10px] uppercase font-black text-purple-300 px-2 py-0.5 border border-purple-500/40 bg-purple-500/20 rounded">GIF</span>}
                        {isHeroVertical && <span className="text-[10px] uppercase font-black text-pink-300 px-2 py-0.5 border border-pink-500/40 bg-pink-500/20 rounded">Vertical</span>}
                        {!isHeroVertical && heroW > 0 && <span className="text-[10px] uppercase font-black text-blue-300 px-2 py-0.5 border border-blue-500/40 bg-blue-500/20 rounded">Horizontal</span>}
                        <span className="text-emerald-400 font-bold text-sm bg-black/40 px-2 py-1 rounded backdrop-blur border border-white/10">{(featuredVideo.duration || 0).toFixed(0)}s</span>
                        {heroH > 1080 && (
                            <span className="text-white/80 font-bold text-sm bg-white/10 px-2 py-1 rounded backdrop-blur border border-white/20 uppercase">4K ULTRA HD</span>
                        )}
                        {heroW > 0 && heroH > 0 && (
                            <span className="text-white/50 font-bold text-[11px] bg-white/5 px-2 py-1 rounded backdrop-blur border border-white/10 font-mono">{heroW}×{heroH}</span>
                        )}
                        <span className="text-white/60 font-bold text-sm bg-white/5 px-2 py-1 rounded backdrop-blur border border-white/10">{new Date(featuredVideo.lastModified).getFullYear() || new Date().getFullYear()}</span>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button 
                            onClick={() => useMediaStore.getState().startSlideshowAt(featuredVideo.path)}
                            className="px-8 py-3 bg-white text-black font-bold text-lg rounded-[4px] flex items-center gap-3 hover:bg-white/80 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105"
                        >
                            <Play fill="currentColor" size={24} /> Play
                        </button>
                        <button className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-lg rounded-[4px] flex items-center gap-3 transition-all active:scale-95 border border-white/20 backdrop-blur-md">
                            <Info size={24} /> More Info
                        </button>
                    </div>
                </div>

                {/* Mute Button */}
                {featuredVideo.type === 'video' && (
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="absolute bottom-[18%] right-10 z-10 p-4 rounded-full border border-white/30 bg-black/40 hover:bg-black/60 text-white backdrop-blur transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                    >
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                )}

                {/* Manual Slide Navigation Chevrons */}
                {heroPool.length > 1 && (
                    <>
                        <button
                            onClick={goToPrevSlide}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/60 hover:text-white border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover/hero:opacity-100 active:scale-90 shadow-2xl"
                            title="Previous slide"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        <button
                            onClick={goToNextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/60 hover:text-white border border-white/10 backdrop-blur-sm transition-all opacity-0 group-hover/hero:opacity-100 active:scale-90 shadow-2xl"
                            title="Next slide"
                        >
                            <ChevronRight size={28} />
                        </button>
                    </>
                )}

                {/* Slider Position Indicators — clickable */}
                <div className="absolute bottom-[3%] left-0 right-0 flex justify-center gap-2 z-10">
                    {heroPool.map((_, i) => (
                        <button 
                            key={i} 
                            onClick={() => setHeroIndex(i)}
                            className={clsx(
                                "h-1.5 rounded-full transition-all duration-300 cursor-pointer hover:bg-white/60",
                                i === heroIndex ? "w-10 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "w-3 bg-white/30"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* ROWS CONTAINER */}
            <div className="relative z-20 -mt-24 flex flex-col gap-12 sm:gap-16">
                {renderedRows}
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes zoomSlow {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
                .zoom-fast-animation {
                    animation: zoomSlow 30s infinite alternate ease-in-out;
                }
            `}} />
        </div>
    );
};

export default StreamView;
