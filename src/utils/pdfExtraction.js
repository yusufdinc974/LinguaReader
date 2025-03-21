/**
 * PDF Text Extraction Utility
 * This utility provides functions to extract text content from PDFs while 
 * preserving page structure and word positions.
 */

import * as pdfjs from 'pdfjs-dist';

// Set PDF.js worker path
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

console.log('PDF.js version:', pdfjs.version);
console.log('PDF.js worker path:', pdfjs.GlobalWorkerOptions.workerSrc);

/**
 * Extracts text content from a PDF file
 * @param {ArrayBuffer|string} pdfData - PDF data as ArrayBuffer or path to PDF file
 * @returns {Promise<Array>} - Array of page objects with text content and word data
 */
export const extractPdfText = async (pdfData) => {
  console.log('extractPdfText called with:', typeof pdfData === 'string' ? pdfData : '[ArrayBuffer]');
  
  try {
    // Determine if pdfData is a path or buffer
    let pdfBuffer;
    if (typeof pdfData === 'string') {
      console.log('pdfData is a string (file path), loading from path');
      // It's a file path, load it with Electron's file system API
      try {
        pdfBuffer = await loadPdfFromPath(pdfData);
        console.log('Successfully loaded PDF from path, buffer size:', 
                   pdfBuffer instanceof ArrayBuffer ? pdfBuffer.byteLength : 'Not ArrayBuffer');
      } catch (loadError) {
        console.error('Error in loadPdfFromPath:', loadError);
        throw new Error(`Failed to load PDF from path: ${loadError.message}`);
      }
    } else {
      console.log('pdfData is not a string, assuming it\'s already a buffer');
      // It's already a buffer
      pdfBuffer = pdfData;
    }

    // Log the type of the buffer for debugging
    console.log('pdfBuffer type:', Object.prototype.toString.call(pdfBuffer));
    
    // Load the PDF document
    console.log('Creating PDF.js loading task');
    const loadingTask = pdfjs.getDocument(pdfBuffer);
    
    console.log('Awaiting PDF document loading');
    const pdf = await loadingTask.promise;
    console.log('PDF document loaded successfully');
    
    // Get total number of pages
    const numPages = pdf.numPages;
    console.log('PDF has', numPages, 'pages');
    
    const pages = [];

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${numPages}`);
      const page = await pdf.getPage(pageNum);
      console.log(`Got page ${pageNum}, fetching text content`);
      
      const textContent = await page.getTextContent();
      console.log(`Page ${pageNum} text content fetched, items:`, textContent.items.length);
      
      // Extract text items and process them
      console.log(`Processing text content for page ${pageNum}`);
      const processedContent = processTextContent(textContent, page);
      console.log(`Page ${pageNum} processed, paragraphs:`, processedContent.paragraphs.length);
      
      pages.push({
        pageNumber: pageNum,
        content: processedContent,
        rawTextItems: textContent.items,
      });
    }

    console.log('All pages processed, total pages:', pages.length);
    return pages;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Load PDF from file path using Electron's file system API
 * @param {string} path - Path to PDF file
 * @returns {Promise<ArrayBuffer>} - PDF as ArrayBuffer
 */
const loadPdfFromPath = async (path) => {
  console.log('loadPdfFromPath called with:', path);
  
  try {
    // Check if we're in Electron environment and have window.electron
    if (window.electron && window.electron.readFile) {
      console.log('Using window.electron.readFile API');
      return await window.electron.readFile(path);
    } else if (window.fs && window.fs.readFile) {
      console.log('Using window.fs.readFile API');
      // Use fs if available
      const buffer = await window.fs.readFile(path);
      console.log('window.fs.readFile succeeded, buffer type:', Object.prototype.toString.call(buffer));
      return buffer;
    } else {
      console.log('No file system API found, checking if path is a URL');
      // Fallback to fetch if it's a URL
      if (path.startsWith('http')) {
        console.log('Path is a URL, using fetch');
        const response = await fetch(path);
        const buffer = await response.arrayBuffer();
        console.log('Fetch succeeded, buffer size:', buffer.byteLength);
        return buffer;
      }
      
      // Try to access window.electron other ways
      console.log('Checking other possible window.electron patterns');
      if (window.electron) {
        console.log('window.electron exists, properties:', Object.keys(window.electron));
        
        // Try other potential methods on the electron object
        if (typeof window.electron.invoke === 'function') {
          console.log('Found window.electron.invoke, trying to use it');
          try {
            const buffer = await window.electron.invoke('read-file', path);
            console.log('window.electron.invoke succeeded');
            return buffer;
          } catch (invokeError) {
            console.error('window.electron.invoke failed:', invokeError);
          }
        }
      }
      
      throw new Error('Cannot read PDF from path - no file system API available');
    }
  } catch (error) {
    console.error('Error loading PDF from path:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Process text content from a PDF page
 * @param {Object} textContent - Text content object from PDF.js
 * @param {Object} page - PDF.js page object
 * @returns {Object} - Processed text with paragraphs, sentences, and words
 */
const processTextContent = (textContent, page) => {
  // Get page viewport for coordinate reference
  const viewport = page.getViewport({ scale: 1.0 });
  
  // Extract text items
  const textItems = textContent.items.map(item => ({
    text: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width,
    height: item.height,
    fontName: item.fontName
  }));
  
  // Sort text items by vertical position (top to bottom)
  // And then by horizontal position (left to right)
  textItems.sort((a, b) => {
    // First sort by Y position (top to bottom)
    const yDiff = b.y - a.y;
    
    // If Y positions are similar (within same line), sort by X position
    if (Math.abs(yDiff) < 5) {
      return a.x - b.x;
    }
    
    return yDiff;
  });
  
  // Group text items into lines
  const lines = groupIntoLines(textItems);
  
  // Group lines into paragraphs
  const paragraphs = groupIntoParagraphs(lines);
  
  // Extract and process words
  const words = extractWords(textItems);
  
  return {
    paragraphs,
    lines,
    words,
    dimensions: {
      width: viewport.width,
      height: viewport.height
    }
  };
};

/**
 * Group text items into lines based on Y coordinates
 * @param {Array} textItems - Array of text items
 * @returns {Array} - Array of line objects
 */
const groupIntoLines = (textItems) => {
  const lines = [];
  let currentLine = [];
  let prevY = null;
  
  for (const item of textItems) {
    // If this is first item or the Y position is similar to previous item
    if (prevY === null || Math.abs(item.y - prevY) < 5) {
      currentLine.push(item);
    } else {
      // New line detected
      if (currentLine.length > 0) {
        const lineText = currentLine.map(item => item.text).join(' ');
        lines.push({
          text: lineText,
          items: [...currentLine],
          y: currentLine[0].y
        });
        currentLine = [item];
      }
    }
    
    prevY = item.y;
  }
  
  // Add the last line if not empty
  if (currentLine.length > 0) {
    const lineText = currentLine.map(item => item.text).join(' ');
    lines.push({
      text: lineText,
      items: [...currentLine],
      y: currentLine[0].y
    });
  }
  
  return lines;
};

/**
 * Group lines into paragraphs based on spacing and indentation
 * @param {Array} lines - Array of line objects
 * @returns {Array} - Array of paragraph objects
 */
const groupIntoParagraphs = (lines) => {
  const paragraphs = [];
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    currentParagraph.push(lines[i]);
    
    // Check if this is the end of a paragraph
    const isLastLine = i === lines.length - 1;
    const hasSignificantGap = i < lines.length - 1 && 
                             (lines[i].y - lines[i+1].y) > 15;
    const nextLineIsIndented = i < lines.length - 1 && 
                              lines[i+1].items[0]?.x > lines[i].items[0]?.x + 10;
    
    if (isLastLine || hasSignificantGap || nextLineIsIndented) {
      // End of paragraph
      const paragraphText = currentParagraph.map(line => line.text).join(' ');
      paragraphs.push({
        text: paragraphText,
        lines: [...currentParagraph]
      });
      currentParagraph = [];
    }
  }
  
  return paragraphs;
};

/**
 * Extract individual words from text items
 * @param {Array} textItems - Array of text items
 * @returns {Array} - Array of word objects with position data
 */
const extractWords = (textItems) => {
  const words = [];
  
  for (const item of textItems) {
    // Split text into words (handling various separators)
    const wordMatches = item.text.match(/\b[\w''-]+\b/g);
    
    if (!wordMatches) continue;
    
    let currentPosition = 0;
    
    for (const word of wordMatches) {
      // Find position of this word in the original string
      const wordIndex = item.text.indexOf(word, currentPosition);
      if (wordIndex === -1) continue;
      
      // Calculate approximate position based on character index
      const charWidth = item.width / item.text.length;
      const wordX = item.x + (wordIndex * charWidth);
      const wordWidth = word.length * charWidth;
      
      words.push({
        text: word,
        x: wordX,
        y: item.y,
        width: wordWidth,
        height: item.height,
        fontName: item.fontName,
        originalItem: item
      });
      
      currentPosition = wordIndex + word.length;
    }
  }
  
  return words;
};

/**
 * Get plain text representation of a PDF
 * @param {Array} pages - Array of processed page objects
 * @returns {Array} - Array of plain text strings (one per page)
 */
export const getPdfPlainText = (pages) => {
  return pages.map(page => {
    return page.content.paragraphs.map(para => para.text).join('\n\n');
  });
};

/**
 * Get all words from a PDF with their positions
 * @param {Array} pages - Array of processed page objects
 * @returns {Array} - Array of word objects across all pages
 */
export const getAllPdfWords = (pages) => {
  return pages.map(page => {
    return page.content.words.map(word => ({
      ...word,
      pageNumber: page.pageNumber
    }));
  }).flat();
};

export default {
  extractPdfText,
  getPdfPlainText,
  getAllPdfWords
};