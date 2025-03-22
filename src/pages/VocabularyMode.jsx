import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PageView from '../components/vocabulary-mode/PageView';
import DefinitionDisplay from '../components/vocabulary-mode/DefinitionDisplay';
import NavigationControls from '../components/vocabulary-mode/NavigationControls';
import * as storageService from '../services/storageService';

/**
 * VocabularyMode - Page component for vocabulary-focused PDF reading
 * Extracts text from PDF and presents it in a word-by-word interactive format
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
    textContent: contextTextContent
  } = useContext(PDFContext);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showDefinition, setShowDefinition] = useState(false);
  const [vocabularyList, setVocabularyList] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [plainText, setPlainText] = useState([]);
  const [pdfPages, setPdfPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // On component mount/unmount
  useEffect(() => {
    console.log('VocabularyMode mounted');
    
    // Initialize storage on mount
    storageService.initializeStorage();
    
    return () => {
      isMounted.current = false;
      console.log('VocabularyMode unmounted');
    };
  }, []);
  
  // When PDF document or path changes
  useEffect(() => {
    if (pdfDocument && isMounted.current) {
      console.log('PDF document or path changed in VocabularyMode');
      
      setCurrentPage(1);
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
      } else {
        console.log('No text content available in context, setting error state');
        setError(new Error('No text content available'));
        setLoading(false);
      }
    }
  }, [pdfDocument, pdfPath, contextTextContent]);
  
  // Load vocabulary list from storage service
  useEffect(() => {
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
  
  // Handle page change
  const handlePageChange = useCallback((pageNum) => {
    const validPage = Math.max(1, Math.min(pageNum, plainText.length));
    setCurrentPage(validPage);
  }, [plainText.length]);
  
  // Get current page content
  const currentPageContent = plainText && plainText.length > 0 
    ? plainText[currentPage - 1] || ''
    : '';
  
  // Get paragraphs for current page
  const getParagraphsForPage = useCallback((pageNumber) => {
    const index = pageNumber - 1;
    if (index >= 0 && index < pdfPages.length) {
      return pdfPages[index]?.content?.paragraphs || [];
    }
    return [];
  }, [pdfPages]);
  
  const currentPageParagraphs = getParagraphsForPage(currentPage);
  
  // Switch to PDF view mode
  const handleSwitchToPdfView = useCallback(() => {
    if (onNavigate) {
      onNavigate('reader');
    }
  }, [onNavigate]);
  
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Debug indicator for vocabulary count */}
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
              Vocabulary: {Object.keys(vocabularyList).length} words
            </div>
            
            <PageView
              text={currentPageContent}
              paragraphs={currentPageParagraphs}
              vocabularyState={vocabularyList}
              onWordClick={handleWordClick}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation Controls */}
      <NavigationControls
        currentPage={currentPage}
        totalPages={plainText.length}
        onPageChange={handlePageChange}
        onSwitchToPdfView={handleSwitchToPdfView}
      />
      
      {/* Definition Display */}
      <DefinitionDisplay
        word={selectedWord}
        isVisible={showDefinition}
        onClose={() => setShowDefinition(false)}
        onSaveWord={handleSaveWord}
      />
    </div>
  );
};

export default VocabularyMode;