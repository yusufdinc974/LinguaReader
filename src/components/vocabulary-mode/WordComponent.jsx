import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cleanWord, isValidWord } from '../../utils/textProcessing';

// Color palette options
const colorPalettes = {
  standard: [
    'transparent',                      // Level 0 - No highlight
    'rgba(255, 107, 107, 0.6)',         // Level 1 - Red
    'rgba(254, 202, 87, 0.6)',          // Level 2 - Yellow
    'rgba(72, 219, 251, 0.6)',          // Level 3 - Blue
    'rgba(29, 209, 161, 0.6)',          // Level 4 - Teal
    'rgba(136, 84, 208, 0.3)'           // Level 5 - Purple
  ],
  pastel: [
    'transparent',                      // Level 0 - No highlight
    'rgba(255, 179, 186, 0.7)',         // Level 1 - Pastel Pink
    'rgba(255, 223, 186, 0.7)',         // Level 2 - Pastel Orange
    'rgba(186, 255, 201, 0.7)',         // Level 3 - Pastel Green
    'rgba(186, 225, 255, 0.7)',         // Level 4 - Pastel Blue
    'rgba(223, 186, 255, 0.7)'          // Level 5 - Pastel Purple
  ],
  vibrant: [
    'transparent',                      // Level 0 - No highlight
    'rgba(255, 0, 0, 0.5)',             // Level 1 - Bright Red
    'rgba(255, 165, 0, 0.5)',           // Level 2 - Bright Orange
    'rgba(255, 255, 0, 0.5)',           // Level 3 - Bright Yellow
    'rgba(0, 255, 0, 0.5)',             // Level 4 - Bright Green
    'rgba(0, 0, 255, 0.5)'              // Level 5 - Bright Blue
  ]
};

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
 * @param {string} props.colorPalette - Color palette to use ('standard', 'pastel', or 'vibrant')
 * @param {Object} props.style - Additional styles to apply
 */
const WordComponent = ({
  word,
  familiarityLevel = 0,
  sourceLang = 'en',
  targetLang = 'es',
  onWordClick,
  colorPalette = 'standard',
  style = {}
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [actualFamiliarityLevel, setActualFamiliarityLevel] = useState(0);
  
  // Validate and sanitize familiarityLevel when it changes
  useEffect(() => {
    // Convert to number and ensure it's within valid range (0-5)
    const level = Number(familiarityLevel);
    const validLevel = !isNaN(level) && level >= 0 && level <= 5 ? 
      Math.floor(level) : 0;
    
    if (validLevel !== actualFamiliarityLevel) {
      setActualFamiliarityLevel(validLevel);
    }
  }, [familiarityLevel]);
  
  // Clean and validate the word
  const cleanedWord = cleanWord(word);
  const isValid = isValidWord(cleanedWord);
  
  // Handle word click
  const handleClick = useCallback(() => {
    if (isValid && onWordClick) {
      onWordClick(cleanedWord);
    }
  }, [cleanedWord, isValid, onWordClick]);
  
  // Get background color based on familiarity level
  const getBackgroundColor = () => {
    if (!isValid) return 'transparent';
    
    // Get the selected color palette
    const palette = colorPalettes[colorPalette] || colorPalettes.standard;
    
    // Use the color for the specific familiarity level
    return palette[actualFamiliarityLevel] || 'transparent';
  };
  
  // Define the tooltip content based on familiarity level
  const getTooltipText = () => {
    if (!isValid) return '';
    
    let tooltipText = '';
    
    // Add familiarity level description
    switch (actualFamiliarityLevel) {
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
    
    return tooltipText;
  };
  
  // Only make valid words interactive
  const isInteractive = isValid;
  
  // Get background color based on familiarity level
  const backgroundColor = getBackgroundColor();
  
  // Add a border color for better visibility
  const getBorderColor = () => {
    if (actualFamiliarityLevel === 0) return 'transparent';
    return backgroundColor;
  };
  
  return (
    <motion.span
      className="vocabulary-word"
      data-word={cleanedWord}
      data-familiarity={actualFamiliarityLevel}
      initial={{ backgroundColor }}
      animate={{ 
        backgroundColor,
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
        backgroundColor, // Explicitly set background color in style
        border: actualFamiliarityLevel > 0 ? `1px solid ${getBorderColor()}` : 'none',
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
      {actualFamiliarityLevel > 0 && (
        <motion.div
          className="familiarity-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: backgroundColor,
            boxShadow: '0 0 2px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            border: '1px solid white'
          }}
        />
      )}
    </motion.span>
  );
};

export default WordComponent;