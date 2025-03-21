import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFContext from '../contexts/PDFContext';
import PageView from '../components/vocabulary-mode/PageView';
import DefinitionDisplay from '../components/vocabulary-mode/DefinitionDisplay';
import NavigationControls from '../components/vocabulary-mode/NavigationControls';

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
    textContent: contextTextContent  // Use existing text content from context!
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
  
  // Load vocabulary list from localStorage
  useEffect(() => {
    try {
      const savedVocabulary = localStorage.getItem('vocabularyList');
      if (savedVocabulary) {
        setVocabularyList(JSON.parse(savedVocabulary));
      }
    } catch (err) {
      console.error('Error loading vocabulary list:', err);
    }
  }, []);
  
  // Save vocabulary list to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('vocabularyList', JSON.stringify(vocabularyList));
    } catch (err) {
      console.error('Error saving vocabulary list:', err);
    }
  }, [vocabularyList]);
  
  // Handle word click
  const handleWordClick = useCallback((word) => {
    setSelectedWord(word);
    setShowDefinition(true);
  }, []);
  
  // Handle saving word to vocabulary list
  const handleSaveWord = useCallback((wordData) => {
    setVocabularyList(prev => ({
      ...prev,
      [wordData.word.toLowerCase()]: wordData
    }));
    setShowDefinition(false);
  }, []);
  
  // Handle page change
  const handlePageChange = useCallback((pageNum) => {
    setCurrentPage(pageNum);
  }, []);
  
  // Get current page content
  const currentPageContent = plainText && plainText.length > 0 
    ? plainText[currentPage - 1] || ''
    : '';
  
  // Get paragraphs for current page - this is simplified since we're using text directly
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
          color: 'var(--text-secondary)'
        }}
      >
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid var(--primary-light)',
          borderTopColor: 'var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <div>Preparing vocabulary mode...</div>
        <div style={{ 
          marginTop: '20px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
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
          color: 'var(--error)',
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
          color: 'var(--error)'
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
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
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
          color: 'var(--text-secondary)',
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
          </ul>
        </div>
        
        <button
          onClick={() => onNavigate('reader')}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
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
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
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
              color: 'var(--primary-color)',
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
              backgroundColor: 'var(--secondary-color)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
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