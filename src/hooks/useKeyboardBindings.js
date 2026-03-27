import { useEffect } from 'react';
import useMediaStore from '../stores/useMediaStore';

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
                    return e.key === combo && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
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
                        e.key === keyChar
                    );
                }
                return false;
            };

            // Hardcoded System Overrides (F, M, Esc)
            if (e.key === 'Escape') {
                if (state.appViewMode === 'slideshow') {
                    state.setAppViewMode('standard');
                    return;
                }
                if (state.fullscreenMode) state.toggleFullscreen();
                if (state.movieMode) state.toggleMovieMode();
                return;
            }
            if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey) {
                state.toggleFullscreen();
                return;
            }
            if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey) {
                state.toggleMovieMode();
                return;
            }

            // Prevent default browser behavior ONLY if we matched a binding, OR for spacebar in media viewing
            let preventDefault = false;

            // Playback Actions (Active in Standard and Slideshow)
            if (['standard', 'slideshow'].includes(appViewMode) && isMatch(keyboardBindings.playPause)) {
                state.toggleGlobalPlay();
                preventDefault = true;
            }

            // Global Navigation Actions
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

            // Volume Control (Standard & Slideshow)
            if (['standard', 'slideshow'].includes(appViewMode)) {
                if (isMatch(keyboardBindings.volumeUp)) {
                    state.setMasterVolume(Math.min(1, state.masterVolume + 0.05));
                    state.setIsMasterMuted(false);
                    preventDefault = true;
                } else if (isMatch(keyboardBindings.volumeDown)) {
                    state.setMasterVolume(Math.max(0, state.masterVolume - 0.05));
                    if (state.masterVolume - 0.05 <= 0) state.setIsMasterMuted(true);
                    preventDefault = true;
                }
            }

            // Scroll overriding only applies if explicitly mapped, BUT Gallery View should naturally scroll if its ArrowUp/Down
            if (appViewMode === 'gallery') {
               // We let the browser handle ArrowUp/Down natively unless the user bound it differently and we want to prevent it.
               // The request: "On the Gallery Page, the top and down arrow is for scrolling up or down." -> Natural scrolling.
               if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                   preventDefault = false; 
               }
            }

            // Grid Assignments (Numpads)
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
