import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../../contexts/PDFContext';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import PDFUpload from '../pdf/PDFUpload';
import PDFViewer from '../pdf/PDFViewer';
import PDFControls from '../pdf/PDFControls';

/**
 * MainView Component
 * Main application layout with header, sidebar, and content area
 */
const MainView = ({ children }) => {
  const { pdfDocument, loadPDF } = useContext(PDFContext);
  const [showSidebar, setShowSidebar] = useState(false);

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
        }
      } catch (error) {
        console.error('Error selecting PDF:', error);
      }
    }
  };

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--background)'
    }}>
      {/* Application Header */}
      <AppHeader 
        showSidebar={showSidebar} 
        toggleSidebar={toggleSidebar} 
        handleNewPdfClick={handleNewPdfClick}
      />

      {/* Main content area with sidebar */}
      <div className="main-content" style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Main content */}
        <motion.main
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-md)',
            paddingTop: 0
          }}
          animate={{
            width: showSidebar ? 'calc(100% - 320px)' : '100%'
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {children ? (
            // Render children if provided
            children
          ) : (
            // Default PDF viewer content
            <>
              <AnimatePresence>
                {!pdfDocument && (
                  <motion.div
                    key="pdf-upload"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <PDFUpload />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <PDFViewer />
              {pdfDocument && <PDFControls />}
            </>
          )}
        </motion.main>

        {/* Sidebar */}
        <Sidebar isVisible={showSidebar} />
      </div>
    </div>
  );
};

export default MainView;