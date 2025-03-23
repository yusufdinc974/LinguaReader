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

/**
 * VocabularyMode - Page component for vocabulary-focused PDF reading
 * Enhanced with PDF library and viewing capabilities
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
  
  // Handle word click
  const handleWordClick = useCallback((word) => {
    if (!word) return;
    
    console.log('Word clicked:', word);
    setSelectedWord(word);
    setShowDefinition(true);
  }, []);
  
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
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowSettings(true)}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)', 
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚙️</span>
              <span>Settings</span>
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
        {/* Main content area */}
        <motion.div 
          animate={{ 
            width: showLibrary ? 'calc(100% - 300px)' : '100%',
          }}
          transition={{ duration: 0.3 }}
          style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Mode selector */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--border)',
            borderRadius: '8px 8px 0 0',
            marginBottom: '10px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              padding: '4px',
              borderRadius: '8px'
            }}>
              <button
                onClick={() => handleViewModeChange('text')}
                style={{
                  backgroundColor: viewMode === 'text' ? '#4a69bd' : 'transparent',
                  color: viewMode === 'text' ? 'white' : '#4a5568',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <span>📝</span>
                <span>Text</span>
              </button>
              
              <button
                onClick={() => handleViewModeChange('pdf')}
                style={{
                  backgroundColor: viewMode === 'pdf' ? '#4a69bd' : 'transparent',
                  color: viewMode === 'pdf' ? 'white' : '#4a5568',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <span>📄</span>
                <span>PDF</span>
              </button>
              
              <button
                onClick={() => handleViewModeChange('split')}
                style={{
                  backgroundColor: viewMode === 'split' ? '#4a69bd' : 'transparent',
                  color: viewMode === 'split' ? 'white' : '#4a5568',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <span>⚡</span>
                <span>Split</span>
              </button>
            </div>
          </div>
          
          {/* Content area based on view mode */}
          <div style={{ 
            flex: 1, 
            overflow: 'auto',
            padding: '20px'
          }}>
            {/* Text Mode - Original text-only view */}
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
                  />
                </motion.div>
              </AnimatePresence>
            )}
            
            {/* PDF Mode - Just the PDF with clickable words */}
            {viewMode === 'pdf' && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  maxWidth: '100%',
                  margin: '0 auto',
                  backgroundColor: 'white',
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
                style={{
                  display: 'flex',
                  gap: '20px',
                  height: '100%',
                  flexWrap: 'wrap'
                }}
              >
                {/* PDF View */}
                <div 
                  style={{
                    flex: '1 1 300px',
                    maxHeight: '100%',
                    overflowY: 'auto',
                    backgroundColor: 'white',
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
                
                {/* Text View */}
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
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Library sidebar */}
        <AnimatePresence>
          {showLibrary && (
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
      
      {/* Navigation Controls - Updated to use view mode */}
      <NavigationControls
        currentPage={vocabModePage}
        totalPages={plainText.length}
        onPageChange={handlePageChange}
        onViewModeChange={handleViewModeChange}
        currentViewMode={viewMode}
      />
      
      {/* Definition Display */}
      <DefinitionDisplay
        word={selectedWord}
        isVisible={showDefinition}
        onClose={() => setShowDefinition(false)}
        onSaved={handleWordSaved}  
        onSaveWord={handleSaveWord}
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