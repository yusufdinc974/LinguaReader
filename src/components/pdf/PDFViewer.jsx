import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../../contexts/PDFContext';
import { renderPageToCanvas } from '../../services/pdfService';
import usePDFNavigation from '../../hooks/usePDFNavigation';

/**
 * PDF Viewer Component
 * Renders the current page of a PDF document
 */
const PDFViewer = () => {
  const { 
    pdfDocument, 
    currentPage, 
    scale,
    isLoading,
    error
  } = useContext(PDFContext);
  
  const navigation = usePDFNavigation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pageRendering, setPageRendering] = useState(false);
  const [wordSelection, setWordSelection] = useState(null);
  const renderingRef = useRef(false);
  const pdfDocRef = useRef(null);
  const [forceRender, setForceRender] = useState(0);

  // Track PDF document changes to force re-renders
  useEffect(() => {
    if (pdfDocument && pdfDocument !== pdfDocRef.current) {
      pdfDocRef.current = pdfDocument;
      // Force multiple render attempts to ensure the first page renders
      setForceRender(prev => prev + 1);
      
      // Set up a sequence of render attempts with increasing delays
      const delays = [100, 300, 600];
      delays.forEach(delay => {
        setTimeout(() => {
          setForceRender(prev => prev + 1);
        }, delay);
      });
    }
  }, [pdfDocument]);

  // Primary render effect triggered by page or scale changes
  // Also responds to forceRender
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) return;
      
      // Skip if rendering is already in progress
      if (renderingRef.current) return;
      
      renderingRef.current = true;
      setPageRendering(true);
      
      try {
        console.log(`Rendering page ${currentPage} (Scale: ${scale})`);
        
        // Set initial canvas dimensions to ensure it's visible during loading
        if (!canvasRef.current.width || !canvasRef.current.height) {
          canvasRef.current.width = 800;
          canvasRef.current.height = 1000;
        }
        
        // Render the page
        await renderPageToCanvas(
          pdfDocument,
          currentPage,
          canvasRef.current,
          scale
        );
      } catch (error) {
        console.error('Error rendering page:', error);
      } finally {
        setPageRendering(false);
        renderingRef.current = false;
      }
    };

    renderPage();
    
    // Cleanup function to prevent updates on unmounted component
    return () => {
      renderingRef.current = false;
    };
  }, [pdfDocument, currentPage, scale, forceRender]);

  // Handle text selection/clicking
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !pdfDocument) return;
    
    // Get click coordinates relative to the canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Here we would normally determine which word was clicked
    // For Phase 2, we'll just simulate selecting a word with a placeholder
    
    // Simulated word selection (this would be replaced with actual word detection)
    setWordSelection({
      word: "example",
      x: x,
      y: y
    });
    
    console.log(`Canvas clicked at (${x}, ${y})`);
  };

  // Clear word selection when clicking away
  const handleContainerClick = (e) => {
    if (e.target !== canvasRef.current) {
      setWordSelection(null);
    }
  };

  // Manual re-render trigger
  const triggerManualRender = () => {
    if (pdfDocument && !pageRendering) {
      setForceRender(prev => prev + 1);
    }
  };

  // Double-click on canvas to force re-render (helpful for debugging)
  const handleCanvasDoubleClick = () => {
    triggerManualRender();
  };

  return (
    <motion.div 
      className="pdf-viewer-container"
      ref={containerRef}
      onClick={handleContainerClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {isLoading ? (
        <motion.div
          className="loading-indicator"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '4px solid rgba(74, 105, 189, 0.3)',
            borderTopColor: '#4a69bd',
            margin: '40px auto',
          }}
        />
      ) : error ? (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            padding: '16px 24px',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '20px auto',
            textAlign: 'center'
          }}
        >
          <h3 style={{ margin: '0 0 10px', color: '#c0392b' }}>
            Error Loading PDF
          </h3>
          <p style={{ margin: 0 }}>{error}</p>
        </motion.div>
      ) : !pdfDocument ? (
        <motion.div
          className="no-pdf-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            color: '#7f8c8d',
            maxWidth: '600px'
          }}
        >
          <h3 style={{ margin: '0 0 10px' }}>No PDF Document Loaded</h3>
          <p style={{ margin: 0 }}>
            Upload a PDF using the button above to get started
          </p>
        </motion.div>
      ) : (
        <React.Fragment>
          {/* Page canvas container with proper scrolling */}
          <motion.div
            className="canvas-container"
            style={{
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              margin: '10px',
              padding: '0',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 200px)',
              maxWidth: '100%',
              opacity: pageRendering ? 0.7 : 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}
          >
            {/* Canvas element that will be rendered to */}
            <canvas 
              ref={canvasRef} 
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDoubleClick}
              style={{ 
                display: 'block',
                // Let the canvas size itself based on content
                // PDF.js will set the right dimensions
              }}
            />

            {/* Word selection indicator */}
            <AnimatePresence>
              {wordSelection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  style={{
                    position: 'absolute',
                    left: `${wordSelection.x}px`,
                    top: `${wordSelection.y}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(74, 105, 189, 0.2)',
                    border: '2px solid #4a69bd',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Page navigation info */}
          <motion.div
            className="page-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '10px 0',
              color: '#555',
              fontSize: '0.9rem',
              gap: '10px'
            }}
          >
            <span>Page {currentPage} of {navigation.totalPages}</span>
            <span>•</span>
            <span>Zoom: {Math.round(scale * 100)}%</span>
          </motion.div>
        </React.Fragment>
      )}
    </motion.div>
  );
};

export default PDFViewer;