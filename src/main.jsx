import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('Mounting React Application...');

// Global error catcher for diagnostics
window.addEventListener('error', (event) => {
  console.error('Global Error caught:', event.error);
  // We can attach it to window for the ErrorBoundary to potentially pick up 
  // if it's a script loading error or similar.
  window.__LAST_ERROR__ = event.error;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  window.__LAST_PROMISE_REJECTION__ = event.reason;
});

// Monkey-patch console for IPC logging
if (window.electronAPI && window.electronAPI.log) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    originalLog(...args);
    window.electronAPI.log('info', args.map(a => String(a)).join(' '));
  };
  console.warn = (...args) => {
    originalWarn(...args);
    window.electronAPI.log('warn', args.map(a => String(a)).join(' '));
  };
  console.error = (...args) => {
    originalError(...args);
    window.electronAPI.log('error', args.map(a => String(a)).join(' '));
  };
  console.log('[System] Console hooked for IPC logging');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
