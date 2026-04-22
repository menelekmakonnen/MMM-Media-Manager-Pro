/**
 * MMMedia Darkroom — Premium Logo Generator
 * 
 * Produces a sophisticated, multi-layered camera aperture/darkroom lens icon
 * that dynamically adapts to the app's accent color.
 * 
 * Design language: Deep depth, geometric precision, film-era elegance meets
 * modern minimalism. Inspired by Leica, Hasselblad, and Adobe iconography.
 */

export const getLogoSvgString = (accentColor = '#3b82f6') => {
  // Derive complementary colors from the accent
  const hex = accentColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Lighter tint for highlights
  const tintR = Math.min(255, r + 80);
  const tintG = Math.min(255, g + 80);
  const tintB = Math.min(255, b + 80);
  const tint = `rgb(${tintR},${tintG},${tintB})`;

  // Darker shade for shadows
  const shadeR = Math.max(0, r - 60);
  const shadeG = Math.max(0, g - 60);
  const shadeB = Math.max(0, b - 60);
  const shade = `rgb(${shadeR},${shadeG},${shadeB})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#181825"/>
      <stop offset="50%" stop-color="#0d0d1a"/>
      <stop offset="100%" stop-color="#050510"/>
    </linearGradient>

    <!-- Accent ring gradient -->
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tint}"/>
      <stop offset="50%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="${shade}"/>
    </linearGradient>

    <!-- Secondary ring (inverted) -->
    <linearGradient id="ringGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${shade}"/>
      <stop offset="100%" stop-color="${tint}"/>
    </linearGradient>

    <!-- Core radial glow -->
    <radialGradient id="coreGlow" cx="45%" cy="42%" r="45%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.6"/>
      <stop offset="40%" stop-color="${accentColor}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>

    <!-- Ambient light radial -->
    <radialGradient id="ambientLight" cx="35%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
    </radialGradient>

    <!-- Soft outer shadow -->
    <filter id="outerShadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.7"/>
    </filter>

    <!-- Ring glow effect -->
    <filter id="ringGlow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Core sensor glow -->
    <filter id="sensorGlow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clipping mask for inner contents -->
    <clipPath id="iconClip">
      <rect x="32" y="32" width="448" height="448" rx="100"/>
    </clipPath>
  </defs>

  <!-- LAYER 1: Icon container -->
  <rect x="32" y="32" width="448" height="448" rx="100"
        fill="url(#bgGrad)" filter="url(#outerShadow)"/>

  <!-- Subtle border -->
  <rect x="32" y="32" width="448" height="448" rx="100"
        fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>

  <g clip-path="url(#iconClip)">
    <!-- LAYER 2: Ambient light -->
    <circle cx="256" cy="256" r="220" fill="url(#ambientLight)"/>
    <circle cx="256" cy="256" r="200" fill="url(#coreGlow)"/>

    <!-- LAYER 3: Outer lens ring -->
    <circle cx="256" cy="256" r="155" fill="none"
            stroke="url(#ringGrad)" stroke-width="10" filter="url(#ringGlow)" opacity="0.9"/>

    <!-- Fine precision marks (like a real lens barrel) -->
    <circle cx="256" cy="256" r="170" fill="none"
            stroke="rgba(255,255,255,0.04)" stroke-width="0.8"/>
    <circle cx="256" cy="256" r="140" fill="none"
            stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>

    <!-- LAYER 4: Aperture blades -->
    <g transform="translate(256 256)" opacity="0.85">
      <!-- Blade 1 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(0)" opacity="0.7"/>
      <!-- Blade 2 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(60)" opacity="0.7"/>
      <!-- Blade 3 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(120)" opacity="0.7"/>
      <!-- Blade 4 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(180)" opacity="0.7"/>
      <!-- Blade 5 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(240)" opacity="0.7"/>
      <!-- Blade 6 -->
      <path d="M 0,-105 L 45,-68 L 25,-20 L -25,-20 L -45,-68 Z"
            fill="none" stroke="url(#ringGrad2)" stroke-width="2.5"
            transform="rotate(300)" opacity="0.7"/>

      <!-- Inner aperture hexagon (the "opening") -->
      <polygon points="0,-52 45,-26 45,26 0,52 -45,26 -45,-26"
               fill="rgba(0,0,0,0.3)" stroke="${accentColor}" stroke-width="1.5" opacity="0.6"/>
    </g>

    <!-- LAYER 5: Inner lens element -->
    <circle cx="256" cy="256" r="95" fill="none"
            stroke="rgba(255,255,255,0.08)" stroke-width="3"/>

    <!-- LAYER 6: Central sensor -->
    <circle cx="256" cy="256" r="38" fill="${accentColor}" opacity="0.95" filter="url(#sensorGlow)"/>
    <circle cx="256" cy="256" r="28" fill="${shade}" opacity="0.6"/>
    <circle cx="256" cy="256" r="18" fill="${accentColor}" opacity="0.9"/>

    <!-- Specular highlights (life in the lens) -->
    <circle cx="268" cy="244" r="8" fill="white" opacity="0.85"/>
    <circle cx="276" cy="236" r="3" fill="white" opacity="0.7"/>
    <circle cx="242" cy="262" r="4" fill="white" opacity="0.3"/>

    <!-- LAYER 7: Light leak -->
    <ellipse cx="180" cy="180" rx="80" ry="30" transform="rotate(-30 180 180)"
             fill="white" opacity="0.03"/>
    <path d="M 100 150 Q 256 80 412 150" fill="none"
          stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.06"/>

    <!-- Fine crosshair (precision focus indicator) -->
    <line x1="256" y1="200" x2="256" y2="218" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
    <line x1="256" y1="294" x2="256" y2="312" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
    <line x1="200" y1="256" x2="218" y2="256" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
    <line x1="294" y1="256" x2="312" y2="256" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
  </g>
</svg>`;
};

/**
 * Generates the SVG string into a base64 DataURL, and also converts it to a PNG via 
 * a standard HTML5 Canvas to pass to Electron Main via IPC to update the native OS 
 * taskbar icon dynamically.
 */
export const updateAppIcons = (accentColor) => {
  const svgString = getLogoSvgString(accentColor);
  // UTF-8-safe base64 encoding (btoa only supports Latin1)
  const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  // Update browser-native favicon
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = dataUrl;

  // Force the document title to stay correct
  document.title = 'MMMedia Darkroom';

  // Export to PNG for Windows Electron Taskbar support
  if (window.electronAPI && window.electronAPI.updateIcon) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const pngDataUrl = canvas.toDataURL('image/png');
      window.electronAPI.updateIcon(pngDataUrl);
    };
    img.src = dataUrl;
  }
};
