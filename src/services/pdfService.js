/**
 * PDF Service
 * Handles PDF loading, parsing, and rendering using PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';
// eslint-disable-next-line no-unused-vars
import { PDFDocumentProxy } from 'pdfjs-dist';

// Set up worker source (required for PDF.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Keep track of the current rendering task so we can cancel it if needed
let currentRenderTask = null;

// Cache for loaded pages to improve performance
const pageCache = new Map();

/**
 * Loads a PDF document from a file path
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<PDFDocumentProxy>} - The loaded PDF document
 */
export const loadPDFDocument = async (filePath) => {
  try {
    // Clear page cache when loading a new document
    pageCache.clear();
    
    // In Electron environment
    if (window.electron) {
      // Read the file using Electron's file system API
      const data = await window.electron.readFile(filePath);
      
      // Load the PDF document with enhanced rendering options
      const loadingTask = pdfjsLib.getDocument({
        data,
        // Enable better image quality
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
        cMapPacked: true,
        // Enable enhanced rendering options
        useSystemFonts: true,
        disableFontFace: false,
        // Set higher quality rendering
        maxImageSize: 8192 * 8192,
        isEvalSupported: true,
        isOffscreenCanvasSupported: true
      });
      
      return await loadingTask.promise;
    } 
    // In web environment (for development/testing)
    else {
      // Load PDF directly from URL with enhanced options
      const loadingTask = pdfjsLib.getDocument({
        url: filePath,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
        cMapPacked: true,
        useSystemFonts: true,
        disableFontFace: false,
        maxImageSize: 8192 * 8192,
        isEvalSupported: true,
        isOffscreenCanvasSupported: true
      });
      
      return await loadingTask.promise;
    }
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw new Error(`Failed to load PDF: ${error.message}`);
  }
};

/**
 * Renders a specific page of a PDF document to a canvas
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @param {number} pageNumber - The page number to render (1-based)
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 * @param {number} scale - The rendering scale (1.0 = 100%)
 * @returns {Promise<void>}
 */
export const renderPageToCanvas = async (pdfDocument, pageNumber, canvas, scale = 1.0) => {
  try {
    // Cancel any ongoing render task
    if (currentRenderTask !== null) {
      await currentRenderTask.cancel();
      currentRenderTask = null;
    }

    console.log(`Starting render of page ${pageNumber} at scale ${scale}`);
    
    // Generate a cache key
    const cacheKey = `${pdfDocument.fingerprints[0]}-${pageNumber}`;
    
    // Get the page (from cache if available)
    let page;
    if (pageCache.has(cacheKey)) {
      page = pageCache.get(cacheKey);
      console.log(`Using cached page ${pageNumber}`);
    } else {
      page = await pdfDocument.getPage(pageNumber);
      pageCache.set(cacheKey, page);
      console.log(`Page ${pageNumber} loaded and cached`);
    }
    
    // For quality, use a slightly higher resolution than the display
    // but don't go too high to avoid performance issues
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    
    // Get the viewport at the current scale, adjusting for pixel ratio for better quality
    const viewport = page.getViewport({ scale: scale * pixelRatio });
    
    // Ensure canvas context exists
    if (!canvas) {
      throw new Error('Canvas element is null or undefined');
    }
    
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Could not get canvas 2d context');
    }
    
    // Clear existing content
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set physical canvas dimensions to match the scaled viewport for high resolution
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Set CSS dimensions to scale down for display - this keeps the proportions correct
    // and ensures the canvas is displayed at the right size
    canvas.style.width = `${viewport.width / pixelRatio}px`;
    canvas.style.height = `${viewport.height / pixelRatio}px`;
    
    console.log(`Canvas dimensions set: ${canvas.width}x${canvas.height}`);
    
    // Enable quality settings
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // Render the page content with enhanced settings
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    // Store the current render task so we can cancel it if needed
    console.log(`Starting page render operation`);
    currentRenderTask = page.render(renderContext);
    
    // Wait for rendering to complete
    await currentRenderTask.promise;
    console.log(`Page ${pageNumber} rendered successfully`);
    
    currentRenderTask = null;
    
    // Return the dimensions for potential use by the caller
    return {
      width: viewport.width / pixelRatio,
      height: viewport.height / pixelRatio
    };
  } catch (error) {
    // Ignore canceled render task errors
    if (error instanceof Error && error.message.includes('cancelled')) {
      console.log('Page rendering was cancelled');
      return;
    }
    
    console.error(`Error rendering page ${pageNumber}:`, error);
    throw new Error(`Failed to render page ${pageNumber}: ${error.message}`);
  }
};

/**
 * Gets the text content of a specific page
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @param {number} pageNumber - The page number (1-based)
 * @returns {Promise<TextContent>} - The text content of the page
 */
export const getPageTextContent = async (pdfDocument, pageNumber) => {
  try {
    // Generate a cache key
    const cacheKey = `${pdfDocument.fingerprints[0]}-${pageNumber}`;
    
    // Get the page (from cache if available)
    let page;
    if (pageCache.has(cacheKey)) {
      page = pageCache.get(cacheKey);
    } else {
      page = await pdfDocument.getPage(pageNumber);
      pageCache.set(cacheKey, page);
    }
    
    return await page.getTextContent();
  } catch (error) {
    console.error(`Error getting text content for page ${pageNumber}:`, error);
    throw new Error(`Failed to get text content: ${error.message}`);
  }
};

/**
 * Extracts all text from a PDF document
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @returns {Promise<string[]>} - Array of text content for each page
 */
export const extractAllText = async (pdfDocument) => {
  try {
    const numPages = pdfDocument.numPages;
    const textPromises = [];
    
    for (let i = 1; i <= numPages; i++) {
      textPromises.push(getPageTextContent(pdfDocument, i));
    }
    
    const textContents = await Promise.all(textPromises);
    
    // Convert text content objects to strings
    return textContents.map(content => {
      return content.items.map(item => item.str).join(' ');
    });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

/**
 * Gets the outline (bookmarks) of a PDF document
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @returns {Promise<Object[]>} - The outline structure
 */
export const getPDFOutline = async (pdfDocument) => {
  try {
    const outline = await pdfDocument.getOutline();
    return outline || [];
  } catch (error) {
    console.error('Error getting PDF outline:', error);
    throw new Error(`Failed to get outline: ${error.message}`);
  }
};

/**
 * Gets basic metadata from a PDF document
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @returns {Promise<Object>} - The metadata object
 */
export const getPDFMetadata = async (pdfDocument) => {
  try {
    const metadata = await pdfDocument.getMetadata();
    return {
      title: metadata?.info?.Title || null,
      author: metadata?.info?.Author || null,
      subject: metadata?.info?.Subject || null,
      keywords: metadata?.info?.Keywords || null,
      creator: metadata?.info?.Creator || null,
      producer: metadata?.info?.Producer || null,
      creationDate: metadata?.info?.CreationDate 
        ? new Date(metadata.info.CreationDate) 
        : null,
      modificationDate: metadata?.info?.ModDate 
        ? new Date(metadata.info.ModDate) 
        : null,
      pageCount: pdfDocument.numPages
    };
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
};

/**
 * Preloads a specific page to improve rendering performance
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @param {number} pageNumber - The page number to preload
 */
export const preloadPage = async (pdfDocument, pageNumber) => {
  try {
    // Generate a cache key
    const cacheKey = `${pdfDocument.fingerprints[0]}-${pageNumber}`;
    
    // Skip if already cached
    if (pageCache.has(cacheKey)) {
      return;
    }
    
    // Load and cache the page
    const page = await pdfDocument.getPage(pageNumber);
    pageCache.set(cacheKey, page);
    
    console.log(`Preloaded page ${pageNumber}`);
  } catch (error) {
    console.error(`Error preloading page ${pageNumber}:`, error);
  }
};

/**
 * Preloads adjacent pages for smoother navigation
 * @param {PDFDocumentProxy} pdfDocument - The PDF document
 * @param {number} currentPage - The current page number
 */
export const preloadAdjacentPages = async (pdfDocument, currentPage) => {
  // Preload next and previous pages
  const pagesToPreload = [];
  
  if (currentPage < pdfDocument.numPages) {
    pagesToPreload.push(currentPage + 1);
  }
  
  if (currentPage > 1) {
    pagesToPreload.push(currentPage - 1);
  }
  
  // Preload in parallel
  await Promise.all(pagesToPreload.map(pageNumber => 
    preloadPage(pdfDocument, pageNumber)
  ));
};