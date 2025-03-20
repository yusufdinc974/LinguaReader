import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFUpload from './components/pdf/PDFUpload';
import PDFViewer from './components/pdf/PDFViewer';
import PDFControls from './components/pdf/PDFControls';
import PDFList from './components/pdf/PDFList';
import { PDFProvider } from './contexts/PDFContext';
import PDFContext from './contexts/PDFContext';

/**
 * Main application layout component that wraps content with the PDFProvider
 */
function AppLayout({ children }) {
  return (
    <PDFProvider>
      {children}
    </PDFProvider>
  );
}

/**
 * Main application content component
 */
function AppContent() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { pdfDocument, loadPDF } = useContext(PDFContext);

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
      backgroundColor: '#f5f7fa'
    }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '12px 20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}
      >
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.4rem', 
          fontWeight: 600,
          color: '#333'
        }}>
          PDF Vocabulary Reader
        </h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {pdfDocument && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNewPdfClick}
              style={{
                backgroundColor: '#4a69bd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              New PDF
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            style={{
              backgroundColor: showSidebar ? 'rgba(74, 105, 189, 0.2)' : '#4a69bd',
              color: showSidebar ? '#4a69bd' : 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {showSidebar ? 'Hide Library' : 'Show Library'}
          </motion.button>
        </div>
      </motion.header>

      {/* Main content area */}
      <div className="main-content" style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* PDF Viewer */}
        <motion.main
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
          animate={{
            width: showSidebar ? 'calc(100% - 300px)' : '100%'
          }}
          transition={{ duration: 0.3 }}
        >
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
        </motion.main>

        {/* Sidebar with PDF Library */}
        <motion.aside
          initial={{ x: 300 }}
          animate={{
            x: showSidebar ? 0 : 300,
            width: 300
          }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundColor: 'white',
            borderLeft: '1px solid #eee',
            height: '100%',
            overflow: 'auto',
            padding: '20px',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.05)',
            position: 'relative',
            zIndex: 1
          }}
        >
          <PDFList />
        </motion.aside>
      </div>
    </div>
  );
}

/**
 * Main App component
 */
function App() {
  return (
    <AppLayout>
      <AppContent />
    </AppLayout>
  );
}

export default App;