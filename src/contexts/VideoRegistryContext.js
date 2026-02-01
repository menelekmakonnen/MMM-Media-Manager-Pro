import { createContext, useContext } from 'react';

export const VideoRegistryContext = createContext({
    videos: {},
    register: (video, slotIndex) => { },
    unregister: (slotIndex) => { }
});

export const useVideoRegistry = () => useContext(VideoRegistryContext);
