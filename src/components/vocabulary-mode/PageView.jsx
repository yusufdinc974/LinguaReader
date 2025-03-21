import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import WordComponent from './WordComponent';
import { extractWords, isValidWord } from '../../utils/textProcessing';

/**
 * PageView - Component to display a page of text with interactive words
 * 
 * @param {Object} props - Component props
 * @param {string} props.text - The page text content
 * @param {Array} props.paragraphs - Paragraphs data from PDF extraction
 * @param {Object} props.vocabularyState - Object containing vocabulary state/data
 * @param {Function} props.onWordClick - Function to call when a word is clicked
 */
const PageView = ({
  text = '',
  paragraphs = [],
  vocabularyState = {},
  onWordClick
}) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  
  // Get familiarity level for a word
  const getWordFamiliarity = useCallback((word) => {
    if (!word || !isValidWord(word)) return 0;
    
    const lowerWord = word.toLowerCase();
    const vocabularyItem = vocabularyState[lowerWord];
    
    return vocabularyItem ? vocabularyItem.familiarityRating : 0;
  }, [vocabularyState]);
  
  // Handle word click
  const handleWordClick = useCallback((word) => {
    if (onWordClick) onWordClick(word);
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
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
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
              const cleanedWord = word.replace(/[^\w'-]/g, '').toLowerCase();
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
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '800px',
        margin: '0 auto',
        lineHeight: 1.6,
        fontSize: '1.1rem'
      }}
    >
      {words.map((word, index) => {
        // Clean the word for lookup but keep original for display
        const originalWord = word;
        const cleanedWord = word.replace(/[^\w'-]/g, '').toLowerCase();
        const familiarity = getWordFamiliarity(cleanedWord);
        
        return (
          <React.Fragment key={index}>
            <WordComponent
              word={originalWord}
              familiarityLevel={familiarity}
              onWordClick={handleWordClick}
              onMouseEnter={() => setHoveredWord(cleanedWord)}
              onMouseLeave={() => setHoveredWord(null)}
            />
            {' '}
          </React.Fragment>
        );
      })}
    </motion.div>
  );
};

export default PageView;