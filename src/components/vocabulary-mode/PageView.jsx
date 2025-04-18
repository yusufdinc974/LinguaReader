import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import WordComponent from './WordComponent';
import MultiWordSelection from './MultiWordSelection';
import { extractWords, isValidWord, cleanWord, detectLanguage } from '../../utils/textProcessing';
import { prepareTextForDisplay, filterCJKSegments } from '../../utils/pdfExtraction';
import { useVocabulary } from '../../contexts/VocabularyContext';

/**
 * PageView - Component to display a page of text with interactive words
 * Enhanced for CJK languages and multi-word selection
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - The page text content
 * @param {Array} props.paragraphs - Paragraphs data from PDF extraction
 * @param {Object} props.vocabularyState - Object containing vocabulary state/data
 * @param {Object} props.highlightSettings - Settings for word highlighting
 * @param {Function} props.onWordClick - Function to call when a word is clicked
 * @param {Array} props.selectedWords - Array of currently selected words (optional)
 * @param {Function} props.onSelectionChange - Function for multi-word selection (optional)
 * @param {boolean} props.multiSelectionEnabled - Whether multi-selection is enabled (optional)
 * @param {boolean} props.selectionModeActive - Whether selection mode is active (optional)
 * @param {Function} props.onTranslateSelection - Function to translate selected words (optional)
 */
const PageView = ({
  text = '',
  paragraphs = [],
  vocabularyState = {},
  highlightSettings = { enabled: true, listOnly: false },
  onWordClick,
  selectedWords: externalSelectedWords = null,
  onSelectionChange = null,
  multiSelectionEnabled = false,
  selectionModeActive = false,
  onTranslateSelection = null
}) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [pageLanguage, setPageLanguage] = useState('en');
  const [processedSegments, setProcessedSegments] = useState([]);
  const [filteredSegments, setFilteredSegments] = useState([]);
  const [selectionVisible, setSelectionVisible] = useState(false);
  // Add local state for more immediate visual feedback
  const [localSelectedMap, setLocalSelectedMap] = useState({});
  
  const { 
    addToSelectedWords, 
    selectedWords: contextSelectedWords, 
    clearSelectedWords,
    setSelectedWords: setContextSelectedWords,
    removeFromSelectedWords
  } = useVocabulary();
  
  // Use either external or context selected words
  const selectedWords = externalSelectedWords !== null ? externalSelectedWords : contextSelectedWords;
  
  // Detect language and process text
  useEffect(() => {
    if (text) {
      const detectedLanguage = detectLanguage(text);
      setPageLanguage(detectedLanguage);
      console.log('PageView detected language:', detectedLanguage);
      
      // Process text based on language
      const segments = prepareTextForDisplay(text, detectedLanguage);
      setProcessedSegments(segments);
      
      // Apply filtering for Korean content to handle mixed language issues
      if (detectedLanguage === 'ko') {
        const filtered = filterCJKSegments(segments, detectedLanguage);
        setFilteredSegments(filtered);
      } else {
        setFilteredSegments(segments);
      }
    }
  }, [text]);
  
  // Show selection toolbar when words are selected
  useEffect(() => {
    setSelectionVisible(selectedWords && selectedWords.length > 0);
  }, [selectedWords]);
  
  // Log vocabulary state and highlighting settings when they change
  useEffect(() => {
    const wordCount = vocabularyState ? 
      (Array.isArray(vocabularyState) ? vocabularyState.length : Object.keys(vocabularyState).length) : 0;
    
    console.log(`PageView received vocabulary state with ${wordCount} items`);
    console.log('Highlighting settings:', highlightSettings);
    console.log('Current language:', pageLanguage);
  }, [vocabularyState, highlightSettings, pageLanguage]);
  
  // Get familiarity level for a word, respecting highlighting settings
  const getWordFamiliarity = useCallback((word, language = 'en') => {
    // If highlighting is disabled, return 0 (no highlighting)
    if (!highlightSettings || !highlightSettings.enabled) {
      return 0;
    }
    
    if (!word) return 0;
    
    // For CJK languages, we need different validation
    const isValid = ['ja', 'zh', 'ko'].includes(language) ? 
      word.trim().length > 0 : isValidWord(word);
    
    if (!isValid) return 0;
    
    // Clean the word to match the format in vocabulary
    // For CJK languages, don't lowercase or modify
    const cleanedWord = ['ja', 'zh', 'ko'].includes(language) ? 
      word : cleanWord(word);
    
    if (!cleanedWord) return 0;
    
    let vocabularyItem = null;
    
    // Try direct lookup by word as key
    if (typeof vocabularyState === 'object' && !Array.isArray(vocabularyState)) {
      const itemKey = ['ja', 'zh', 'ko'].includes(language) ? 
        cleanedWord : cleanedWord.toLowerCase();
      
      const item = vocabularyState[itemKey];
      if (item) {
        vocabularyItem = item;
      } else {
        // Try search through all values
        for (const key in vocabularyState) {
          const value = vocabularyState[key];
          if (value && value.word) {
            const valueWord = ['ja', 'zh', 'ko'].includes(language) ?
              value.word : cleanWord(value.word);
            
            if (valueWord === cleanedWord || 
                (!['ja', 'zh', 'ko'].includes(language) && valueWord === cleanedWord.toLowerCase())) {
              vocabularyItem = value;
              break;
            }
          }
        }
      }
    }
    
    // Handle array format
    if (!vocabularyItem && Array.isArray(vocabularyState)) {
      for (const item of vocabularyState) {
        if (item && item.word) {
          const itemWord = ['ja', 'zh', 'ko'].includes(language) ?
            item.word : cleanWord(item.word);
          
          if (itemWord === cleanedWord || 
              (!['ja', 'zh', 'ko'].includes(language) && itemWord === cleanedWord.toLowerCase())) {
            vocabularyItem = item;
            break;
          }
        }
      }
    }
    
    // If we found a vocabulary item
    if (vocabularyItem) {
      // If listOnly is enabled, check if the word is in the selected list
      if (highlightSettings.listOnly && highlightSettings.selectedListId) {
        // Check if the word is in the currently selected list
        const isInSelectedList = vocabularyItem.lists && 
                                Array.isArray(vocabularyItem.lists) && 
                                vocabularyItem.lists.includes(highlightSettings.selectedListId);
        
        if (!isInSelectedList) {
          return 0; // Don't highlight if not in selected list
        }
      }
      
      const rating = parseInt(vocabularyItem.familiarityRating || 0, 10);
      return rating;
    }
    
    return 0;
  }, [vocabularyState, highlightSettings]);
  
  // Enhanced word click handler to support multi-word selection
  const handleWordClick = useCallback((word, language = pageLanguage) => {
    if (!word) return;
    
    // Create a word object with language info
    const wordData = {
      word: typeof word === 'string' ? word : String(word), // Ensure word is a string
      sourceLang: language || pageLanguage,
      targetLang: 'en', // Default target language
    };
    
    if (onWordClick) {
      // If using the external handler, use it
      onWordClick(wordData);
    } else {
      // Regular word click behavior for translation
      console.log('Word clicked:', wordData);
    }
  }, [onWordClick, pageLanguage]);
  
  // IMPROVED: Enhanced word selection handler with better position tracking
  const handleSelectionChange = useCallback((word, isSelected, language = pageLanguage, pageIndex, wordIndex) => {
    if (!word) return;
    
    // Create a unique position identifier
    const positionKey = `${pageIndex || 0}_${wordIndex || 0}`;
    
    // Create a word object with necessary info and position
    const wordData = {
      id: `word-${positionKey}-${word}`, // More predictable ID
      word: typeof word === 'string' ? word : String(word), // Ensure word is a string
      sourceLang: language || pageLanguage,
      targetLang: 'en', // Default target language
      position: {
        pageIndex: pageIndex || 0,
        wordIndex: wordIndex || 0
      }
    };
    
    // Update local selection map for immediate visual feedback
    if (isSelected) {
      setLocalSelectedMap(prev => ({
        ...prev,
        [positionKey]: true
      }));
    } else {
      setLocalSelectedMap(prev => {
        const newMap = { ...prev };
        delete newMap[positionKey];
        return newMap;
      });
    }
    
    if (onSelectionChange) {
      // If using external selection handler, use it
      onSelectionChange(wordData, isSelected);
    } else {
      // Use context-based selection if no external handler
      if (isSelected) {
        // Add to selected words
        addToSelectedWords(wordData);
      } else {
        // Remove from selected words - using the improved removeFromSelectedWords
        removeFromSelectedWords(wordData);
      }
    }
  }, [addToSelectedWords, removeFromSelectedWords, pageLanguage, onSelectionChange]);
  
  // IMPROVED: Check if a word is selected with better position checking
  const isWordSelected = useCallback((word, pageIndex, wordIndex) => {
    if (!word) return false;
    
    // Check local selection map first for immediate feedback
    const positionKey = `${pageIndex || 0}_${wordIndex || 0}`;
    if (localSelectedMap[positionKey]) return true;
    
    // Exit early if no selected words
    if (!selectedWords || selectedWords.length === 0) return false;
    
    // Clean the word for more accurate comparison
    const cleanedWord = cleanWord(word, pageLanguage);
    
    return selectedWords.some(selectedWord => {
      // Handle different types of selectedWord objects
      if (typeof selectedWord === 'string') {
        return cleanWord(selectedWord, pageLanguage) === cleanedWord;
      }
      
      if (!selectedWord) return false;
      
      // Get the word text from the selected word object
      const selectedText = selectedWord.word || selectedWord.text || selectedWord;
      if (!selectedText) return false;
      
      // Check for exact text match first
      const selectedCleanedText = cleanWord(selectedText, pageLanguage);
      if (selectedCleanedText === cleanedWord) {
        // If we have position data, verify it matches
        if (selectedWord.position) {
          // Check both pageIndex and wordIndex for precise matching
          return (
            selectedWord.position.pageIndex === pageIndex && 
            selectedWord.position.wordIndex === wordIndex
          );
        }
        return true; // Text matches and no position to check
      }
      
      return false;
    });
  }, [selectedWords, pageLanguage, localSelectedMap]);
  
  // Handle legacy selectWord function
  const handleSelectWord = useCallback((word, language = pageLanguage) => {
    // Create a word object with necessary info
    const wordData = {
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      word: typeof word === 'string' ? word : String(word), // Ensure word is a string
      sourceLang: language || pageLanguage,
      targetLang: 'en', // Default target language
    };
    
    addToSelectedWords(wordData);
  }, [addToSelectedWords, pageLanguage]);
  
  // UPDATED: Handle translation of selected words with auto-clear
  const handleTranslateSelection = useCallback((words) => {
    if (onTranslateSelection) {
      // Call external translation handler
      onTranslateSelection(words);
      
      // Clear selections after translation
      clearSelectedWords();
      setLocalSelectedMap({});
    } else if (onWordClick && words && words.length > 0) {
      // Fallback to clicking the first word
      const combinedWord = {
        word: words.map(w => w.word).join(' '),
        sourceLang: pageLanguage,
        targetLang: 'en',
        isMultiWord: true
      };
      
      onWordClick(combinedWord);
      
      // Clear selections after translation
      clearSelectedWords();
      setLocalSelectedMap({});
    }
  }, [onTranslateSelection, onWordClick, pageLanguage, clearSelectedWords]);
  
  // This function filters out problematic content in Korean PDFs
  const renderProcessedSegments = useCallback((segments, language) => {
    if (!segments || segments.length === 0) {
      return null;
    }
    
    // For Korean documents, we need additional filtering for embedded English
    if (language === 'ko') {
      // Check if we have Korean characters in the document
      const hasKoreanChars = segments.some(segment => 
        segment.type === 'word' && /[\uAC00-\uD7AF]/.test(segment.content)
      );
      
      if (hasKoreanChars) {
        // Find and skip segments that are likely web addresses, emails, etc.
        // This is now handled by the filterCJKSegments function in pdfExtraction.js
        return segments;
      }
    }
    
    // For other languages, return the segments as is
    return segments;
  }, []);
  
  // Render based on processed segments
  if (filteredSegments && filteredSegments.length > 0) {
    // Use the renderProcessedSegments function to filter out problematic content
    const displaySegments = renderProcessedSegments(filteredSegments, pageLanguage);
    
    if (!displaySegments || displaySegments.length === 0) {
      return <div className="page-content empty-page">No content could be displayed for this page.</div>;
    }
    
    return (
      <motion.div
        className="page-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          padding: '15px 20px',
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: '5px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          height: '100%',
          // Remove maxHeight and overflowY to prevent double scrollbars
          // maxHeight: '80vh',
          // overflowY: 'auto',
          // Apply different writing modes based on language
          writingMode: (pageLanguage === 'ja' || pageLanguage === 'zh' || pageLanguage === 'ko') && highlightSettings.verticalText ? 'vertical-rl' : 'horizontal-tb',
        }}
      >
        {displaySegments.map((segment, index) => {
          if (segment.type === 'linebreak') {
            return <br key={`br-${index}`} />;
          }
          
          if (segment.type === 'space') {
            return <span key={`space-${index}`}> </span>;
          }
          
          if (segment.type === 'character' || segment.type === 'word') {
            const familiarityLevel = getWordFamiliarity(segment.content, segment.language || pageLanguage);
            const pageIdx = 0; // Single page view
            
            return (
              <WordComponent
                key={`segment-${index}`}
                word={segment.content}
                familiarityLevel={familiarityLevel}
                sourceLang={segment.language || pageLanguage}
                targetLang="en" // Default target language
                onWordClick={() => handleWordClick(segment.content, segment.language)}
                colorPalette={highlightSettings?.colorPalette || 'standard'}
                style={{ 
                  display: 'inline-block',
                  // Special styling for CJK characters
                  ...((['ja', 'zh', 'ko'].includes(segment.language || pageLanguage) && 
                      segment.type === 'character') ? {
                    margin: '0 1px',
                    padding: '0 2px'
                  } : {})
                }}
                // IMPROVED: Better selection state and handling
                isSelected={isWordSelected(segment.content, pageIdx, index)}
                onSelectionChange={(word, selected) => 
                  handleSelectionChange(word, selected, segment.language, pageIdx, index)
                }
                multiSelectionEnabled={multiSelectionEnabled}
                onMouseEnter={() => setHoveredWord(segment.content)}
                onMouseLeave={() => setHoveredWord(null)}
              />
            );
          }
          
          return null;
        })}
        
        {/* Multi-word selection toolbar */}
        <MultiWordSelection 
          visible={selectionVisible}
          onClose={() => {
            clearSelectedWords();
            setLocalSelectedMap({}); // Clear local map too
          }}
          onTranslate={handleTranslateSelection}
          sourceLang={pageLanguage}
          targetLang="en"
        />
        
        {/* Selection mode visual hint */}
        {multiSelectionEnabled && selectionModeActive && (
          <div className="selection-mode-hint" style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            border: '2px dashed rgba(75, 105, 255, 0.5)',
            pointerEvents: 'none',
            zIndex: 1
          }}/>
        )}
      </motion.div>
    );
  }
  
  // If we have paragraphs data, use it for better formatting
  if (paragraphs && paragraphs.length > 0) {
    return (
      <motion.div
        className="page-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          padding: '15px 20px',
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: '5px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          height: '100%',
          // Remove maxHeight and overflowY to prevent double scrollbars
          // maxHeight: '80vh',
          // overflowY: 'auto',
          // Apply different writing modes based on language
          writingMode: (pageLanguage === 'ja' || pageLanguage === 'zh' || pageLanguage === 'ko') && highlightSettings.verticalText ? 'vertical-rl' : 'horizontal-tb',
        }}
      >
        {paragraphs.map((paragraph, paragraphIndex) => {
          // Skip paragraphs with embedded English in Korean text
          if (pageLanguage === 'ko' && paragraph.isEmbeddedEnglish) {
            return null;
          }
          
          return (
            <div
              key={paragraphIndex}
              style={{
                marginBottom: '1rem'
              }}
            >
              {paragraph.text.split(' ').map((word, wordIndex) => {
                // Clean the word for lookup but keep original for display
                const originalWord = word;
                const cleanedWord = cleanWord(word, pageLanguage);
                const familiarity = getWordFamiliarity(cleanedWord, pageLanguage);
                
                // Check if this is the last word in the paragraph
                const isLastWord = wordIndex === paragraph.text.split(' ').length - 1;
                
                return (
                  <React.Fragment key={`${paragraphIndex}-${wordIndex}`}>
                    <WordComponent
                      word={originalWord}
                      familiarityLevel={familiarity}
                      sourceLang={pageLanguage}
                      onWordClick={() => handleWordClick(originalWord)}
                      onSelectWord={() => handleSelectWord(originalWord)}
                      onMouseEnter={() => setHoveredWord(cleanedWord)}
                      onMouseLeave={() => setHoveredWord(null)}
                      colorPalette={highlightSettings?.colorPalette || 'standard'}
                      // IMPROVED: Better selection state and handling
                      isSelected={isWordSelected(originalWord, paragraphIndex, wordIndex)}
                      onSelectionChange={(word, selected) => 
                        handleSelectionChange(word, selected, pageLanguage, paragraphIndex, wordIndex)
                      }
                      multiSelectionEnabled={multiSelectionEnabled}
                    />
                    {!isLastWord && ' '}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
        
        {/* Multi-word selection toolbar */}
        <MultiWordSelection 
          visible={selectionVisible}
          onClose={() => {
            clearSelectedWords();
            setLocalSelectedMap({}); // Clear local map too
          }}
          onTranslate={handleTranslateSelection}
          sourceLang={pageLanguage}
          targetLang="en"
        />
        
        {/* Selection mode visual hint */}
        {multiSelectionEnabled && selectionModeActive && (
          <div className="selection-mode-hint" style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            border: '2px dashed rgba(75, 105, 255, 0.5)',
            pointerEvents: 'none',
            zIndex: 1
          }}/>
        )}
      </motion.div>
    );
  }
  
  // Fallback to simple text rendering if no paragraph data
  // For Korean, filter out English text
  let displayText = text;
  if (pageLanguage === 'ko') {
    // Simple filter to remove lines that look like URLs or addresses
    displayText = text.split('\n')
      .filter(line => !(
        line.includes('http') || 
        line.includes('www.') || 
        line.includes('.com') || 
        (line.match(/^[a-zA-Z0-9\s.,;:!?"'()\-]+$/) && line.includes('.'))
      ))
      .join('\n');
  }
  
  const words = displayText.split(' ');
  
  return (
    <motion.div
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        padding: '15px 20px',
        backgroundColor: 'var(--surface-secondary)',
        borderRadius: '5px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        height: '100%',
        // Remove maxHeight and overflowY to prevent double scrollbars
        // maxHeight: '80vh',
        // overflowY: 'auto',
        // Apply different writing modes based on language
        writingMode: (pageLanguage === 'ja' || pageLanguage === 'zh' || pageLanguage === 'ko') && highlightSettings.verticalText ? 'vertical-rl' : 'horizontal-tb',
      }}
    >
      {words.map((word, index) => {
        // Skip empty words
        if (!word.trim()) return null;
        
        // Clean the word for lookup but keep original for display
        const originalWord = word;
        const cleanedWord = cleanWord(word, pageLanguage);
        const familiarity = getWordFamiliarity(cleanedWord, pageLanguage);
        const pageIdx = 0; // Single page view
        
        return (
          <React.Fragment key={index}>
            <WordComponent
              word={originalWord}
              familiarityLevel={familiarity}
              sourceLang={pageLanguage}
              onWordClick={() => handleWordClick(originalWord)}
              onSelectWord={() => handleSelectWord(originalWord)}
              onMouseEnter={() => setHoveredWord(cleanedWord)}
              onMouseLeave={() => setHoveredWord(null)}
              colorPalette={highlightSettings?.colorPalette || 'standard'}
              // IMPROVED: Better selection state and handling
              isSelected={isWordSelected(originalWord, pageIdx, index)}
              onSelectionChange={(word, selected) => 
                handleSelectionChange(word, selected, pageLanguage, pageIdx, index)
              }
              multiSelectionEnabled={multiSelectionEnabled}
            />
            {' '}
          </React.Fragment>
        );
      })}
      
      {/* Multi-word selection toolbar */}
      <MultiWordSelection 
        visible={selectionVisible}
        onClose={() => {
          clearSelectedWords();
          setLocalSelectedMap({}); // Clear local map too
        }}
        onTranslate={handleTranslateSelection}
        sourceLang={pageLanguage}
        targetLang="en"
      />
      
      {/* Selection mode visual hint */}
      {multiSelectionEnabled && selectionModeActive && (
        <div className="selection-mode-hint" style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          border: '2px dashed rgba(75, 105, 255, 0.5)',
          pointerEvents: 'none',
          zIndex: 1
        }}/>
      )}
    </motion.div>
  );
};

export default PageView;