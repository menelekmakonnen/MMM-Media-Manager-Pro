export const getLogoSvgString = (accentColor = '#3b82f6') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient for the app icon container -->
    <linearGradient id="bgBox" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>

    <!-- Thematic Gradient Ring -->
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>

    <!-- Deep Glowing Core -->
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.9" />
      <stop offset="50%" stop-color="${accentColor}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Ambient Shadow for depth -->
    <filter id="shadow">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
    <filter id="glowFilter">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Base Icon Shape (Rounded Squircle) -->
  <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#bgBox)" filter="url(#shadow)" stroke="#334155" stroke-width="2"/>

  <!-- Inner Glowing Core -->
  <circle cx="256" cy="256" r="180" fill="url(#glow)" />

  <!-- The "Lens" Ring -->
  <circle cx="256" cy="256" r="140" fill="none" stroke="url(#ring)" stroke-width="14" filter="url(#glowFilter)" />
  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.2" />

  <!-- Modern Abstract Aperture Blades (Geometric & Minimalist) -->
  <g transform="translate(256 256)">
    <!-- Main aperture opening -->
    <polygon points="0,-80 69,-40 69,40 0,80 -69,40 -69,-40" fill="none" stroke="url(#ring)" stroke-width="6" opacity="0.9"/>
    
    <!-- Sophisticated Lens Highlights & Prisms -->
    <path d="M -40 -69 L 20 -30 L 30 30 L -20 69 Z" fill="#ffffff" fill-opacity="0.08" />
    <path d="M 40 -69 L 69 -20 L 20 30 L -30 -20 Z" fill="#ffffff" fill-opacity="0.05" />
    
    <!-- Central Sensor Dot -->
    <circle cx="0" cy="0" r="28" fill="${accentColor}" opacity="0.95" />
    <circle cx="10" cy="-10" r="8" fill="#ffffff" opacity="0.9" />
    <circle cx="18" cy="-18" r="3" fill="#ffffff" opacity="0.8" />
  </g>
  
  <!-- Sleek Light Leak / Reflection Curve -->
  <path d="M 80 120 Q 256 40 432 120" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.15" filter="url(#glowFilter)"/>
</svg>
`;

/**
 * Generates the SVG strings into a base64 DataURL, and also converts it to a PNG via a standard HTML5 Canvas 
 * to pass to Electron Main via IPC to update the native OS taskbar icon dynamically.
 */
export const updateAppIcons = (accentColor) => {
  const svgString = getLogoSvgString(accentColor);
  const svgBase64 = btoa(svgString);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  // Update browser-native favicon correctly based on dynamic URL
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = dataUrl;

  // We must export to PNG for Windows Electron Taskbar support
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
