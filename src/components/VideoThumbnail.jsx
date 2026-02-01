import React, { useEffect, useState, memo } from 'react';
import { Film, Loader2 } from 'lucide-react';

const VideoThumbnail = memo(({ file }) => {
    const [src, setSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        let objectUrl = null;
        let video = null;

        const generateThumbnail = async () => {
            try {
                if (!file.handle) return;
                const fileData = await file.handle.getFile();
                if (!active) return;

                objectUrl = URL.createObjectURL(fileData);

                video = document.createElement('video');
                video.src = objectUrl;
                video.muted = true;
                video.playsInline = true;
                video.currentTime = 1; // Seek to 1 second

                await new Promise((resolve, reject) => {
                    video.onloadeddata = resolve;
                    video.onerror = reject;
                    const tm = setTimeout(reject, 2000);
                    video._timeout = tm;
                });

                if (!active) return;

                // Wait for seek
                if (video.readyState < 2) {
                    await new Promise(r => video.onseeked = r);
                }

                if (!active) return;

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth / 4; // Downscale for thumbnail
                canvas.height = video.videoHeight / 4;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (active) {
                    setSrc(canvas.toDataURL('image/jpeg', 0.7));
                    setLoading(false);
                }
            } catch (err) {
                if (active) setLoading(false);
            } finally {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                if (video) {
                    if (video._timeout) clearTimeout(video._timeout);
                    video.pause();
                    video.src = "";
                    video.load();
                }
            }
        };

        generateThumbnail();

        return () => {
            active = false;
        };
    }, [file]);

    if (loading) {
        return <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]/50" />;
    }

    if (src) {
        return <img src={src} alt={file.name} className="h-full w-full object-cover opacity-0 animate-fade-in" onLoad={(e) => e.currentTarget.style.opacity = 1} />;
    }

    return <Film size={24} strokeWidth={1.5} className="text-[var(--text-secondary)]" />;
});

export default VideoThumbnail;
