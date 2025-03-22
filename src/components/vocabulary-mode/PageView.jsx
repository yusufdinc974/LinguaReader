import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import WordComponent from './WordComponent';
import { extractWords, isValidWord, cleanWord } from '../../utils/textProcessing';

/**
 * PageView - Component to display a page of text with interactive words
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - The page text content
 * @param {Array} props.paragraphs - Paragraphs data from PDF extraction
 * @param {Object} props.vocabularyState - Object containing vocabulary state/data
 * @param {Object} props.highlightSettings - Settings for word highlighting
 * @param {Function} props.onWordClick - Function to call when a word is clicked
 */
const PageView = ({
  text = '',
  paragraphs = [],
  vocabularyState = {},
  highlightSettings = { enabled: true, listOnly: false },
  onWordClick
}) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  
  // Log vocabulary state and highlighting settings when they change
  useEffect(() => {
    const wordCount = vocabularyState ? 
      (Array.isArray(vocabularyState) ? vocabularyState.length : Object.keys(vocabularyState).length) : 0;
    
    console.log(`PageView received vocabulary state with ${wordCount} items`);
    console.log('Highlighting settings:', highlightSettings);
    
    // Log a sample of vocabulary items
    if (wordCount > 0) {
      if (Array.isArray(vocabularyState)) {
        console.log('Sample vocabulary items (array):', vocabularyState.slice(0, 3));
      } else {
        const keys = Object.keys(vocabularyState).slice(0, 3);
        const sample = {};
        keys.forEach(key => {
          sample[key] = vocabularyState[key];
        });
        console.log('Sample vocabulary items (object):', sample);
      }
    }
  }, [vocabularyState, highlightSettings]);
  
  // Get familiarity level for a word, respecting highlighting settings
  const getWordFamiliarity = useCallback((word) => {
    // If highlighting is disabled, return 0 (no highlighting)
    if (!highlightSettings || !highlightSettings.enabled) {
      return 0;
    }
    
    if (!word || !isValidWord(word)) return 0;
    
    // Clean the word to match the format in vocabulary
    const cleanedWord = cleanWord(word);
    if (!cleanedWord) return 0;
    
    let vocabularyItem = null;
    
    // Try direct lookup by word as key
    if (typeof vocabularyState === 'object' && !Array.isArray(vocabularyState)) {
      const item = vocabularyState[cleanedWord] || vocabularyState[cleanedWord.toLowerCase()];
      if (item) {
        vocabularyItem = item;
      } else {
        // Try search through all values
        for (const key in vocabularyState) {
          const value = vocabularyState[key];
          if (value && value.word) {
            const valueWord = cleanWord(value.word);
            if (valueWord === cleanedWord || valueWord === cleanedWord.toLowerCase()) {
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
          const itemWord = cleanWord(item.word);
          if (itemWord === cleanedWord || itemWord === cleanedWord.toLowerCase()) {
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
        // Debug information
        console.log(`Checking if word "${cleanedWord}" is in list ${highlightSettings.selectedListId}`);
        console.log(`Word lists:`, vocabularyItem.lists);
        
        // Check if the word is in the currently selected list
        const isInSelectedList = vocabularyItem.lists && 
                                Array.isArray(vocabularyItem.lists) && 
                                vocabularyItem.lists.includes(highlightSettings.selectedListId);
        
        if (!isInSelectedList) {
          console.log(`Word "${cleanedWord}" is NOT in the selected list`);
          return 0; // Don't highlight if not in selected list
        } else {
          console.log(`Word "${cleanedWord}" IS in the selected list`);
        }
      }
      
      const rating = parseInt(vocabularyItem.familiarityRating || 0, 10);
      if (rating > 0) {
        console.log(`Found word "${cleanedWord}" with familiarity ${rating}`);
      }
      return rating;
    }
    
    return 0;
  }, [vocabularyState, highlightSettings]);
  
  // Handle word click
  const handleWordClick = useCallback((word) => {
    if (onWordClick && word) {
      onWordClick(word);
    }
  }, [onWordClick]);
  
  // If we have paragraphs data, use it for better formatting
  if (paragraphs && paragraphs.length > 0) {
    return (
      <motion.div
        className="page-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.08)',
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: 1.6,
          fontSize: '1.1rem'
        }}
      >
        {paragraphs.map((paragraph, paragraphIndex) => (
          <div
            key={paragraphIndex}
            style={{
              marginBottom: '1rem'
            }}
          >
            {paragraph.text.split(' ').map((word, wordIndex) => {
              // Clean the word for lookup but keep original for display
              const originalWord = word;
              const cleanedWord = cleanWord(word);
              const familiarity = getWordFamiliarity(cleanedWord);
              
              // Check if this is the last word in the paragraph
              const isLastWord = wordIndex === paragraph.text.split(' ').length - 1;
              
              return (
                <React.Fragment key={`${paragraphIndex}-${wordIndex}`}>
                  <WordComponent
                    word={originalWord}
                    familiarityLevel={familiarity}
                    onWordClick={handleWordClick}
                    onMouseEnter={() => setHoveredWord(cleanedWord)}
                    onMouseLeave={() => setHoveredWord(null)}
                    colorPalette={highlightSettings?.colorPalette || 'standard'}
                  />
                  {!isLastWord && ' '}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </motion.div>
    );
  }
  
  // Fallback to simple text rendering if no paragraph data
  const words = text.split(' ');
  
  return (
    <motion.div
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.08)',
        maxWidth: '800px',
        margin: '0 auto',
        lineHeight: 1.6,
        fontSize: '1.1rem'
      }}
    >
      {words.map((word, index) => {
        // Clean the word for lookup but keep original for display
        const originalWord = word;
        const cleanedWord = cleanWord(word);
        const familiarity = getWordFamiliarity(cleanedWord);
        
        return (
          <React.Fragment key={index}>
            <WordComponent
              word={originalWord}
              familiarityLevel={familiarity}
              onWordClick={handleWordClick}
              onMouseEnter={() => setHoveredWord(cleanedWord)}
              onMouseLeave={() => setHoveredWord(null)}
              colorPalette={highlightSettings?.colorPalette || 'standard'}
            />
            {' '}
          </React.Fragment>
        );
      })}
    </motion.div>
  );
};

export default PageView;