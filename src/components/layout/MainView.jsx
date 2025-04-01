import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../../contexts/PDFContext';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import PDFUpload from '../pdf/PDFUpload';
import TitleBar from './TitleBar';

/**
 * MainView Component
 * Main application layout with header, sidebar, and content area
 */
const MainView = ({ children }) => {
  const { pdfDocument, loadPDF } = useContext(PDFContext);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFramelessWindow, setIsFramelessWindow] = useState(false);

  // Check if we're running in Electron with a frameless window
  useEffect(() => {
    // If we have the electron API, we're in Electron
    if (window.electron) {
      setIsFramelessWindow(true);
      // Add frameless-window class to body for CSS adjustments
      document.body.classList.add('frameless-window');
    }
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Handle new PDF upload
  const handleNewPdfClick = async () => {
    if (window.electron) {
      try {
        const result = await window.electron.selectPdf();
        if (!result.canceled && !result.error) {
          await loadPDF(result.path);
          // Optionally, redirect to vocabulary mode after loading
          // if (onNavigate) {
          //   onNavigate('vocabulary-mode');
          // }
        }
      } catch (error) {
        console.error('Error selecting PDF:', error);
      }
    }
  };

  return (
    <>
      {isFramelessWindow && <TitleBar />}
      <div className="app-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFramelessWindow ? 'calc(100vh - 32px)' : '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--background)'
      }}>
        {/* Application Header */}
        <AppHeader 
          showSidebar={showSidebar} 
          toggleSidebar={toggleSidebar} 
          handleNewPdfClick={handleNewPdfClick}
        />

        {/* Main Content with Sidebar */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar for PDF Library */}
          <AnimatePresence>
            {showSidebar && (
              <Sidebar />
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <main style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '20px',
            position: 'relative'
          }}>
            {children ? children : (
              !pdfDocument ? <PDFUpload onPdfSelected={loadPDF} /> : null
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default MainView;