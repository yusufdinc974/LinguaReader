import React, { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PDFUpload from '../components/pdf/PDFUpload';
import PDFViewer from '../components/pdf/PDFViewer';
import PDFControls from '../components/pdf/PDFControls';
import Button from '../components/common/Button';
import { getPDFList } from '../services/storageService';

/**
 * Reader Page Component
 * Main PDF reading interface
 */
const Reader = ({ onNavigate }) => {
  const { pdfDocument, pdfMetadata, loadPDF } = useContext(PDFContext);
  const [showLibrary, setShowLibrary] = useState(false);
  const recentPDFs = getPDFList();

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

  // Handle loading a PDF from the library
  const handleLoadPdf = async (pdfPath) => {
    try {
      await loadPDF(pdfPath);
      setShowLibrary(false); // Close the library after selecting a PDF
    } catch (error) {
      console.error('Error loading PDF from library:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
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
        position: 'relative',
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
            padding: 'var(--space-md) var(--space-lg)',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 'var(--space-md)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(74, 105, 189, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              color: 'var(--primary-color)',
            }}>
              📄
            </div>
            <div>
              <h2 style={{ 
                margin: 0,
                fontSize: 'var(--font-size-lg)',
                color: 'var(--text-primary)',
                maxWidth: '500px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
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
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button 
              size="sm" 
              variant={showLibrary ? 'outline' : 'primary'}
              onClick={() => setShowLibrary(!showLibrary)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)', 
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📚</span>
              <span>{showLibrary ? 'Hide Library' : 'Show Library'}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleNewPdfClick}>
              New PDF
            </Button>
            <Button size="sm" variant="text">
              Add Note
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main content with optional library sidebar */}
      <div 
        style={{ 
          display: 'flex',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* PDF content area */}
        <motion.div 
          animate={{ 
            width: showLibrary && pdfDocument ? 'calc(100% - 300px)' : '100%',
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: pdfDocument ? 'calc(100% - 80px)' : '100%',
            overflow: 'hidden',
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
        
        {/* Library sidebar */}
        <AnimatePresence>
          {showLibrary && pdfDocument && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                width: '300px',
                backgroundColor: 'var(--surface)',
                height: '100%',
                boxShadow: 'var(--shadow-md)',
                borderLeft: '1px solid var(--border)',
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--space-md)',
                overflow: 'hidden',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-md)',
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--primary-color)',
                }}>
                  PDF Library
                </h3>
                <button
                  onClick={() => setShowLibrary(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-xs)',
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-xs)',
              }}>
                {recentPDFs.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-sm)',
                  }}>
                    {recentPDFs.map((pdf) => (
                      <motion.div
                        key={pdf.id}
                        whileHover={{ y: -2, backgroundColor: 'rgba(74, 105, 189, 0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleLoadPdf(pdf.path)}
                        style={{
                          padding: 'var(--space-sm)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          backgroundColor: pdfMetadata?.id === pdf.id 
                            ? 'rgba(74, 105, 189, 0.1)' 
                            : 'transparent',
                          border: '1px solid',
                          borderColor: pdfMetadata?.id === pdf.id 
                            ? 'rgba(74, 105, 189, 0.3)' 
                            : 'transparent',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-sm)',
                        }}>
                          <div style={{
                            fontSize: '1.25rem',
                            color: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            📄
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{
                              fontSize: 'var(--font-size-md)',
                              fontWeight: pdfMetadata?.id === pdf.id 
                                ? 'var(--font-weight-medium)' 
                                : 'var(--font-weight-normal)',
                              color: pdfMetadata?.id === pdf.id 
                                ? 'var(--primary-color)' 
                                : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {pdf.fileName || 'Untitled PDF'}
                            </div>
                            <div style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}>
                              <span>{formatDate(pdf.lastOpened)}</span>
                              <span>{pdf.pageCount || '?'} pages</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: 'var(--space-lg)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    No PDFs in library yet
                  </div>
                )}
              </div>
              
              <div style={{
                marginTop: 'var(--space-md)',
                display: 'flex',
                justifyContent: 'center',
              }}>
                <Button 
                  onClick={handleNewPdfClick} 
                  size="sm"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-xs)',
                  }}
                >
                  <span>📄</span>
                  <span>Upload New PDF</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Reader;