import React, { useState } from 'react';
import './assets/styles/global.css';
import { PDFProvider } from './contexts/PDFContext';
import MainView from './components/layout/MainView';
import Home from './pages/Home';
import Reader from './pages/Reader';
import VocabularyManager from './pages/VocabularyManager';

/**
 * Main application component
 */
function App() {
  // Simple routing - in Phase 3 we're using a simple approach instead of react-router
  const [currentPage, setCurrentPage] = useState('home');

  // Render the appropriate page based on current route
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'reader':
        return <Reader />;
      case 'vocabulary':
        return <VocabularyManager />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <PDFProvider>
      <div className="app-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--background)'
      }}>
        {/* Navigation tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 var(--space-md)',
        }}>
          <button
            onClick={() => setCurrentPage('home')}
            style={{
              padding: 'var(--space-md)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: currentPage === 'home' 
                ? '2px solid var(--primary-color)' 
                : '2px solid transparent',
              color: currentPage === 'home' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: currentPage === 'home' ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentPage('reader')}
            style={{
              padding: 'var(--space-md)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: currentPage === 'reader' 
                ? '2px solid var(--primary-color)' 
                : '2px solid transparent',
              color: currentPage === 'reader' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: currentPage === 'reader' ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            PDF Reader
          </button>
          <button
            onClick={() => setCurrentPage('vocabulary')}
            style={{
              padding: 'var(--space-md)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: currentPage === 'vocabulary' 
                ? '2px solid var(--primary-color)' 
                : '2px solid transparent',
              color: currentPage === 'vocabulary' ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: currentPage === 'vocabulary' ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Vocabulary
          </button>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderPage()}
        </div>
      </div>
    </PDFProvider>
  );
}

// Alternative implementation using MainView component
function AppWithMainView() {
  return (
    <PDFProvider>
      <MainView />
    </PDFProvider>
  );
}

// Export the version you want to use
// For Phase 3, we'll use the simple version with tabs
export default App;