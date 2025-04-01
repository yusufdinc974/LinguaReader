import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PageView from '../components/vocabulary-mode/PageView';
import DefinitionDisplay from '../components/vocabulary-mode/DefinitionDisplay';
import NavigationControls from '../components/vocabulary-mode/NavigationControls';
import SettingsPopup from '../components/vocabulary-mode/SettingsPopup';
import PDFUpload from '../components/pdf/PDFUpload';
import Button from '../components/common/Button';
import * as storageService from '../services/storageService';
import { useVocabulary } from '../contexts/VocabularyContext';

/**
 * VocabularyMode - Page component for vocabulary-focused PDF reading
 * Enhanced with PDF library and viewing capabilities
 * Now with multi-word selection support
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onNavigate - Function to navigate to other pages
 */
const VocabularyMode = ({ onNavigate }) => {
  // Get everything we need from PDF context
  const { 
    pdfDocument, 
    pdfPath, 
    pdfMetadata,
    textContent: contextTextContent,
    vocabModePage, // Get the page from context
    goToVocabPage, // Get the page navigation method from context
    scale, // Get the scale from context
    loadPDF, // Add loadPDF function to load PDFs
  } = useContext(PDFContext);
  
  // Access vocabulary context
  const {
    selectedWords,
    clearSelectedWords,
    setSelectedWords,
    addWord
  } = useVocabulary();
  
  // Now using vocabModePage from context instead of local state
  const [selectedWord, setSelectedWord] = useState(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const [vocabularyList, setVocabularyList] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [plainText, setPlainText] = useState([]);
  const [pdfPages, setPdfPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [highlightSettings, setHighlightSettings] = useState({
    enabled: true,  // Enabled by default
    listOnly: false,
    selectedListId: null,
    colorPalette: 'standard' // 'standard', 'pastel', or 'vibrant'
  });
  
  // Multi-word selection state
  const [multiSelectionEnabled, setMultiSelectionEnabled] = useState(true);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [isMultiWordTranslation, setIsMultiWordTranslation] = useState(false);
  
  // PDF Library state - added from Reader component
  const [showLibrary, setShowLibrary] = useState(false);
  const recentPDFs = storageService.getPDFList();
  
  // New state for view mode
  const [viewMode, setViewMode] = useState('text'); // 'text', 'pdf', or 'split'
  
  // For page changes only - do not increment for word updates
  const [pageChangeCounter, setPageChangeCounter] = useState(0);
  
  // References for canvas elements
  const canvasRef = useRef(null);
  const pdfCanvasContainerRef = useRef(null);

  // Add Ctrl key detection for selection mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectionModeActive(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        setSelectionModeActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Handle case where user switches to another window while holding the key
    window.addEventListener('blur', () => setSelectionModeActive(false));
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', () => setSelectionModeActive(false));
    };
  }, []);

  // Format date for display in the library
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Handle new PDF upload - added from Reader component
  const handleNewPdfClick = async () => {
    if (window.electron) {
      try {
        const result = await window.electron.selectPdf();
        if (!result.canceled && !result.error) {
          await loadPDF(result.path);
          setShowLibrary(false);
        }
      } catch (error) {
        console.error('Error selecting PDF:', error);
      }
    }
  };

  // Handle loading a PDF from the library - added from Reader component
  const handleLoadPdf = async (pdfPath) => {
    try {
      await loadPDF(pdfPath);
      setShowLibrary(false); // Close the library after selecting a PDF
    } catch (error) {
      console.error('Error loading PDF from library:', error);
    }
  };

  // When saved vocabulary words change, update the vocabularyList to include list info
  useEffect(() => {
    if (Object.keys(vocabularyList).length > 0) {
      // Check and update list membership of words
      const vocabularyLists = storageService.getAllVocabularyLists();
      
      if (vocabularyLists && vocabularyLists.length > 0) {
        let listsChanged = false;
        const updatedList = { ...vocabularyList };
        
        // For each word, check which lists it belongs to
        vocabularyLists.forEach(list => {
          if (list.words && Array.isArray(list.words)) {
            list.words.forEach(wordId => {
              // Find the word in our vocabularyList
              Object.keys(updatedList).forEach(key => {
                const word = updatedList[key];
                if (word.id === wordId) {
                  // Initialize lists array if needed
                  if (!word.lists) {
                    word.lists = [];
                    listsChanged = true;
                  }
                  
                  // Add list ID if not already in the lists array
                  if (!word.lists.includes(list.id)) {
                    word.lists.push(list.id);
                    listsChanged = true;
                  }
                }
              });
            });
          }
        });
        
        // If any words were updated, update the state
        if (listsChanged) {
          console.log('Updating vocabulary list with list membership info');
          setVocabularyList(updatedList);
          // We don't need to force a refresh here, just update the state
        }
      }
    }
  }, [vocabularyList]);
  
  // Update page change counter when vocabModePage changes
  useEffect(() => {
    setPageChangeCounter(prev => prev + 1);
    
    // Render the PDF page when the page changes if in PDF or split view mode
    if (viewMode !== 'text') {
      renderPDFPage();
    }
  }, [vocabModePage]);
  
  // Re-render PDF page when view mode changes
  useEffect(() => {
    if (viewMode !== 'text') {
      renderPDFPage();
    }
  }, [viewMode]);
  
  // Function to render the current PDF page
  const renderPDFPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;
    
    try {
      // Get the page
      const page = await pdfDocument.getPage(vocabModePage);
      
      // Get the canvas element
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Calculate the viewport based on the container size
      const containerWidth = pdfCanvasContainerRef.current?.clientWidth || 800;
      const viewport = page.getViewport({ scale: scale * (containerWidth / page.getViewport({ scale: 1 }).width) });
      
      // Set canvas height and width
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      console.log(`Rendered PDF page ${vocabModePage}`);
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  }, [pdfDocument, vocabModePage, scale]);
  
  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (viewMode !== 'text') {
        renderPDFPage();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [renderPDFPage, viewMode]);
  
  // Handle highlighting changes
  const handleHighlightingChange = useCallback((newHighlightSettings) => {
    console.log('Highlighting settings changed:', newHighlightSettings);
    
    // Update local state
    setHighlightSettings(newHighlightSettings);
    
    // Save to local storage for persistence
    try {
      localStorage.setItem('highlightSettings', JSON.stringify(newHighlightSettings));
    } catch (error) {
      console.error('Error saving highlighting settings:', error);
    }
  }, []);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Load highlighting settings when component mounts
  useEffect(() => {
    console.log('VocabularyMode mounted');
    
    // Initialize storage on mount
    storageService.initializeStorage();
    
    // Try to get saved highlight settings
    try {
      const savedSettings = localStorage.getItem('highlightSettings');
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        console.log('Loaded highlighting settings:', parsedSettings);
        setHighlightSettings(parsedSettings);
      }
      
      // Try to get saved view mode
      const savedViewMode = localStorage.getItem('vocabularyViewMode');
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    return () => {
      isMounted.current = false;
      console.log('VocabularyMode unmounted');
    };
  }, []);
  
  // When PDF document or path changes
  useEffect(() => {
    if (pdfDocument && isMounted.current) {
      console.log('PDF document or path changed in VocabularyMode');
      
      setSelectedWord(null);
      setShowDefinition(false);
      setIsInitialized(true);
      
      // If we have text content from the context, use it directly!
      if (contextTextContent && contextTextContent.length > 0) {
        console.log('Using text content from context');
        setLoading(false);
        setError(null);
        
        // Create simple page objects from the text content
        const simplePages = contextTextContent.map((text, index) => ({
          pageNumber: index + 1,
          content: {
            paragraphs: [{ text }]
          }
        }));
        
        setPdfPages(simplePages);
        setPlainText(contextTextContent);
        
        // Render the PDF page if in PDF or split view mode
        if (viewMode !== 'text') {
          setTimeout(() => {
            renderPDFPage();
          }, 100);
        }
      } else {
        console.log('No text content available in context, setting error state');
        setError(new Error('No text content available'));
        setLoading(false);
      }
    }
  }, [pdfDocument, pdfPath, contextTextContent, renderPDFPage, viewMode]);
  
  // Load vocabulary list from storage service
  const loadVocabularyList = useCallback(() => {
    try {
      // Get all vocabulary words directly from the storage service
      const allVocabulary = storageService.getAllVocabulary();
      console.log('Loaded vocabulary from storageService:', allVocabulary);
      
      // Convert the array of vocabulary objects to a lookup map
      const vocabMap = {};
      
      allVocabulary.forEach(word => {
        if (word && word.word) {
          const key = word.word.toLowerCase();
          vocabMap[key] = word;
        }
      });
      
      setVocabularyList(vocabMap);
      console.log('Processed vocabulary map:', vocabMap);
      
      // Make the vocabulary data globally accessible for debugging
      window.vocabularyData = {
        original: allVocabulary,
        processed: vocabMap
      };
      
    } catch (err) {
      console.error('Error loading vocabulary from storage service:', err);
      setVocabularyList({});
    }
  }, []);

  // Initial vocabulary load
  useEffect(() => {
    loadVocabularyList();
  }, [loadVocabularyList]);
  
  // Handle word click for single word translation
  const handleWordClick = useCallback((word) => {
    if (!word) return;
    
    console.log('Word clicked:', word);
    setSelectedWord(word);
    setIsMultiWordTranslation(false);
    setShowDefinition(true);
  }, []);
  
  // Handle multi-word translation
  const handleMultiWordTranslate = useCallback((words) => {
    if (!words || words.length === 0) return;
    
    console.log('Multi-word translation requested:', words);
    
    // Convert array of words to a single combined text
    const combinedText = words.map(w => 
      typeof w === 'string' ? w : w.word
    ).join(' ');
    
    // Create a word object for the definition panel
    const combinedWordObj = {
      word: combinedText,
      sourceLang: words[0].sourceLang || 'en',
      targetLang: 'en',
      isMultiWord: true
    };
    
    setSelectedWord(combinedWordObj);
    setIsMultiWordTranslation(true);
    setShowDefinition(true);
    
    // Optionally, clear the selection after translating
    // clearSelectedWords();
  }, []);
  
  // Handle word selection for multi-select
  const handleSelectionChange = useCallback((word, isSelected) => {
    if (isSelected) {
      // Add word to selection
      setSelectedWords(prev => {
        // Make sure we don't add duplicates
        if (!prev.some(w => w.word === word.word)) {
          return [...prev, word];
        }
        return prev;
      });
    } else {
      // Remove word from selection
      setSelectedWords(prev => 
        prev.filter(w => w.word !== word.word)
      );
    }
  }, [setSelectedWords]);
  
  // Handle saving word to vocabulary list
  const handleSaveWord = useCallback((wordData) => {
    // Make sure we have a word
    if (!wordData || !wordData.word) {
      console.error('Invalid word data received:', wordData);
      return;
    }
    
    console.log('Saving word to vocabulary:', wordData);
    
    try {
      // Save using the storage service
      const savedWord = storageService.addVocabularyWord(wordData);
      
      // Update local state
      if (savedWord) {
        setVocabularyList(prev => {
          const key = savedWord.word.toLowerCase();
          return {
            ...prev,
            [key]: savedWord
          };
        });
        
        console.log('Word saved successfully:', savedWord);
      }
    } catch (error) {
      console.error('Error saving word:', error);
    }
    
    setShowDefinition(false);
  }, []);

  // Handle word saved from DefinitionDisplay
  const handleWordSaved = useCallback((savedWord) => {
    console.log('Word saved callback received:', savedWord);
    
    // Immediately refresh vocabulary list to get latest data
    loadVocabularyList();
    
    // We do NOT increment any counters here to avoid remounting components
  }, [loadVocabularyList]);
  
  // Handle page change - now using goToVocabPage from context
  const handlePageChange = useCallback((pageNum) => {
    const validPage = Math.max(1, Math.min(pageNum, plainText.length));
    goToVocabPage(validPage);
  }, [plainText.length, goToVocabPage]);
  
  // Get current page content - using vocabModePage from context now
  const currentPageContent = plainText && plainText.length > 0 
    ? plainText[vocabModePage - 1] || ''
    : '';
  
  // Get paragraphs for current page
  const getParagraphsForPage = useCallback((pageNumber) => {
    const index = pageNumber - 1;
    if (index >= 0 && index < pdfPages.length) {
      return pdfPages[index]?.content?.paragraphs || [];
    }
    return [];
  }, [pdfPages]);
  
  const currentPageParagraphs = getParagraphsForPage(vocabModePage);
  
  // Handle change view mode
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem('vocabularyViewMode', mode);
    
    // If switching to PDF or split view, render the PDF page
    if (mode !== 'text') {
      setTimeout(() => {
        renderPDFPage();
      }, 100);
    }
  }, [renderPDFPage]);
  
  // Animation variants with conditional transitions
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Show loading state
  if (loading && pdfDocument) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#4a5568'
        }}
      >
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #6a89dd',
          borderTopColor: '#4a69bd',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <div>Preparing vocabulary mode...</div>
        <div style={{ 
          marginTop: '20px',
          fontSize: '0.8rem',
          color: '#718096',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          PDF Path: {pdfPath || 'None'}
        </div>
      </div>
    );
  }
  
  // Show upload interface if no PDF is loaded
  if (!pdfDocument) {
    return <PDFUpload />;
  }
  
  // Show error state
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#e74c3c',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <h2>Error Loading PDF</h2>
        <p>{error.message || 'Could not extract text from PDF'}</p>
        <div style={{ 
          margin: '20px 0',
          padding: '15px',
          background: 'rgba(255,0,0,0.1)',
          borderRadius: '5px',
          maxWidth: '600px',
          textAlign: 'left',
          fontSize: '0.8rem',
          color: '#e74c3c'
        }}>
          <strong>Error Details:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error.stack || error.message}
          </pre>
        </div>
        <p>Try loading a different PDF or check the console for more details.</p>
        <button
          onClick={handleNewPdfClick}
          style={{
            backgroundColor: '#4a69bd',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            marginTop: '20px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Upload a Different PDF
        </button>
      </div>
    );
  }
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        paddingBottom: '70px' // Space for navigation controls
      }}
    >
      {/* PDF metadata header - Added from Reader component */}
      {pdfDocument && pdfMetadata && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="vocabulary-mode-header"
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
            {/* Removing duplicate buttons - will keep the ones below in the view mode selector */}
          </div>
        </motion.div>
      )}
      
      {/* Main content with library */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        {/* Library sidebar - Added from Reader component */}
        <AnimatePresence>
          {showLibrary && (
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              style={{
                width: 300,
                height: '100%',
                flexShrink: 0,
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: 'var(--space-md)',
                marginRight: 'var(--space-md)',
                overflowY: 'auto',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-md)'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--text-primary)'
                }}>
                  PDF Library
                </h3>
                
                <button
                  onClick={() => setShowLibrary(false)}
                  aria-label="Close Library"
                  style={{
                    width: '28px',
                    height: '28px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div>
                {recentPDFs.length === 0 ? (
                  <div style={{
                    padding: 'var(--space-lg)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    No PDF documents in your library yet.
                  </div>
                ) : (
                  recentPDFs.map((pdf, index) => (
                    <div
                      key={pdf.id || index}
                      onClick={() => handleLoadPdf(pdf.path)}
                      style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        marginBottom: 'var(--space-sm)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: pdf.path === pdfPath ? 'var(--primary-light)' : 'var(--surface-elevated)',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: pdf.path === pdfPath ? 'var(--primary-color)' : 'var(--border)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)'
                      }}>
                        <span style={{
                          fontSize: '1.2rem',
                          color: 'var(--primary-color)'
                        }}>
                          📄
                        </span>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{
                            fontWeight: 'var(--font-weight-medium)',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {pdf.title || pdf.fileName || 'Untitled Document'}
                          </div>
                          <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)'
                          }}>
                            {pdf.pageCount} pages • {new Date(pdf.lastOpened).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main content area */}
        <motion.div 
          className="vocabulary-mode-content"
          animate={{ 
            width: showLibrary ? 'calc(100% - 300px)' : '100%',
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div className="vocabulary-mode-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              {/* Navigation controls and buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="vocabulary-button"
                  onClick={() => setShowLibrary(true)}
                  style={{
                    padding: '8px 15px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: '500',
                    color: '#4a5568',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  Show Library
                </button>

                <button 
                  className="vocabulary-button primary"
                  onClick={() => onNavigate('/reader')}
                  style={{
                    padding: '8px 15px',
                    borderRadius: '4px',
                    border: '1px solid #4a69bd',
                    backgroundColor: '#6a89cc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: '500',
                    color: 'white',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                  New PDF
                </button>
                
                <button 
                  className="vocabulary-button"
                  onClick={() => setShowSettings(true)}
                  style={{
                    padding: '8px 15px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: '500',
                    color: '#4a5568',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Settings
                </button>
              </div>

              {/* View Mode Selection */}
              <div className="view-mode-selector" style={{ 
                display: 'flex', 
                borderRadius: 'var(--radius-sm)', 
                overflow: 'hidden', 
                border: '1px solid var(--border)', 
                boxShadow: 'var(--shadow-sm)' 
              }}>
                <button 
                  className={`view-mode-button ${viewMode === 'text' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('text')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: viewMode === 'text' ? 'var(--primary-color)' : 'var(--surface)',
                    border: 'none',
                    borderRight: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: viewMode === 'text' ? 'white' : 'var(--text-secondary)',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ marginRight: '5px' }}>📝</span>
                  Text
                </button>
                <button 
                  className={`view-mode-button ${viewMode === 'pdf' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('pdf')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: viewMode === 'pdf' ? 'var(--primary-color)' : 'var(--surface)',
                    border: 'none',
                    borderRight: '1px solid var(--border)',
                    cursor: 'pointer',
                    color: viewMode === 'pdf' ? 'white' : 'var(--text-secondary)',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ marginRight: '5px' }}>📄</span>
                  PDF
                </button>
                <button 
                  className={`view-mode-button ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('split')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: viewMode === 'split' ? 'var(--primary-color)' : 'var(--surface)',
                    border: 'none',
                    cursor: 'pointer',
                    color: viewMode === 'split' ? 'white' : 'var(--text-secondary)',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ marginRight: '5px' }}>⚡</span>
                  Split
                </button>
              </div>
            </div>
          </div>
          
          {/* Page content container */}
          <div className="page-content-container">
            {/* Text Mode - Original text-only view with enhanced multi-selection */}
            {viewMode === 'text' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`page-${vocabModePage}-${pageChangeCounter}`}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={{ duration: 0.3 }}
                >
                  <PageView
                    text={currentPageContent}
                    paragraphs={currentPageParagraphs}
                    vocabularyState={vocabularyList}
                    onWordClick={handleWordClick}
                    highlightSettings={highlightSettings}
                    // Multi-selection props
                    selectedWords={selectedWords}
                    onSelectionChange={handleSelectionChange}
                    multiSelectionEnabled={multiSelectionEnabled}
                    selectionModeActive={selectionModeActive}
                    onTranslateSelection={handleMultiWordTranslate}
                  />
                </motion.div>
              </AnimatePresence>
            )}
            
            {/* PDF Mode - Just the PDF with clickable words */}
            {viewMode === 'pdf' && (
              <div 
                className="pdf-canvas-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: '100%',
                  margin: '0 auto',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.08)',
                  padding: '20px',
                  position: 'relative'
                }}
              >
                {/* Interactive Word Layer (Will be implemented in phase 2) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    bottom: '20px',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  {/* In future versions, we'd add interactivity here */}
                </div>
                
                {/* PDF Rendering Canvas */}
                <div 
                  ref={pdfCanvasContainerRef}
                  className="pdf-canvas-container"
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    overflow: 'auto',
                    textAlign: 'center'
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Split Mode - PDF on left, Text with highlights on right */}
            {viewMode === 'split' && (
              <div
                className="split-view-container"
                style={{
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                {/* PDF View */}
                <div 
                  className="pdf-canvas-container"
                  style={{
                    flex: '1 1 300px',
                    maxHeight: '100%',
                    overflowY: 'auto',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.08)',
                    padding: '20px',
                    position: 'relative'
                  }}
                >
                  <div 
                    ref={pdfCanvasContainerRef}
                    style={{
                      width: '100%',
                      textAlign: 'center'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </div>
                </div>
                
                {/* Text View with multi-selection */}
                <div
                  style={{
                    flex: '1 1 300px',
                    maxHeight: '100%',
                    overflowY: 'auto'
                  }}
                >
                  <PageView
                    text={currentPageContent}
                    paragraphs={currentPageParagraphs}
                    vocabularyState={vocabularyList}
                    onWordClick={handleWordClick}
                    highlightSettings={highlightSettings}
                    // Multi-selection props
                    selectedWords={selectedWords}
                    onSelectionChange={handleSelectionChange}
                    multiSelectionEnabled={multiSelectionEnabled}
                    selectionModeActive={selectionModeActive}
                    onTranslateSelection={handleMultiWordTranslate}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Library sidebar */}
      </div>
      
      {/* Navigation Controls - Updated to use view mode */}
      <NavigationControls
        currentPage={vocabModePage}
        totalPages={plainText.length}
        onPageChange={handlePageChange}
        onViewModeChange={handleViewModeChange}
        currentViewMode={viewMode}
      />
      
      {/* Definition Display - Updated for multi-word translations */}
      <DefinitionDisplay
        word={selectedWord}
        isVisible={showDefinition}
        onClose={() => setShowDefinition(false)}
        onSaved={handleWordSaved}  
        onSaveWord={handleSaveWord}
        isMultiWord={isMultiWordTranslation}
      />
      
      {/* Settings Popup - Added Settings button and component */}
      <SettingsPopup
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        onHighlightingChange={handleHighlightingChange}
      />
    </div>
  );
};

export default VocabularyMode;