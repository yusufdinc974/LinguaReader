import { useState, useEffect, useRef } from 'react';
import { extractPdfText, getAllPdfWords } from '../utils/pdfExtraction';
import { getUniqueWords, getWordFrequency } from '../utils/textProcessing';

/**
 * Custom hook for extracting and processing text from a PDF
 * 
 * @param {string|ArrayBuffer} pdfSource - Path or data of the PDF
 * @returns {Object} - Processed PDF text data and state
 */
const usePdfText = (pdfSource) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [processedWords, setProcessedWords] = useState([]);
  const [uniqueWords, setUniqueWords] = useState([]);
  const [wordFrequency, setWordFrequency] = useState({});
  const [plainText, setPlainText] = useState([]);
  const [debug, setDebug] = useState({});
  const processingRef = useRef(false);
  const previousPdfSourceRef = useRef(null);

  useEffect(() => {
    // Log input for debugging
    console.log('usePdfText hook called with source:', pdfSource);
    
    // Skip if no PDF source provided or already processing the same PDF
    if (!pdfSource) {
      console.log('No PDF source provided, skipping extraction');
      setDebug(prev => ({ ...prev, reason: 'no_source' }));
      setLoading(false);
      return;
    }
    
    if (pdfSource === previousPdfSourceRef.current) {
      console.log('Same PDF source as before, using cached data');
      setDebug(prev => ({ ...prev, reason: 'cached_source' }));
      setLoading(false);
      return;
    }
    
    if (processingRef.current) {
      console.log('Already processing a PDF, skipping new request');
      setDebug(prev => ({ ...prev, reason: 'already_processing' }));
      setLoading(false);
      return;
    }

    const processPdf = async () => {
      try {
        // Set processing flag to avoid concurrent processing
        processingRef.current = true;
        setLoading(true);
        setError(null);
        setDebug({
          startTime: new Date().toISOString(),
          pdfSourceType: typeof pdfSource,
          pdfSourceValue: typeof pdfSource === 'string' ? pdfSource : 'ArrayBuffer'
        });

        console.log('Starting PDF processing');
        console.log('PDF source type:', typeof pdfSource);
        
        // Save current PDF source
        previousPdfSourceRef.current = pdfSource;

        // Handle both file paths and ArrayBuffers
        const source = pdfSource instanceof ArrayBuffer ? pdfSource : pdfSource;
        
        console.log('Calling extractPdfText with source:', 
                   typeof source === 'string' ? source : '[ArrayBuffer]');

        // Extract text from PDF
        try {
          const pages = await extractPdfText(source);
          console.log('PDF text extraction successful, pages:', pages.length);
          setDebug(prev => ({ ...prev, pagesExtracted: pages.length }));
          setPdfPages(pages);
          
          // Get all words from all pages
          const allWords = getAllPdfWords(pages);
          console.log('Extracted words count:', allWords.length);
          setDebug(prev => ({ ...prev, wordsExtracted: allWords.length }));
          setProcessedWords(allWords);

          // Generate plain text for each page
          const textByPage = pages.map(page => 
            page.content.paragraphs.map(para => para.text).join('\n\n')
          );
          console.log('Plain text by page generated, pages with content:', 
                     textByPage.filter(t => t.trim().length > 0).length);
          setDebug(prev => ({ 
            ...prev, 
            pagesWithContent: textByPage.filter(t => t.trim().length > 0).length,
            sampleText: textByPage[0]?.substring(0, 100) || 'No text'
          }));
          setPlainText(textByPage);

          // Get unique words across all pages
          const allText = textByPage.join(' ');
          const unique = getUniqueWords(allText);
          console.log('Unique words found:', unique.length);
          setDebug(prev => ({ ...prev, uniqueWords: unique.length }));
          setUniqueWords(unique);

          // Calculate word frequency
          const frequency = getWordFrequency(allText);
          console.log('Word frequency calculation complete');
          setWordFrequency(frequency);
        } catch (extractError) {
          console.error('PDF extraction specific error:', extractError);
          setDebug(prev => ({ 
            ...prev, 
            extractionError: extractError.message,
            extractionErrorStack: extractError.stack
          }));
          throw extractError;
        }

        setLoading(false);
        console.log('PDF processing complete');
        setDebug(prev => ({ ...prev, completedAt: new Date().toISOString() }));
      } catch (err) {
        console.error('Error processing PDF:', err);
        setError(err);
        setDebug(prev => ({ 
          ...prev, 
          error: err.message, 
          errorStack: err.stack,
          errorAt: new Date().toISOString()
        }));
        setLoading(false);
      } finally {
        processingRef.current = false;
      }
    };

    processPdf();

    // Clean up function to cancel any pending operations
    return () => {
      console.log('Cleanup function called for usePdfText');
      processingRef.current = false;
    };
  }, [pdfSource]);

  /**
   * Get words from a specific page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {Array} - Words from the specified page
   */
  const getWordsForPage = (pageNumber) => {
    return processedWords.filter(word => word.pageNumber === pageNumber);
  };

  /**
   * Get text content for a specific page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {string} - Plain text content of the page
   */
  const getTextForPage = (pageNumber) => {
    const index = pageNumber - 1;
    return index >= 0 && index < plainText.length ? plainText[index] : '';
  };

  /**
   * Get paragraphs for a specific page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {Array} - Array of paragraph objects
   */
  const getParagraphsForPage = (pageNumber) => {
    const index = pageNumber - 1;
    return index >= 0 && index < pdfPages.length 
      ? pdfPages[index]?.content?.paragraphs || []
      : [];
  };

  /**
   * Get words sorted by frequency
   * @param {number} limit - Maximum number of words to return
   * @returns {Array} - Words sorted by frequency
   */
  const getWordsByFrequency = (limit = 100) => {
    return Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  };

  return {
    loading,
    error,
    pdfPages,
    processedWords,
    uniqueWords,
    wordFrequency,
    plainText,
    getWordsForPage,
    getTextForPage,
    getParagraphsForPage,
    getWordsByFrequency,
    totalPages: pdfPages.length,
    hasContent: plainText.length > 0,
    debug // Include debug information in the return value
  };
};

export default usePdfText;