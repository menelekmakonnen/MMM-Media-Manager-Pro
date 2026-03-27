import React, { useEffect, useRef } from 'react';

const SpaceBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false }); // alpha false for performance
        let animationFrameId;

        // Configuration
        const numStars = 150; // Increased count slightly, but extremely tiny
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;

        const handleResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            initElements(); // Re-init relative to new size
        };
        window.addEventListener('resize', handleResize);

        // --- Elements ---
        let stars = [];
        let shootingStars = [];
        let phenomena = []; // nebulas and black holes

        const initElements = () => {
            stars = Array.from({ length: numStars }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 0.6, // Very tiny stars to simulate deep vastness
                alpha: Math.random() * 0.3, // Much dimmer
                pulseRate: 0.001 + Math.random() * 0.005, // Slower pulse
                pulseDir: Math.random() > 0.5 ? 1 : -1,
                color: Math.random() > 0.8 ? '#a1c4fd' : (Math.random() > 0.8 ? '#fbc2eb' : '#ffffff')
            }));

            shootingStars = [];
            phenomena = [];
        };
        initElements();

        const spawnShootingStar = () => {
            if (Math.random() < 0.0003 && shootingStars.length < 2) { // Extremely rare
                shootingStars.push({
                    x: Math.random() * w,
                    y: 0,
                    length: 10 + Math.random() * 20, // Tiny line
                    vx: 40 + Math.random() * 50, // Insanely fast
                    vy: 20 + Math.random() * 40,
                    life: 1.0,
                    decay: 0.15 + Math.random() * 0.1 // Blinks out immediately
                });
            }
        };

        const spawnPhenomenon = () => {
            // Blink and miss it (rare, low opacity, much smaller)
            if (Math.random() < 0.0002 && phenomena.length < 1) {
                const isBlackHole = Math.random() > 0.5;
                phenomena.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 0,
                    maxR: isBlackHole ? 30 + Math.random() * 50 : 60 + Math.random() * 80, // Very small in the distance
                    life: 0,
                    phase: 'growing',
                    speed: 0.03 + Math.random() * 0.04, // Very rapid fade in and vanish
                    type: isBlackHole ? 'blackHole' : 'nebula',
                    color1: isBlackHole ? 'rgba(0,0,0,0.9)' : `hsla(${Math.random() * 360}, 80%, 50%, 0.03)`, // Extremely faint
                    color2: 'rgba(0,0,0,0)',
                    rotation: 0
                });
            }
        };

        const render = () => {
            // Pitch black void. Reset composite operation so it actually overwrites the screen!
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#000000'; 
            ctx.fillRect(0, 0, w, h);

            // 1. Render Phenomena (Nebulas / Black Holes)
            ctx.globalCompositeOperation = 'screen';
            for (let i = phenomena.length - 1; i >= 0; i--) {
                const p = phenomena[i];
                
                // Update life
                if (p.phase === 'growing') {
                    p.life += p.speed;
                    if (p.life >= 1) {
                        p.life = 1;
                        p.phase = 'fading';
                    }
                } else {
                    p.life -= p.speed * 1.5; // Fades out very quickly and completely vanishes
                    if (p.life <= 0) {
                        phenomena.splice(i, 1);
                        continue;
                    }
                }

                p.r = p.maxR * Math.sqrt(p.life);
                p.rotation += 0.001;

                if (p.type === 'blackHole') {
                    ctx.globalCompositeOperation = 'source-over';
                    // Draw Accretion disk glow
                    const gradient = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
                    gradient.addColorStop(0, 'rgba(0,0,0,1)');
                    gradient.addColorStop(0.3, 'rgba(0,0,0,0.8)');
                    gradient.addColorStop(0.6, 'rgba(56, 189, 248, ' + (0.2 * p.life) + ')');
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);

                    // Tiny bright ring
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r * 0.3, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 * p.life) + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                } else {
                    // Nebula
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
                    gradient.addColorStop(0, p.color1.replace('0.1', (0.15 * p.life).toString()));
                    gradient.addColorStop(1, p.color2);
                    
                    ctx.fillStyle = gradient;
                    // Distorted nebula shape
                    ctx.scale(1.5, 0.8);
                    ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
                    ctx.restore();
                }
            }

            // 2. Render Stars
            ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.alpha += s.pulseRate * s.pulseDir;
                if (s.alpha >= 1) {
                    s.alpha = 1;
                    s.pulseDir = -1;
                } else if (s.alpha <= 0.2) {
                    s.alpha = 0.2;
                    s.pulseDir = 1;
                }

                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = s.color;
                ctx.globalAlpha = s.alpha;
                ctx.fill();
            }

            // 3. Render Shooting Stars
            ctx.lineWidth = 2;
            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += ss.vx;
                ss.y += ss.vy;
                ss.life -= ss.decay;

                if (ss.life <= 0 || ss.x > w || ss.y > h) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                // Draw trail
                const startX = ss.x - ss.vx * 3;
                const startY = ss.y - ss.vy * 3;
                
                const gradient = ctx.createLinearGradient(startX, startY, ss.x, ss.y);
                gradient.addColorStop(0, 'rgba(255,255,255,0)');
                gradient.addColorStop(1, `rgba(255,255,255,${ss.life})`);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(ss.x, ss.y);
                ctx.strokeStyle = gradient;
                ctx.globalAlpha = 1;
                ctx.stroke();
            }
            ctx.globalAlpha = 1; // Reset

            // Spawners logic
            spawnShootingStar();
            spawnPhenomenon();


            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
            style={{ backgroundColor: '#000' }}
        />
    );
};

export default SpaceBackground;
