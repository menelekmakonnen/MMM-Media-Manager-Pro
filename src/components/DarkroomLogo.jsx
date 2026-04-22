import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * DarkroomLogo — Animated premium lens/aperture logo for MMMedia Darkroom.
 * 
 * States:
 *   - idle:    Subtle ambient pulse on the core sensor glow
 *   - hover:   Aperture blades rotate, ring brightens, core expands
 *   - active:  Iris contracts (click-down), flash pulse
 *   - clicked: Brief shutter-snap animation with ring flare
 * 
 * Props:
 *   - size:       number (px), default 32
 *   - accentColor: string, default var(--accent-primary)
 *   - onClick:    function, optional
 *   - className:  string, optional
 *   - title:      string, optional tooltip
 */

const DarkroomLogo = ({ size = 32, accentColor, onClick, className = '', title }) => {
  const [state, setState] = useState('idle'); // idle | hover | active | clicked
  const timeoutRef = useRef(null);
  const resolvedAccent = accentColor || 'var(--accent-primary)';

  // Derive complementary colors for inline SVG
  const [computedAccent, setComputedAccent] = useState('#3b82f6');
  const containerRef = useRef(null);

  useEffect(() => {
    if (accentColor && accentColor.startsWith('#')) {
      setComputedAccent(accentColor);
    } else {
      // Resolve CSS variable
      const timer = setTimeout(() => {
        const resolved = getComputedStyle(document.body).getPropertyValue('--accent-primary').trim();
        if (resolved) setComputedAccent(resolved);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [accentColor]);

  const handleMouseEnter = useCallback(() => {
    if (state !== 'clicked') setState('hover');
  }, [state]);

  const handleMouseLeave = useCallback(() => {
    if (state !== 'clicked') setState('idle');
  }, [state]);

  const handleMouseDown = useCallback(() => {
    setState('active');
  }, []);

  const handleMouseUp = useCallback(() => {
    setState('clicked');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setState('idle'), 400);
    onClick?.();
  }, [onClick]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Animation values based on state
  const apertureRotation = state === 'hover' ? 15 : state === 'active' ? -8 : state === 'clicked' ? 30 : 0;
  const coreScale = state === 'hover' ? 1.15 : state === 'active' ? 0.7 : state === 'clicked' ? 1.3 : 1;
  const ringOpacity = state === 'hover' ? 1 : state === 'active' ? 0.7 : state === 'clicked' ? 1 : 0.85;
  const flashOpacity = state === 'clicked' ? 0.4 : 0;
  const outerRingScale = state === 'hover' ? 1.02 : state === 'active' ? 0.97 : 1;

  // Unique IDs to avoid SVG gradient clashes when multiple logos render
  const uid = useRef(`dl-${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div
      ref={containerRef}
      className={`darkroom-logo-container ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      title={title}
      role="button"
      tabIndex={0}
      style={{
        width: size,
        height: size,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#181825" />
            <stop offset="50%" stopColor="#0d0d1a" />
            <stop offset="100%" stopColor="#050510" />
          </linearGradient>
          <linearGradient id={`${uid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={computedAccent} stopOpacity="1" />
            <stop offset="100%" stopColor={computedAccent} stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="45%" cy="42%" r="45%">
            <stop offset="0%" stopColor={computedAccent} stopOpacity="0.5" />
            <stop offset="60%" stopColor={computedAccent} stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <filter id={`${uid}-ringGlow`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${uid}-coreGlow`}>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={`${uid}-clip`}>
            <rect x="32" y="32" width="448" height="448" rx="100" />
          </clipPath>
        </defs>

        {/* Container */}
        <rect x="32" y="32" width="448" height="448" rx="100"
          fill={`url(#${uid}-bg)`} />
        <rect x="32" y="32" width="448" height="448" rx="100"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />

        <g clipPath={`url(#${uid}-clip)`}>
          {/* Ambient glow */}
          <circle cx="256" cy="256" r="200" fill={`url(#${uid}-glow)`}
            style={{
              transition: 'opacity 300ms ease',
              opacity: state === 'hover' ? 1 : 0.7,
            }}
          />

          {/* Outer lens ring */}
          <g style={{
            transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
            transformOrigin: '256px 256px',
            transform: `scale(${outerRingScale})`,
            opacity: ringOpacity,
          }}>
            <circle cx="256" cy="256" r="155" fill="none"
              stroke={`url(#${uid}-ring)`} strokeWidth="10"
              filter={`url(#${uid}-ringGlow)`} />
            <circle cx="256" cy="256" r="170" fill="none"
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
            <circle cx="256" cy="256" r="140" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          </g>

          {/* Aperture blades (animated rotation) */}
          <g style={{
            transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: '256px 256px',
            transform: `rotate(${apertureRotation}deg)`,
          }}>
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <path
                key={angle}
                d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
                fill="none"
                stroke={computedAccent}
                strokeWidth="2.5"
                opacity="0.5"
                transform={`translate(256 256) rotate(${angle})`}
              />
            ))}
            <polygon
              points="256,204 301,230 301,282 256,308 211,282 211,230"
              fill="rgba(0,0,0,0.3)"
              stroke={computedAccent}
              strokeWidth="1.5"
              opacity="0.5"
            />
          </g>

          {/* Inner lens element */}
          <circle cx="256" cy="256" r="95" fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth="3" />

          {/* Central sensor (animated scale) */}
          <g style={{
            transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformOrigin: '256px 256px',
            transform: `scale(${coreScale})`,
          }}>
            <circle cx="256" cy="256" r="38" fill={computedAccent}
              opacity="0.95" filter={`url(#${uid}-coreGlow)`} />
            <circle cx="256" cy="256" r="28"
              fill="rgba(0,0,0,0.4)" opacity="0.6" />
            <circle cx="256" cy="256" r="18" fill={computedAccent}
              opacity="0.9" />
            {/* Specular highlights */}
            <circle cx="268" cy="244" r="8" fill="white" opacity="0.85" />
            <circle cx="276" cy="236" r="3" fill="white" opacity="0.7" />
            <circle cx="242" cy="262" r="4" fill="white" opacity="0.25" />
          </g>

          {/* Crosshairs */}
          <line x1="256" y1="200" x2="256" y2="218" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <line x1="256" y1="294" x2="256" y2="312" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <line x1="200" y1="256" x2="218" y2="256" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <line x1="294" y1="256" x2="312" y2="256" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

          {/* Flash overlay on click */}
          <rect x="32" y="32" width="448" height="448"
            fill="white"
            style={{
              transition: 'opacity 200ms ease-out',
              opacity: flashOpacity,
              pointerEvents: 'none',
            }}
          />
        </g>
      </svg>

      {/* Idle pulse animation (CSS) */}
      <style>{`
        .darkroom-logo-container {
          position: relative;
        }
        .darkroom-logo-container::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 22%;
          background: radial-gradient(circle, ${computedAccent}22 0%, transparent 70%);
          animation: logoPulse 3s ease-in-out infinite;
          pointer-events: none;
          opacity: ${state === 'idle' ? 1 : 0};
          transition: opacity 300ms ease;
        }
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(DarkroomLogo);
