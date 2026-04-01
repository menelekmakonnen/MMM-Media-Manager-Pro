import React from 'react';
import MainLayout from './components/Layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import SpaceBackground from './components/SpaceBackground';
import { useExternalFileHandler } from './hooks/useExternalFileHandler';

function App() {
  console.log('App Component Rendering...');

  // Handle files opened via Windows "Open with" context menu
  useExternalFileHandler();

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen text-[var(--text-primary)] overflow-hidden bg-transparent selection:bg-[var(--accent-primary)] selection:text-white">
        <SpaceBackground />
        <MainLayout />
      </div>
    </ErrorBoundary>
  );
}

export default App;
