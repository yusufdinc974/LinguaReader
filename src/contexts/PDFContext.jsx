import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  loadPDFDocument, 
  getPDFMetadata,
  extractAllText
} from '../services/pdfService';
import { 
  addPDFToList, 
  updatePDFLastOpened 
} from '../services/storageService';

// Create the context
export const PDFContext = createContext();

// Constants for zoom
const MIN_SCALE = 0.25;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE = 1.0; // Back to 100%
const SCALE_STEP = 0.3;    

/**
 * PDF Context Provider Component
 * Manages the state and operations related to PDF documents
 */
export const PDFProvider = ({ children }) => {
  // State for the current PDF document
  const [pdfDocument, setPdfDocument] = useState(null);
  // State for the PDF file path - critical for text extraction
  const [pdfPath, setPdfPath] = useState(null);
  // State for the current PDF metadata
  const [pdfMetadata, setPdfMetadata] = useState(null);
  // State for the current page number
  const [currentPage, setCurrentPage] = useState(1);
  // State for the total number of pages
  const [totalPages, setTotalPages] = useState(0);
  // State for the scale/zoom level
  const [scale, setScale] = useState(DEFAULT_SCALE);
  // State for extracted text content
  const [textContent, setTextContent] = useState([]);
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState(null);
  // State to trigger PDF list updates - use a timestamp to ensure changes
  const [pdfListUpdated, setPdfListUpdated] = useState(Date.now());
  // State to trigger renders when needed
  const [renderTrigger, setRenderTrigger] = useState(0);
  // State to track if a zoom operation is in progress
  const [zoomInProgress, setZoomInProgress] = useState(false);

  /**
   * Load a PDF document from a file path
   * @param {string} filePath - Path to the PDF file
   */
  const loadPDF = useCallback(async (filePath) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading PDF from path:', filePath);
      
      // Reset current page and scale to default values
      setCurrentPage(1);
      setScale(DEFAULT_SCALE);
      
      // Store the PDF path - this is crucial for text extraction
      setPdfPath(filePath);
      
      // Load the PDF document
      const document = await loadPDFDocument(filePath);
      setPdfDocument(document);
      setTotalPages(document.numPages);
      
      // Get metadata
      const metadata = await getPDFMetadata(document);
      
      // Combine system metadata with PDF metadata
      const fileName = window.electron 
        ? window.electron.getFileName(filePath) 
        : filePath.split('/').pop();
      
      const combinedMetadata = {
        ...metadata,
        fileName,
        path: filePath
      };
      
      setPdfMetadata(combinedMetadata);
      
      // Add or update the PDF in the storage
      addPDFToList(combinedMetadata);
      
      // Update the PDF list flag to trigger a refresh
      setPdfListUpdated(Date.now());
      
      // Extract text content for all pages
      const text = await extractAllText(document);
      setTextContent(text);
      
      // Update render trigger to ensure the view refreshes
      setRenderTrigger(prev => prev + 1);
      
      return document;
    } catch (error) {
      console.error('Error loading PDF:', error);
      setError(`Failed to load PDF: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Change the current page
   * @param {number} pageNumber - The page number to navigate to
   */
  const goToPage = useCallback((pageNumber) => {
    if (!pdfDocument) return;
    
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
  }, [pdfDocument, totalPages]);

  /**
   * Go to the next page
   */
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  /**
   * Go to the previous page
   */
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  /**
   * Zoom in (increase scale) with debounce protection
   * @param {number} increment - The amount to increase the scale by (default: SCALE_STEP)
   */
  const zoomIn = useCallback(async (increment = SCALE_STEP) => {
    // Prevent rapid zoom operations that can cause rendering issues
    if (zoomInProgress) return;
    
    try {
      setZoomInProgress(true);
      
      setScale(prevScale => {
        // Calculate new scale
        const newScale = Math.min(MAX_SCALE, prevScale + increment);
        console.log(`Zooming IN from ${prevScale} to ${newScale}`);
        return newScale;
      });
      
      // Update render trigger to ensure the view refreshes
      setRenderTrigger(prev => prev + 1);
    } finally {
      // Add a small delay before allowing another zoom operation
      setTimeout(() => {
        setZoomInProgress(false);
      }, 200);
    }
  }, [zoomInProgress]);

  /**
   * Zoom out (decrease scale) with debounce protection
   * @param {number} decrement - The amount to decrease the scale by (default: SCALE_STEP)
   */
  const zoomOut = useCallback(async (decrement = SCALE_STEP) => {
    // Prevent rapid zoom operations that can cause rendering issues
    if (zoomInProgress) return;
    
    try {
      setZoomInProgress(true);
      
      setScale(prevScale => {
        // Calculate new scale
        const newScale = Math.max(MIN_SCALE, prevScale - decrement);
        console.log(`Zooming OUT from ${prevScale} to ${newScale}`);
        return newScale;
      });
      
      // Update render trigger to ensure the view refreshes
      setRenderTrigger(prev => prev + 1);
    } finally {
      // Add a small delay before allowing another zoom operation
      setTimeout(() => {
        setZoomInProgress(false);
      }, 200);
    }
  }, [zoomInProgress]);

  /**
   * Reset zoom to default scale (100%)
   */
  const resetZoom = useCallback(() => {
    // Prevent if zoom operation is in progress
    if (zoomInProgress) return;
    
    try {
      setZoomInProgress(true);
      console.log(`Resetting zoom to ${DEFAULT_SCALE}`);
      setScale(DEFAULT_SCALE);
      
      // Update render trigger to ensure the view refreshes
      setRenderTrigger(prev => prev + 1);
    } finally {
      // Add a small delay before allowing another zoom operation
      setTimeout(() => {
        setZoomInProgress(false);
      }, 200);
    }
  }, [zoomInProgress]);

  /**
   * Close the current PDF document
   */
  const closePDF = useCallback(() => {
    setPdfDocument(null);
    setPdfPath(null); // Also clear the path when closing
    setPdfMetadata(null);
    setCurrentPage(1);
    setTotalPages(0);
    setTextContent([]);
    setScale(DEFAULT_SCALE);
  }, []);

  /**
   * Get text content for the current page
   * @returns {string} - The text content
   */
  const getCurrentPageText = useCallback(() => {
    if (!textContent.length) return '';
    return textContent[currentPage - 1] || '';
  }, [textContent, currentPage]);

  // Create the context value object
  const contextValue = {
    // State
    pdfDocument,
    pdfPath, // Explicitly include the path in the context
    pdfMetadata,
    currentPage,
    totalPages,
    scale,
    textContent,
    isLoading,
    error,
    pdfListUpdated,
    renderTrigger,
    zoomInProgress,
    
    // Constants
    MIN_SCALE,
    MAX_SCALE,
    DEFAULT_SCALE,
    SCALE_STEP,
    
    // Actions
    loadPDF,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    closePDF,
    getCurrentPageText
  };

  // Update last opened timestamp when PDF changes
  useEffect(() => {
    if (pdfMetadata?.id) {
      updatePDFLastOpened(pdfMetadata.id);
      // Also update the list refresh indicator
      setPdfListUpdated(Date.now());
    }
  }, [pdfMetadata]);

  // Sync pdfPath with metadata.path for backward compatibility
  useEffect(() => {
    if (pdfMetadata?.path && !pdfPath) {
      console.log('Syncing PDF path from metadata:', pdfMetadata.path);
      setPdfPath(pdfMetadata.path);
    }
  }, [pdfMetadata, pdfPath]);

  // Debug logging for PDF path changes
  useEffect(() => {
    console.log('PDF Path in context updated:', pdfPath);
  }, [pdfPath]);

  return (
    <PDFContext.Provider value={contextValue}>
      {children}
    </PDFContext.Provider>
  );
};

export default PDFContext;