/**
 * PDF Text Extraction Utility
 * This utility provides functions to extract text content from PDFs while 
 * preserving page structure and word positions.
 * Enhanced with CJK (Chinese, Japanese, Korean) language support.
 */

import * as pdfjs from 'pdfjs-dist';
import { detectLanguage } from '../utils/textProcessing';

// Set PDF.js worker path
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

// Use local cmaps to avoid CORS issues
const CMAP_URL = '/cmaps/';
const CMAP_PACKED = true;

console.log('PDF.js version:', pdfjs.version);
console.log('PDF.js worker path:', pdfjs.GlobalWorkerOptions.workerSrc);
console.log('Using local cmaps from:', CMAP_URL);

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
    
    // Load the PDF document with proper CJK support
    console.log('Creating PDF.js loading task with CJK support');
    const loadingTask = pdfjs.getDocument({
      data: pdfBuffer,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      useSystemFonts: true,
      disableFontFace: false
    });
    
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
        language: processedContent.language
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
 * Enhanced with CJK language support
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
  
  // Check if the text contains CJK characters
  const allText = textItems.map(item => item.text).join(' ');
  const hasCJKCharacters = /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(allText);
  
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
  
  // Detect language
  const detectedLanguage = detectLanguage(allText);
  console.log('Detected language:', detectedLanguage);
  
  // Group text items into lines with special handling for CJK languages
  const lines = hasCJKCharacters ? 
    groupIntoLinesForCJK(textItems, detectedLanguage) : 
    groupIntoLines(textItems);
  
  // Process differently based on language
  let paragraphs, words;
  
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    // For CJK languages, use special processing
    const result = processCJKContent(lines, detectedLanguage);
    paragraphs = result.paragraphs;
    words = result.words;
  } else {
    // For Latin and other scripts, use the standard processing
    paragraphs = groupIntoParagraphs(lines);
    words = extractWords(textItems);
  }
  
  return {
    paragraphs,
    lines,
    words,
    language: detectedLanguage,
    dimensions: {
      width: viewport.width,
      height: viewport.height
    }
  };
};

/**
 * Special line grouping for CJK languages
 */
const groupIntoLinesForCJK = (textItems, language) => {
  const lines = [];
  let currentLine = [];
  let prevY = null;
  
  for (const item of textItems) {
    // For Korean, check for English text that might be mixed in
    if (language === 'ko') {
      // Detect if this item is primarily English
      const isEnglishText = /^[a-zA-Z0-9\s.,;:!?"'()\-]+$/.test(item.text);
      
      // If it's English text in a Korean document, handle it specially
      if (isEnglishText) {
        // If there's a current line, finalize it
        if (currentLine.length > 0) {
          const lineText = currentLine.map(item => item.text).join('');
          lines.push({
            text: lineText,
            items: [...currentLine],
            y: currentLine[0].y,
            isKorean: true
          });
          currentLine = [];
        }
        
        // Add the English text as its own line
        lines.push({
          text: item.text,
          items: [item],
          y: item.y,
          isEnglish: true
        });
        
        prevY = item.y;
        continue;
      }
    }
    
    // Regular CJK line handling
    // If this is first item or the Y position is similar to previous item
    if (prevY === null || Math.abs(item.y - prevY) < 5) {
      currentLine.push(item);
    } else {
      // New line detected
      if (currentLine.length > 0) {
        // For CJK, we don't add spaces between characters in the same line
        const lineText = currentLine.map(item => item.text).join('');
        lines.push({
          text: lineText,
          items: [...currentLine],
          y: currentLine[0].y,
          isCJK: true
        });
        currentLine = [item];
      }
    }
    
    prevY = item.y;
  }
  
  // Add the last line if not empty
  if (currentLine.length > 0) {
    const lineText = currentLine.map(item => item.text).join('');
    lines.push({
      text: lineText,
      items: [...currentLine],
      y: currentLine[0].y,
      isCJK: true
    });
  }
  
  return lines;
};

/**
 * Process CJK content specially
 * @param {Array} lines - Array of text lines
 * @param {string} language - The detected language
 * @returns {Object} - Processed paragraphs and words
 */
const processCJKContent = (lines, language) => {
  const paragraphs = [];
  const words = [];
  
  // Group lines into paragraphs
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Skip English lines in Korean text for paragraph grouping
    if (language === 'ko' && lines[i].isEnglish) {
      // If we have a partial paragraph, complete it before the English content
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.map(line => line.text).join('');
        paragraphs.push({
          text: paragraphText,
          lines: [...currentParagraph],
          language: language
        });
        currentParagraph = [];
      }
      
      // Add English content as separate paragraph
      paragraphs.push({
        text: lines[i].text,
        lines: [lines[i]],
        language: 'en',
        isEmbeddedEnglish: true
      });
      
      continue;
    }
    
    currentParagraph.push(lines[i]);
    
    // Check if this is the end of a paragraph
    const isLastLine = i === lines.length - 1;
    const hasSignificantGap = i < lines.length - 1 && 
                             (lines[i].y - lines[i+1].y) > 15;
    const nextLineIsEnglish = i < lines.length - 1 && lines[i+1].isEnglish;
    
    if (isLastLine || hasSignificantGap || nextLineIsEnglish) {
      // End of paragraph
      // Join without spaces for CJK text
      const paragraphText = currentParagraph.map(line => line.text).join('');
      paragraphs.push({
        text: paragraphText,
        lines: [...currentParagraph],
        language: language
      });
      currentParagraph = [];
    }
  }
  
  // For CJK languages, extract individual characters as "words"
  for (const line of lines) {
    // Skip English lines in Korean text for character extraction
    if (language === 'ko' && line.isEnglish) {
      // For English text in Korean document, extract words normally
      const englishWords = line.text.match(/\b[\w''-]+\b/g) || [];
      
      // Calculate approximate character width for positioning
      const avgCharWidth = line.items[0].width / line.items[0].text.length;
      
      for (const word of englishWords) {
        // Find position of this word in the original string
        const wordIndex = line.text.indexOf(word);
        if (wordIndex === -1) continue;
        
        // Calculate approximate position
        const wordX = line.items[0].x + (wordIndex * avgCharWidth);
        const wordWidth = word.length * avgCharWidth;
        
        words.push({
          text: word,
          x: wordX,
          y: line.y,
          width: wordWidth,
          height: line.items[0].height || 20, // Default height if not available
          fontName: line.items[0].fontName,
          isEnglish: true,
          isCJK: false,
          language: 'en'
        });
      }
      
      continue;
    }
    
    const lineText = line.text;
    
    // Calculate approximate character width for positioning
    const avgCharWidth = line.items.reduce((sum, item) => sum + (item.width / item.text.length), 0) / line.items.length;
    
    // Process each character in the line
    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      
      // Skip whitespace and control characters
      if (/\s/.test(char) || char.charCodeAt(0) < 32) continue;
      
      // Calculate approximate X position
      const charX = line.items[0].x + (i * avgCharWidth);
      
      // Check if this is a genuine Korean/CJK character
      const isCJKChar = language === 'ko' ? 
        /[\uAC00-\uD7AF\u1100-\u11FF]/.test(char) : 
        /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(char);
      
      words.push({
        text: char,
        x: charX,
        y: line.y,
        width: avgCharWidth,
        height: line.items[0].height || 20, // Default height if not available
        fontName: line.items[0].fontName,
        isCJK: true,
        isHanScript: isCJKChar,
        language: language
      });
    }
  }
  
  return { paragraphs, words };
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
        originalItem: item,
        isCJK: false
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
      pageNumber: page.pageNumber,
      language: page.content.language
    }));
  }).flat();
};

/**
 * Extract and prepare text for display with CJK support
 * @param {string} text - Text content
 * @param {string} language - Detected language
 * @returns {Array} - Array of segments for display
 */
export const prepareTextForDisplay = (text, language) => {
  if (!text) return [];
  
  const segments = [];
  
  // For CJK languages, process text differently
  if (['ja', 'zh', 'ko'].includes(language)) {
    // For Chinese and Japanese, process character by character
    if (language === 'ja' || language === 'zh') {
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Handle linebreaks and whitespace
        if (char === '\n') {
          segments.push({ type: 'linebreak' });
          continue;
        }
        
        if (/\s/.test(char)) {
          segments.push({ type: 'space', content: char });
          continue;
        }
        
        // Add character as selectable item
        segments.push({
          type: 'character',
          content: char,
          language,
          selectable: true
        });
      }
    } 
    // For Korean, process words and characters
    else if (language === 'ko') {
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        // Check if this line is primarily English (for filtering)
        const isEnglishLine = /^[a-zA-Z0-9\s.,;:!?"'()\-]+$/.test(lines[i]) && 
                           (lines[i].includes('.') || lines[i].includes('://') || lines[i].includes('@'));
        
        // Skip lines that are likely embedded English content
        if (isEnglishLine) {
          continue;
        }
        
        const words = lines[i].split(/(\s+)/);
        
        for (const word of words) {
          if (!word) continue;
          
          if (/^\s+$/.test(word)) {
            segments.push({ type: 'space', content: word });
            continue;
          }
          
          // For Korean, we want to handle characters individually but preserve word context
          // First add the whole word
          segments.push({
            type: 'word',
            content: word,
            language,
            selectable: true
          });
          
          // We used to add individual characters here too, but it's better to keep it at word level
          // for Korean to avoid duplication in selection
        }
        
        if (i < lines.length - 1) {
          segments.push({ type: 'linebreak' });
        }
      }
    }
  } else {
    // For non-CJK languages, split by words
    const words = text.split(/(\s+|\n)/);
    
    for (const word of words) {
      if (!word) continue;
      
      if (word === '\n') {
        segments.push({ type: 'linebreak' });
        continue;
      }
      
      if (/^\s+$/.test(word)) {
        segments.push({ type: 'space', content: word });
        continue;
      }
      
      segments.push({
        type: 'word',
        content: word,
        language,
        selectable: true
      });
    }
  }
  
  return segments;
};

/**
 * Filter out problematic content in CJK text
 * @param {Array} segments - Text segments to filter
 * @param {string} language - Language code
 * @returns {Array} - Filtered segments
 */
export const filterCJKSegments = (segments, language) => {
  if (!segments || !language) return segments;
  
  // Only apply special filtering for Korean
  if (language !== 'ko') return segments;
  
  const filteredSegments = [];
  let skipMode = false;
  let skipCount = 0;
  
  // Look for segments that look like URLs, file paths, or addresses
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Check for URL-like patterns to skip
    if (segment.type === 'word' && 
        (segment.content.includes('http') || 
         segment.content.includes('.com') || 
         segment.content.includes('www.') ||
         segment.content.includes('/') ||
         segment.content.includes('@') ||
         segment.content.match(/\d{3}-\d{3}/) || // phone number pattern
         segment.content.match(/\d+\.\d+\.\d+/))) { // version number or IP
      skipMode = true;
      skipCount = 10; // Skip some following segments too
      continue;
    }
    
    // Count down the skip mode
    if (skipMode) {
      skipCount--;
      if (skipCount <= 0) {
        skipMode = false;
      }
      continue;
    }
    
    // Check for hangul characters in word segments - only keep those with actual Korean text
    if (segment.type === 'word' && language === 'ko') {
      // Only keep words that contain at least one Hangul character
      if (!/[\uAC00-\uD7AF\u1100-\u11FF]/.test(segment.content)) {
        continue;
      }
    }
    
    filteredSegments.push(segment);
  }
  
  return filteredSegments;
};

export default {
  extractPdfText,
  getPdfPlainText,
  getAllPdfWords,
  prepareTextForDisplay,
  filterCJKSegments
};