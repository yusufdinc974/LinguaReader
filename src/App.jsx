import React, { useState } from 'react';
import './assets/styles/global.css';
import { PDFProvider } from './contexts/PDFContext';
import { VocabularyProvider } from './contexts/VocabularyContext';
import { QuizProvider } from './contexts/QuizContext'; // Import QuizProvider
import MainView from './components/layout/MainView';
import Home from './pages/Home';
import VocabularyManager from './pages/VocabularyManager';
import VocabularyMode from './pages/VocabularyMode';
import Quiz from './pages/Quiz'; // Import Quiz page
import QuizStats from './pages/QuizStats'; // Import QuizStats page
import UpdateChecker from './components/common/UpdateChecker'; // Import UpdateChecker
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Main application component
 */
function App() {
  // Simple routing - in Phase 3 we're using a simple approach instead of react-router
  const [currentPage, setCurrentPage] = useState('home');
  const [hoveredTab, setHoveredTab] = useState(null);
  // State for settings dropdown
  const [showSettings, setShowSettings] = useState(false);

  // Navigation tabs configuration - Added Quiz and Stats tabs
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'vocabulary-mode', label: 'PDF Reader', icon: '📄' },
    { id: 'vocabulary', label: 'Word List', icon: '📋' },
    { id: 'quiz', label: 'Quiz', icon: '🎯' },
    { id: 'quiz-stats', label: 'Stats', icon: '📊' },
  ];

  // Handle navigation with redirection for old 'reader' route
  const handleNavigation = (page) => {
    // If navigating to 'reader', redirect to 'vocabulary-mode'
    if (page === 'reader') {
      setCurrentPage('vocabulary-mode');
    } else {
      setCurrentPage(page);
    }
    
    // Close settings dropdown when navigating
    setShowSettings(false);
  };

  // Render the appropriate page based on current route
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handleNavigation} />;
      case 'vocabulary-mode':
        return <VocabularyMode onNavigate={handleNavigation} />;
      case 'vocabulary':
        return <VocabularyManager onNavigate={handleNavigation} />;
      case 'quiz':
        return <Quiz onNavigate={handleNavigation} />;
      case 'quiz-stats':
        return <QuizStats onNavigate={handleNavigation} />;
      default:
        return <Home onNavigate={handleNavigation} />;
    }
  };

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
  };

  // Settings dropdown animation variants
  const settingsVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  return (
    <PDFProvider>
      <VocabularyProvider>
        <QuizProvider>
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
                    onClick={() => handleNavigation(tab.id)}
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
                padding: '0 var(--space-md)',
                position: 'relative' // Added for dropdown positioning
              }}>
                <motion.button
                  whileHover={{ rotate: 15 }}
                  onClick={() => setShowSettings(!showSettings)}
                  style={{
                    backgroundColor: showSettings ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
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

                {/* Settings dropdown with UpdateChecker */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={settingsVariants}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        width: '320px',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border)',
                        zIndex: 10,
                        padding: 'var(--space-md)',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-md)',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: 'var(--space-sm)'
                      }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '1rem',
                          color: 'var(--text-primary)'
                        }}>
                          Settings
                        </h3>
                        <button
                          onClick={() => setShowSettings(false)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* UpdateChecker component */}
                      <div style={{ marginBottom: 'var(--space-md)' }}>
                        <h4 style={{ 
                          fontSize: '0.9rem', 
                          marginTop: 0,
                          marginBottom: 'var(--space-sm)',
                          color: 'var(--text-secondary)'
                        }}>
                          Application Updates
                        </h4>
                        <UpdateChecker />
                      </div>
                      
                      {/* You can add more settings sections here */}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Background overlay when settings dropdown is open */}
            {showSettings && (
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1
                }}
                onClick={() => setShowSettings(false)}
              />
            )}

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
        </QuizProvider>
      </VocabularyProvider>
    </PDFProvider>
  );
}

export default App;