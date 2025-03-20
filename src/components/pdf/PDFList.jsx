import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../../contexts/PDFContext';
import { getPDFList, removePDFFromList } from '../../services/storageService';

/**
 * PDF List Component
 * Displays a list of uploaded PDFs with options to load or delete them
 */
const PDFList = () => {
  const { loadPDF, pdfMetadata, isLoading, pdfListUpdated } = useContext(PDFContext);
  const [pdfList, setPdfList] = useState([]);
  const [expandedInfo, setExpandedInfo] = useState(null);

  // Load the PDF list on mount and when updated
  useEffect(() => {
    setPdfList(getPDFList());
  }, [pdfListUpdated]); // Re-fetch when the update flag changes

  // Handle loading a PDF from the list
  const handleLoadPDF = async (pdfInfo) => {
    if (isLoading) return;
    try {
      await loadPDF(pdfInfo.path);
    } catch (error) {
      console.error('Error loading PDF from list:', error);
    }
  };

  // Handle removing a PDF from the list
  const handleRemovePDF = (e, pdfId) => {
    e.stopPropagation(); // Prevent clicking through to the load PDF handler
    const updatedList = removePDFFromList(pdfId);
    setPdfList(updatedList);
  };

  // Toggle expanded PDF info
  const toggleExpandInfo = (e, pdfId) => {
    e.stopPropagation(); // Prevent clicking through to the load PDF handler
    setExpandedInfo(expandedInfo === pdfId ? null : pdfId);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Unknown date';
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Animation variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="pdf-list-container">
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          margin: '20px 0 10px',
          color: '#333',
          fontSize: '1.2rem'
        }}
      >
        Recent PDFs
      </motion.h3>
      
      {pdfList.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            color: '#666',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: '8px',
            fontStyle: 'italic'
          }}
        >
          No PDFs have been uploaded yet
        </motion.p>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="show"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}
        >
          <AnimatePresence>
            {pdfList.map((pdf) => (
              <motion.li
                key={pdf.id}
                variants={itemVariants}
                exit={{ opacity: 0, x: -100 }}
                onClick={() => handleLoadPDF(pdf)}
                style={{
                  padding: '12px 16px',
                  margin: '8px 0',
                  backgroundColor: pdfMetadata?.id === pdf.id 
                    ? 'rgba(74, 105, 189, 0.1)' 
                    : 'rgba(255, 255, 255, 1)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  border: pdfMetadata?.id === pdf.id 
                    ? '1px solid rgba(74, 105, 189, 0.3)' 
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease'
                }}
                whileHover={{
                  backgroundColor: pdfMetadata?.id === pdf.id 
                    ? 'rgba(74, 105, 189, 0.15)' 
                    : 'rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 5px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#333',
                      wordBreak: 'break-word'
                    }}>
                      {pdf.fileName || 'Untitled PDF'}
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: '#666'
                    }}>
                      Last opened: {formatDate(pdf.lastOpened)}
                    </p>
                  </div>
                  
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'row'
                  }}>
                    <motion.button
                      onClick={(e) => toggleExpandInfo(e, pdf.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '4px',
                        marginRight: '8px'
                      }}
                      aria-label="Toggle Info"
                    >
                      {expandedInfo === pdf.id ? '▲' : '▼'}
                    </motion.button>
                    
                    <motion.button
                      onClick={(e) => handleRemovePDF(e, pdf.id)}
                      whileHover={{ scale: 1.1, color: '#e74c3c' }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '4px'
                      }}
                      aria-label="Remove PDF"
                    >
                      ×
                    </motion.button>
                  </div>
                </div>
                
                {/* Expanded info section */}
                <AnimatePresence>
                  {expandedInfo === pdf.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        overflow: 'hidden',
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'auto 1fr', 
                        gap: '4px 10px',
                        color: '#666'
                      }}>
                        <span>File Size:</span>
                        <span>{formatFileSize(pdf.size)}</span>
                        
                        <span>Date Added:</span>
                        <span>{formatDate(pdf.dateAdded)}</span>
                        
                        <span>Pages:</span>
                        <span>{pdf.pageCount || 'Unknown'}</span>
                        
                        {pdf.title && (
                          <>
                            <span>Title:</span>
                            <span>{pdf.title}</span>
                          </>
                        )}
                        
                        {pdf.author && (
                          <>
                            <span>Author:</span>
                            <span>{pdf.author}</span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
};

export default PDFList;