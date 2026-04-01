import React, { useRef, useEffect, useState } from 'react';
import StreamCard from './StreamCard';
import useMediaStore from '../../stores/useMediaStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const StreamRow = ({ title, items, isVertical, floatReverse }) => {
    const { streamRowScrollMode } = useMediaStore();
    const rowRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);
    const [scrollPos, setScrollPos] = useState(0);

    // Auto-float system
    useEffect(() => {
        if (streamRowScrollMode !== 'float' || !rowRef.current || items.length === 0 || isHovering) return;

        let animationFrameId;
        const speed = 0.5; // pixels per frame
        const row = rowRef.current;
        let pos = floatReverse ? row.scrollWidth - row.clientWidth : row.scrollLeft;
        let dir = floatReverse ? -1 : 1;

        const loop = () => {
            if (row) {
                pos += dir * speed;
                // bounce at edges
                if (pos >= row.scrollWidth - row.clientWidth - 1) {
                    dir = -1;
                    pos = row.scrollWidth - row.clientWidth - 1;
                } else if (pos <= 0) {
                    dir = 1;
                    pos = 0;
                }
                row.scrollLeft = pos;
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        const tId = setTimeout(loop, 500);

        return () => {
            clearTimeout(tId);
            cancelAnimationFrame(animationFrameId);
        };
    }, [streamRowScrollMode, items.length, floatReverse, isHovering]);

    const handleScroll = (direction) => {
        if (!rowRef.current) return;
        const amount = direction === 'left' ? -rowRef.current.clientWidth + 100 : rowRef.current.clientWidth - 100;
        rowRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    const handleScrollEvent = () => {
        if (rowRef.current) {
            setScrollPos(rowRef.current.scrollLeft);
        }
    };

    if (items.length === 0) return null;

    const maxScroll = rowRef.current ? rowRef.current.scrollWidth - rowRef.current.clientWidth : 0;
    const canScrollLeft = scrollPos > 0;
    const canScrollRight = maxScroll > 0 && scrollPos < maxScroll - 10;

    return (
        <div 
            className="w-full flex items-start flex-col gap-2 z-20 group/row relative px-8"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <h2 className="text-xl sm:text-2xl font-bold text-white/90 px-2 tracking-tight drop-shadow-md cursor-pointer hover:text-white transition-colors">
                {title}
            </h2>
            
            <div className="relative w-full">
                {/* Left Arrow */}
                <button
                    onClick={() => handleScroll('left')}
                    className={clsx(
                        "absolute -left-6 top-1/2 -translate-y-1/2 z-[60] w-12 h-32 md:h-48 bg-black/60 hover:bg-black/90 text-white rounded-r-xl border border-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-300",
                        isHovering && canScrollLeft ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                    )}
                >
                    <ChevronLeft size={32} />
                </button>

                <div 
                    ref={rowRef}
                    onScroll={handleScrollEvent}
                    className="flex gap-2 sm:gap-4 overflow-x-auto py-8 px-2 items-center relative"
                    style={{ 
                        /* Custom scrollbar hiding but keeping functionality */
                        scrollbarWidth: 'none', 
                        msOverflowStyle: 'none'
                    }}
                >
                    {items.map((file, idx) => (
                        <StreamCard key={file.id || file.path + idx} file={file} isVertical={isVertical} />
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={() => handleScroll('right')}
                    className={clsx(
                        "absolute -right-6 top-1/2 -translate-y-1/2 z-[60] w-12 h-32 md:h-48 bg-black/60 hover:bg-black/90 text-white rounded-l-xl border border-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-300",
                        isHovering && canScrollRight ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
                    )}
                >
                    <ChevronRight size={32} />
                </button>
            </div>
            
            {/* Embedded styles for hiding webkit scrollbars directly here to ensure it works without global css touches */}
            <style dangerouslySetInnerHTML={{__html: `
                .group\\/row div::-webkit-scrollbar {
                    display: none;
                }
            `}} />
        </div>
    );
};

export default StreamRow;
