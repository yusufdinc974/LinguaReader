import React, { useState, useEffect } from 'react';
import './assets/styles/global.css';
import { PDFProvider } from './contexts/PDFContext';
import { VocabularyProvider } from './contexts/VocabularyContext';
import { QuizProvider } from './contexts/QuizContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/common/ThemeToggle';
import MainView from './components/layout/MainView';
import Home from './pages/Home';
import VocabularyManager from './pages/VocabularyManager';
import VocabularyMode from './pages/VocabularyMode';
import Quiz from './pages/Quiz'; // Import Quiz page
import QuizStats from './pages/QuizStats'; // Import QuizStats page
import UpdateChecker from './components/common/UpdateChecker'; // Import UpdateChecker
import WindowControls from './components/common/WindowControls'; // Import WindowControls
import TitleBar from './components/layout/TitleBar'; // Import TitleBar
import { motion, AnimatePresence } from 'framer-motion';
import './assets/styles/cjk-styles.css';

/**
 * Helper function to get initial page
 */
const getInitialPage = () => {
  // Default to home page
  return 'home';
};

/**
 * Main application component
 */
const App = () => {
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [hoveredTab, setHoveredTab] = useState(null);
  // State for settings dropdown
  const [showSettings, setShowSettings] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Check if running in Electron
  useEffect(() => {
    if (window.electron) {
      console.log('Running in Electron mode');
      setIsElectron(true);
      // Add classes for electron app styling
      document.body.classList.add('electron-app');
    } else {
      console.log('Running in browser mode');
    }
  }, []);

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
    <ThemeProvider>
      <PDFProvider>
        <VocabularyProvider>
          <QuizProvider>
            <div className="app-container" style={{
              display: 'flex',
              flexDirection: 'column',
              height: isElectron ? 'calc(100vh - 32px)' : '100vh', // Adjust for TitleBar height
              overflow: 'hidden',
              backgroundColor: 'var(--background)'
            }}>
              {/* Add TitleBar when in Electron mode */}
              {isElectron && <TitleBar />}

              {/* Header with navigation tabs and window controls */}
              <div 
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '0 var(--space-md)',
                  position: 'relative',
                  zIndex: 5,
                  WebkitAppRegion: isElectron ? 'drag' : 'none' // Make draggable in Electron
                }}
                className="app-header"
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '0 var(--space-lg)',
                  WebkitAppRegion: 'drag' // Ensure this area is draggable
                }}>
                  <motion.img
                    whileHover={{ rotate: 5 }}
                    src="assets/icon.png"
                    alt="LinguaReader"
                    style={{
                      width: '28px',
                      height: '28px',
                      marginRight: '0.75rem',
                    }}
                  />
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

                <div 
                  style={{ 
                    display: 'flex', 
                    flex: 1,
                    WebkitAppRegion: 'no-drag' // Make buttons clickable
                  }}
                >
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
                  position: 'relative',
                  gap: 'var(--space-sm)',
                  WebkitAppRegion: 'no-drag' // Make buttons clickable
                }}>
                  {/* Theme Toggle Button */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ThemeToggle />
                  </motion.div>

                  {/* Settings Button */}
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

                        {/* Theme Toggle */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 'var(--space-sm)',
                          marginBottom: 'var(--space-md)',
                          borderBottom: '1px solid var(--border)',
                          paddingBottom: 'var(--space-md)'
                        }}>
                          <span style={{
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                          }}>
                            Dark Mode
                          </span>
                          <ThemeToggle />
                        </div>
                        
                        {/* Update Checker */}
                        <UpdateChecker />
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
    </ThemeProvider>
  );
}

export default App;