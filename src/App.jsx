import React, { useState } from 'react';
import './assets/styles/global.css';
import { PDFProvider } from './contexts/PDFContext';
import MainView from './components/layout/MainView';
import Home from './pages/Home';
import Reader from './pages/Reader';
import VocabularyManager from './pages/VocabularyManager';
import VocabularyMode from './pages/VocabularyMode';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Main application component
 */
function App() {
  // Simple routing - in Phase 3 we're using a simple approach instead of react-router
  const [currentPage, setCurrentPage] = useState('home');
  const [hoveredTab, setHoveredTab] = useState(null);

  // Navigation tabs configuration
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'reader', label: 'PDF Reader', icon: '📄' },
    { id: 'vocabulary-mode', label: 'Vocabulary Mode', icon: '📚' },
    { id: 'vocabulary', label: 'Word List', icon: '📋' },
  ];

  // Render the appropriate page based on current route
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'reader':
        return <Reader onNavigate={setCurrentPage} />;
      case 'vocabulary-mode':
        return <VocabularyMode onNavigate={setCurrentPage} />;
      case 'vocabulary':
        return <VocabularyManager onNavigate={setCurrentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
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
        {/* Header with navigation tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '0 var(--space-md)',
          position: 'relative',
          zIndex: 5
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '0 var(--space-lg)'
          }}>
            <motion.div
              whileHover={{ rotate: 5 }}
              style={{
                fontSize: '1.5rem',
                marginRight: '0.75rem',
              }}
            >
              📖
            </motion.div>
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              LinguaReader
            </h1>
          </div>

          <div style={{ display: 'flex', flex: 1 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentPage(tab.id)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  backgroundColor: hoveredTab === tab.id ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                  border: 'none',
                  borderBottom: currentPage === tab.id 
                    ? '3px solid var(--primary-color)' 
                    : '3px solid transparent',
                  color: currentPage === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: currentPage === tab.id ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                
                {/* Active tab indicator with animation */}
                {currentPage === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: 'var(--primary-color)',
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            padding: '0 var(--space-md)'
          }}>
            <motion.button
              whileHover={{ rotate: 15 }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-circle)',
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '1.25rem',
              }}
            >
              ⚙️
            </motion.button>
          </div>
        </div>

        {/* Main content area with page transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.3 }}
            style={{ 
              flex: 1, 
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>
    </PDFProvider>
  );
}

export default App;