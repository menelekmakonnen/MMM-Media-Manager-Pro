import { useMemo } from 'react';
import useMediaStore from '../../stores/useMediaStore';
import { useBridgeStore } from '../../lib/appBridge';

const DURATION_BUCKETS = [
    { label: '<5s', max: 5 },
    { label: '5-15s', max: 15 },
    { label: '15-30s', max: 30 },
    { label: '30s-1m', max: 60 },
    { label: '1-3m', max: 180 },
    { label: '3-10m', max: 600 },
    { label: '10m+', max: Infinity }
];

const SIZE_BUCKETS = [
    { label: '<1MB', max: 1048576 },
    { label: '1-10MB', max: 10485760 },
    { label: '10-50MB', max: 52428800 },
    { label: '50-200MB', max: 209715200 },
    { label: '200MB-1GB', max: 1073741824 },
    { label: '1GB+', max: Infinity }
];

const formatBytes = (b) => {
    if (!b) return '0 B';
    const u = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
};

export default function useStudioStats() {
    const { files, folders, activityLog, trailerSettings } = useMediaStore();
    const { status: bridgeStatus, proAppInfo, messageLog } = useBridgeStore();

    return useMemo(() => {
        const videos = files.filter(f => f.type === 'video');
        const images = files.filter(f => f.type === 'image' || f.type === 'gif');
        const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
        const totalDuration = videos.reduce((s, f) => s + (f.duration || 0), 0);

        // Orientation breakdown
        let landscape = 0, portrait = 0, square = 0;
        files.forEach(f => {
            if (!f.width || !f.height) return;
            const r = f.width / f.height;
            if (r > 1.05) landscape++;
            else if (r < 0.95) portrait++;
            else square++;
        });

        // Duration histogram
        const durationHist = DURATION_BUCKETS.map(b => ({ ...b, count: 0, files: [] }));
        videos.forEach(f => {
            const d = f.duration || 0;
            for (const bucket of durationHist) {
                if (d < bucket.max) { bucket.count++; bucket.files.push(f); break; }
            }
        });

        // Size histogram
        const sizeHist = SIZE_BUCKETS.map(b => ({ ...b, count: 0, files: [] }));
        files.forEach(f => {
            const s = f.size || 0;
            for (const bucket of sizeHist) {
                if (s < bucket.max) { bucket.count++; bucket.files.push(f); break; }
            }
        });

        // Resolution buckets
        const resolutions = { '4K+': 0, '1080p': 0, '720p': 0, '480p': 0, 'Other': 0 };
        const resFiles = { '4K+': [], '1080p': [], '720p': [], '480p': [], 'Other': [] };
        files.forEach(f => {
            const h = f.height || 0;
            const key = h >= 2160 ? '4K+' : h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : 'Other';
            resolutions[key]++;
            resFiles[key].push(f);
        });

        // Format breakdown
        const formats = {};
        files.forEach(f => {
            const ext = (f.name || '').split('.').pop().toLowerCase();
            formats[ext] = (formats[ext] || 0) + 1;
        });
        const formatEntries = Object.entries(formats).sort((a, b) => b[1] - a[1]).slice(0, 8);

        // Top folders by file count
        const folderStats = folders.map(folder => {
            const folderFiles = files.filter(f => f.folderPath === folder.path);
            const folderSize = folderFiles.reduce((s, f) => s + (f.size || 0), 0);
            return { ...folder, computedFileCount: folderFiles.length, computedSize: folderSize };
        }).sort((a, b) => b.computedFileCount - a.computedFileCount).slice(0, 12);

        // Framerate breakdown
        const fpsGroups = { '24': 0, '30': 0, '60': 0, '120+': 0, 'Unknown': 0 };
        videos.forEach(f => {
            const fps = f.framerate || f.fps || 0;
            if (fps >= 119) fpsGroups['120+']++;
            else if (fps >= 55) fpsGroups['60']++;
            else if (fps >= 28) fpsGroups['30']++;
            else if (fps >= 20) fpsGroups['24']++;
            else fpsGroups['Unknown']++;
        });

        return {
            totalFiles: files.length, videoCount: videos.length, imageCount: images.length,
            totalSize, totalSizeStr: formatBytes(totalSize),
            totalDuration, landscape, portrait, square,
            durationHist, sizeHist, resolutions, resFiles,
            formatEntries, folderStats, fpsGroups,
            bridgeStatus, proAppInfo, messageLog,
            activityLog, folders, files,
            trailerEditsCount: trailerSettings?.savedEdits?.length || 0
        };
    }, [files, folders, activityLog, trailerSettings, bridgeStatus, proAppInfo, messageLog]);
}
