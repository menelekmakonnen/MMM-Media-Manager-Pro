import { useEffect } from 'react';
import useMediaStore from '../stores/useMediaStore';

// View cycle order for ESC key
const VIEW_CYCLE = ['standard', 'stream', 'slideshow', 'gallery', 'trailer', 'settings'];

export const useKeyboardBindings = () => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Do not trigger actions if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

            const state = useMediaStore.getState();
            const { appViewMode, keyboardBindings } = state;

            // Helper to match key combo
            const isMatch = (combo) => {
                if (!combo) return false;
                if (typeof combo === 'string') {
                    // Single key — must not have any modifier
                    return e.key.toLowerCase() === combo.toLowerCase() && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
                }
                if (Array.isArray(combo)) {
                    const hasCtrl = combo.includes('Control');
                    const hasShift = combo.includes('Shift');
                    const hasAlt = combo.includes('Alt');
                    const hasMeta = combo.includes('Meta');
                    const keyChar = combo.find(k => !['Control', 'Shift', 'Alt', 'Meta'].includes(k));

                    return (
                        e.ctrlKey === hasCtrl &&
                        e.shiftKey === hasShift &&
                        e.altKey === hasAlt &&
                        e.metaKey === hasMeta &&
                        e.key.toLowerCase() === keyChar.toLowerCase()
                    );
                }
                return false;
            };

            let preventDefault = false;

            // === ESC: Cycle through views sequentially ===
            if (e.key === 'Escape') {
                // If in fullscreen or movie mode, exit those first
                if (state.fullscreenMode) {
                    state.toggleFullscreen();
                    e.preventDefault();
                    return;
                }
                if (state.movieMode) {
                    state.toggleMovieMode();
                    e.preventDefault();
                    return;
                }
                // Cycle to next view
                const currentIdx = VIEW_CYCLE.indexOf(appViewMode);
                const nextIdx = (currentIdx + 1) % VIEW_CYCLE.length;
                state.setAppViewMode(VIEW_CYCLE[nextIdx]);
                e.preventDefault();
                return;
            }

            // === Fullscreen: Shift+F (configurable) ===
            if (isMatch(keyboardBindings.fullscreen)) {
                state.toggleFullscreen();
                e.preventDefault();
                return;
            }

            // === Movie Mode: M key (configurable) ===
            if (isMatch(keyboardBindings.movieMode)) {
                state.toggleMovieMode();
                e.preventDefault();
                return;
            }

            // === Playback: Space = Play/Pause (Standard and Slideshow) ===
            if (['standard', 'slideshow'].includes(appViewMode) && isMatch(keyboardBindings.playPause)) {
                state.toggleGlobalPlay();
                preventDefault = true;
            }

            // === Navigation ===
            if (isMatch(keyboardBindings.nextItem)) {
                state.nextFile();
                preventDefault = true;
            } else if (isMatch(keyboardBindings.prevItem)) {
                state.prevFile();
                preventDefault = true;
            } else if (isMatch(keyboardBindings.nextGroup)) {
                state.skipGroup(1);
                preventDefault = true;
            } else if (isMatch(keyboardBindings.prevGroup)) {
                state.skipGroup(-1);
                preventDefault = true;
            }

            // === Random Jump: R key (Standard and Slideshow) ===
            if (['standard', 'slideshow'].includes(appViewMode) && isMatch(keyboardBindings.randomJump)) {
                // Trigger random start on all registered videos
                state.triggerRandomStart();
                // Also randomize all video elements directly via DOM
                document.querySelectorAll('video').forEach(v => {
                    if (v.duration && !isNaN(v.duration)) {
                        v.currentTime = Math.random() * v.duration;
                    }
                });
                preventDefault = true;
            }

            // === Volume Control (Standard & Slideshow) ===
            if (['standard', 'slideshow'].includes(appViewMode)) {
                if (isMatch(keyboardBindings.volumeUp)) {
                    // Smoother volume: step 0.02 instead of 0.05
                    state.setMasterVolume(Math.min(4, state.masterVolume + 0.02));
                    state.setIsMasterMuted(false);
                    preventDefault = true;
                } else if (isMatch(keyboardBindings.volumeDown)) {
                    state.setMasterVolume(Math.max(0, state.masterVolume - 0.02));
                    if (state.masterVolume - 0.02 <= 0) state.setIsMasterMuted(true);
                    preventDefault = true;
                }
            }

            // Gallery View: Let arrows scroll naturally
            if (appViewMode === 'gallery') {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    preventDefault = false;
                }
            }

            // === Grid Assignments (Numpads) ===
            if (['standard', 'slideshow'].includes(appViewMode)) {
                if (isMatch(keyboardBindings.grid1)) { state.setGridLayout(1, 1); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid2)) { state.setGridLayout(2, 1); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid3)) { state.setGridLayout(3, 1); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid4)) { state.setGridLayout(2, 2); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid6)) { state.setGridLayout(3, 2); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid9)) { state.setGridLayout(3, 3); preventDefault = true; }
                else if (isMatch(keyboardBindings.grid12)) { state.setGridLayout(4, 3); preventDefault = true; }
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);
};
