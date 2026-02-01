import React from 'react';
import MainLayout from './components/Layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  console.log('App Component Rendering...');
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen text-[var(--text-primary)] overflow-hidden bg-black selection:bg-[var(--accent-primary)] selection:text-white">
        <MainLayout />
      </div>
    </ErrorBoundary>
  );
}

export default App;
