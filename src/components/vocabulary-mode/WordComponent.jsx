import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cleanWord, isValidWord } from '../../utils/textProcessing';

/**
 * WordComponent - An interactive word display for vocabulary learning
 * Enhanced with language-specific handling
 * 
 * @param {Object} props - Component props
 * @param {string} props.word - The word text to display
 * @param {number} props.familiarityLevel - Familiarity level (0-5) where 0 is unknown
 * @param {string} props.sourceLang - Source language of the word
 * @param {string} props.targetLang - Target language for translation
 * @param {Function} props.onWordClick - Function to call when word is clicked
 * @param {Function} props.onUpdateFamiliarity - Function to call when familiarity is updated
 * @param {Object} props.style - Additional styles to apply
 */
const WordComponent = ({
  word,
  familiarityLevel = 0,
  sourceLang = 'en',
  targetLang = 'es',
  onWordClick,
  onUpdateFamiliarity,
  style = {}
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Clean and validate the word
  const cleanedWord = cleanWord(word);
  const isValid = isValidWord(cleanedWord);
  
  // Handle word click
  const handleClick = useCallback(() => {
    if (isValid && onWordClick) {
      // Pass language information to click handler
      onWordClick(cleanedWord, sourceLang, targetLang);
    }
  }, [cleanedWord, isValid, onWordClick, sourceLang, targetLang]);
  
  // Get background color based on familiarity level
  const getBackgroundColor = () => {
    if (!isValid) return 'transparent';
    
    switch (familiarityLevel) {
      case 1:
        return 'var(--highlight-level-1)';
      case 2:
        return 'var(--highlight-level-2)';
      case 3:
        return 'var(--highlight-level-3)';
      case 4:
        return 'var(--highlight-level-4)';
      case 5:
        return 'var(--highlight-level-5)';
      default:
        return isHovered ? 'rgba(0, 0, 0, 0.05)' : 'transparent';
    }
  };
  
  // Define the tooltip content based on familiarity level
  const getTooltipText = () => {
    if (!isValid) return '';
    
    let tooltipText = '';
    
    // Add familiarity level description
    switch (familiarityLevel) {
      case 1:
        tooltipText = 'Just learned';
        break;
      case 2:
        tooltipText = 'Still learning';
        break;
      case 3:
        tooltipText = 'Familiar';
        break;
      case 4:
        tooltipText = 'Well known';
        break;
      case 5:
        tooltipText = 'Mastered';
        break;
      default:
        tooltipText = 'Click for translation';
    }
    
    // Add language info if available
    if (sourceLang && targetLang && sourceLang !== targetLang) {
      const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean'
      };
      
      const sourceLanguageName = languageNames[sourceLang] || sourceLang;
      const targetLanguageName = languageNames[targetLang] || targetLang;
      
      tooltipText += ` (${sourceLanguageName}→${targetLanguageName})`;
    }
    
    return tooltipText;
  };
  
  // Only make valid words interactive
  const isInteractive = isValid;
  
  return (
    <motion.span
      className="vocabulary-word"
      data-source-lang={sourceLang}
      data-target-lang={targetLang}
      initial={{ backgroundColor: getBackgroundColor() }}
      animate={{ 
        backgroundColor: getBackgroundColor(),
        scale: isHovered ? 1.05 : 1,
        y: isHovered ? -1 : 0
      }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        padding: '0 2px',
        borderRadius: '3px',
        cursor: isInteractive ? 'pointer' : 'default',
        display: 'inline-block',
        position: 'relative',
        ...style
      }}
    >
      {word}
      
      {/* Tooltip */}
      {isHovered && isInteractive && (
        <motion.div
          className="word-tooltip"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'normal',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            marginBottom: '5px'
          }}
        >
          {getTooltipText()}
          
          {/* Tooltip arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(0, 0, 0, 0.8)'
            }}
          />
        </motion.div>
      )}
      
      {/* Familiarity indicator */}
      {familiarityLevel > 0 && (
        <motion.div
          className="familiarity-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: `var(--highlight-level-${familiarityLevel})`,
            boxShadow: '0 0 2px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* Language indicator for non-default language pairs */}
      {sourceLang && targetLang && sourceLang !== 'en' && (
        <motion.div
          className="language-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-color)',
            boxShadow: '0 0 2px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none'
          }}
        />
      )}
    </motion.span>
  );
};

export default WordComponent;