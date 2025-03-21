import React, { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PDFUpload from '../components/pdf/PDFUpload';
import PDFViewer from '../components/pdf/PDFViewer';
import PDFControls from '../components/pdf/PDFControls';
import Button from '../components/common/Button';

/**
 * Reader Page Component
 * Main PDF reading interface
 */
const Reader = () => {
  const { pdfDocument, pdfMetadata, loadPDF } = useContext(PDFContext);

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

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    enter: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    initial: { y: 10, opacity: 0 },
    enter: { y: 0, opacity: 1 },
    exit: { y: -10, opacity: 0 }
  };

  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* PDF metadata header when a PDF is loaded */}
      {pdfDocument && pdfMetadata && (
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-md)',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <div>
            <h2 style={{ 
              margin: 0,
              fontSize: 'var(--font-size-lg)',
              color: 'var(--text-primary)',
            }}>
              {pdfMetadata.title || pdfMetadata.fileName || 'Untitled Document'}
            </h2>
            <p style={{ 
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}>
              {pdfMetadata.author ? `By ${pdfMetadata.author} • ` : ''}
              {pdfMetadata.pageCount} pages
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button size="sm" variant="outline" onClick={handleNewPdfClick}>
              Change Document
            </Button>
            <Button size="sm" variant="text">
              Add Note
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main content area */}
      <motion.div 
        variants={itemVariants}
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: pdfDocument ? 'calc(100% - 80px)' : '100%'
        }}
      >
        <AnimatePresence>
          {!pdfDocument && (
            <motion.div
              key="pdf-upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PDFUpload />
            </motion.div>
          )}
        </AnimatePresence>
        
        <PDFViewer />
        
        {pdfDocument && <PDFControls />}
      </motion.div>
    </motion.div>
  );
};

export default Reader;