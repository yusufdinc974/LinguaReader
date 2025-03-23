import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PageView from '../components/vocabulary-mode/PageView';
import DefinitionDisplay from '../components/vocabulary-mode/DefinitionDisplay';
import NavigationControls from '../components/vocabulary-mode/NavigationControls';
import SettingsPopup from '../components/vocabulary-mode/SettingsPopup';
import * as storageService from '../services/storageService';

/**
 * VocabularyMode - Page component for vocabulary-focused PDF reading
 * Extracts text from PDF and presents it in a word-by-word interactive format
 * Enhanced with original PDF rendering
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
    scale // Get the scale from context
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
  
  // New state for view mode
  const [viewMode, setViewMode] = useState('text'); // 'text', 'pdf', or 'split'
  
  // For page changes only - do not increment for word updates
  const [pageChangeCounter, setPageChangeCounter] = useState(0);
  
  // References for canvas elements
  const canvasRef = useRef(null);
  const pdfCanvasContainerRef = useRef(null);

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
  
  // Switch to PDF view mode
  const handleSwitchToPdfView = useCallback(() => {
    if (onNavigate) {
      onNavigate('reader');
    }
  }, [onNavigate]);
  
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
  if (loading) {
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
          onClick={handleSwitchToPdfView}
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
          Return to PDF View
        </button>
      </div>
    );
  }
  
  // Show message if no PDF loaded
  if (!pdfDocument || plainText.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#4a5568',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📚</div>
        <h2>No PDF Content Available</h2>
        <p>{pdfDocument ? 'Text extraction failed. Please try another PDF.' : 'Please upload a PDF document to begin learning vocabulary.'}</p>
        
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0,0,0,0.05)',
          borderRadius: '5px',
          maxWidth: '600px',
          textAlign: 'left'
        }}>
          <h3>Diagnostic Information:</h3>
          <ul style={{ textAlign: 'left' }}>
            <li>PDF Document Loaded: {pdfDocument ? 'Yes' : 'No'}</li>
            <li>PDF Path: {pdfPath || 'None'}</li>
            <li>Is Initialized: {isInitialized ? 'Yes' : 'No'}</li>
            <li>Extracted Text Pages: {plainText.length}</li>
            <li>PDF Pages Processed: {pdfPages.length}</li>
            <li>Context Text Content: {contextTextContent ? contextTextContent.length : 0} pages</li>
            <li>Vocabulary Items: {Object.keys(vocabularyList).length}</li>
          </ul>
        </div>
        
        <button
          onClick={() => onNavigate('reader')}
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
          Go to PDF Reader
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: '15px 20px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e6ed',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
          Vocabulary Mode
        </h2>
        
        {/* View Mode Toggles */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          padding: '4px',
          borderRadius: '8px',
          marginLeft: '20px'
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
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {/* Settings button */}
          <button
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#4a69bd',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px'
            }}
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙️
          </button>
          
          {/* Statistics button */}
          <button
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#4a69bd',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>📊</span>
            <span>{Object.keys(vocabularyList).length} words saved</span>
          </button>
          
          {/* Vocabulary list button */}
          <button
            style={{
              backgroundColor: '#1dd1a1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            onClick={() => onNavigate('vocabulary')}
          >
            <span>📚</span>
            <span>View Vocabulary List</span>
          </button>
        </div>
      </motion.div>
      
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}
      >
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
              {/* Debug indicator - only shown in development */}
              {process.env.NODE_ENV === 'development' && (
                <div 
                  style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    zIndex: 999
                  }}
                >
                  Vocabulary: {Object.keys(vocabularyList).length} words | 
                  Page: {vocabModePage} | 
                  Mode: {viewMode}
                </div>
              )}
              
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
            
            {/* PDF Navigation will use the existing NavigationControls component */}
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
      
      {/* Navigation Controls */}
      <NavigationControls
        currentPage={vocabModePage}
        totalPages={plainText.length}
        onPageChange={handlePageChange}
        onSwitchToPdfView={handleSwitchToPdfView}
      />
      
      {/* Definition Display */}
      <DefinitionDisplay
        word={selectedWord}
        isVisible={showDefinition}
        onClose={() => setShowDefinition(false)}
        onSaved={handleWordSaved}  
        onSaveWord={handleSaveWord}
      />
      
      {/* Settings Popup */}
      <SettingsPopup
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        onHighlightingChange={handleHighlightingChange}
        initialHighlightSettings={highlightSettings}
      />
    </div>
  );
};

export default VocabularyMode;