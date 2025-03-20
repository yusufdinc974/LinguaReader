import React, { useContext, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import PDFContext from '../../contexts/PDFContext';

/**
 * Component for uploading PDF files
 * Supports drag and drop as well as file selection dialog
 */
const PDFUpload = () => {
  const { loadPDF, isLoading } = useContext(PDFContext);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  // Handle PDF file selection via dialog
  const handleSelectFile = async () => {
    setUploadError(null);
    
    if (window.electron) {
      try {
        const result = await window.electron.selectPdf();
        if (!result.canceled && !result.error) {
          await loadPDF(result.path);
        }
      } catch (error) {
        console.error('Error selecting PDF:', error);
        setUploadError('Failed to select PDF. Please try again.');
      }
    } else {
      // Fallback for web environment or when Electron API is unavailable
      fileInputRef.current.click();
    }
  };

  // Handle file input change (Web mode)
  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      try {
        // For web version, we use file URLs
        const fileUrl = URL.createObjectURL(file);
        await loadPDF(fileUrl);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setUploadError('Failed to load PDF. Please try again.');
      }
    } else if (file) {
      setUploadError('Please select a valid PDF file.');
    }
    
    // Reset the input to allow selecting the same file again
    e.target.value = null;
  };

  // Handle drop event
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);
    
    // Get the dropped files
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Check if the file is a PDF
      if (file.type === 'application/pdf') {
        try {
          // For Electron, we need the file path
          if (window.electron) {
            // Note: This is a simplification. Electron would typically handle
            // this differently using its own APIs for file paths
            const filePath = file.path;
            if (filePath) {
              await loadPDF(filePath);
            } else {
              setUploadError('Could not determine file path. Please use the file selector instead.');
            }
          } else {
            // For web version, we use file URLs
            const fileUrl = URL.createObjectURL(file);
            await loadPDF(fileUrl);
          }
        } catch (error) {
          console.error('Error loading dropped PDF:', error);
          setUploadError('Failed to load the dropped PDF. Please try again.');
        }
      } else {
        setUploadError('Please drop a valid PDF file.');
      }
    }
  };

  // Animation variants
  const containerVariants = {
    normal: { 
      borderColor: 'rgba(74, 105, 189, 0.3)',
      backgroundColor: 'rgba(74, 105, 189, 0.05)',
    },
    dragging: { 
      borderColor: 'rgba(74, 105, 189, 0.8)',
      backgroundColor: 'rgba(74, 105, 189, 0.1)',
      scale: 1.02
    },
    loading: {
      opacity: 0.7
    }
  };

  return (
    <div className="pdf-upload-container">
      <motion.div 
        className="drop-zone"
        initial="normal"
        animate={isLoading ? "loading" : isDragging ? "dragging" : "normal"}
        variants={containerVariants}
        transition={{ duration: 0.3 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: '2px dashed rgba(74, 105, 189, 0.3)',
          borderRadius: '8px',
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          textAlign: 'center',
          margin: '20px 0',
        }}
        onClick={handleSelectFile}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ fontSize: '48px', color: '#4a69bd', marginBottom: '16px' }}>
            {/* Icon would go here - simplified for now */}
            📄
          </div>
          <h3 style={{ margin: '0 0 10px', color: '#333' }}>
            {isLoading ? 'Loading PDF...' : 'Upload PDF File'}
          </h3>
          <p style={{ margin: '0 0 20px', color: '#666' }}>
            Drag & drop a PDF file here, or click to select
          </p>
          
          {uploadError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ 
                color: '#e74c3c', 
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginTop: '10px'
              }}
            >
              {uploadError}
            </motion.p>
          )}
          
          {isLoading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '3px solid rgba(74, 105, 189, 0.3)',
                borderTopColor: '#4a69bd',
                margin: '20px auto 0',
              }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Hidden file input (fallback for web environments) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PDFUpload;