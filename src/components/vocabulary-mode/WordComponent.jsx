import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cleanWord, isValidWord, getCharacterMetadata } from '../../utils/textProcessing';

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
 * Enhanced with language-specific handling for CJK languages and multi-word selection
 * 
 * @param {Object} props - Component props
 * @param {string} props.word - The word text to display
 * @param {number} props.familiarityLevel - Familiarity level (0-5) where 0 is unknown
 * @param {string} props.sourceLang - Source language of the word
 * @param {string} props.targetLang - Target language for translation
 * @param {Function} props.onWordClick - Function to call when word is clicked
 * @param {string} props.colorPalette - Color palette to use ('standard', 'pastel', or 'vibrant')
 * @param {Object} props.style - Additional styles to apply
 * @param {Object} props.metadata - Additional metadata for CJK characters (strokes, radicals, etc.)
 * @param {boolean} props.isSelected - Whether this word is currently selected
 * @param {Function} props.onSelectionChange - Function to call when selection state changes
 * @param {boolean} props.multiSelectionEnabled - Whether multi-selection mode is active
 */
const WordComponent = ({
  word,
  familiarityLevel = 0,
  sourceLang = 'en',
  targetLang = 'es',
  onWordClick,
  colorPalette = 'standard',
  style = {},
  metadata = null,
  isSelected = false,
  onSelectionChange = null,
  multiSelectionEnabled = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [actualFamiliarityLevel, setActualFamiliarityLevel] = useState(0);
  const [characterData, setCharacterData] = useState(metadata);
  const [showDetails, setShowDetails] = useState(false);
  const isCJK = ['ja', 'zh', 'ko'].includes(sourceLang);
  
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
  
  // Load character metadata for CJK languages if not provided
  useEffect(() => {
    if (isCJK && word.length === 1 && !characterData) {
      const data = getCharacterMetadata(word, sourceLang);
      setCharacterData(data);
    }
  }, [word, sourceLang, isCJK, characterData]);
  
  // Clean and validate the word based on language
  const cleanedWord = cleanWord(word, sourceLang);
  const isValid = isValidWord(cleanedWord, sourceLang);
  
  // Enhanced click handler to support Ctrl/Cmd+click for multi-selection
  const handleClick = useCallback((e) => {
    if (!isValid) return;
    
    // Check if multi-select key is pressed (Ctrl or Command)
    const isMultiSelectKey = e.ctrlKey || e.metaKey;
    
    if (multiSelectionEnabled && isMultiSelectKey && onSelectionChange) {
      // Call the selection change handler with the current state toggled
      onSelectionChange(cleanedWord, !isSelected);
      
      // Make sure to prevent default browser behavior
      e.preventDefault();
      e.stopPropagation();
    } else if (onWordClick) {
      // Regular word click behavior (translation)
      onWordClick(cleanedWord);
    }
  }, [cleanedWord, isValid, onWordClick, onSelectionChange, isSelected, multiSelectionEnabled]);
  
  // Make sure the component reacts to isSelected prop changes
  useEffect(() => {
    // This ensures the component re-renders when isSelected changes
    // You can add any selection-specific logic here if needed
  }, [isSelected]);
  
  // Handle detailed view toggle
  const handleDetailsToggle = useCallback((e) => {
    e.stopPropagation();
    setShowDetails(prev => !prev);
  }, []);
  
  // Get background color based on familiarity level and selection state
  const getBackgroundColor = () => {
    if (!isValid) return 'transparent';
    
    // If the word is selected, use a distinct highlight color
    if (isSelected) {
      return 'rgba(75, 105, 255, 0.4)'; // Selection blue - make sure this is visible enough
    }
    
    // Get the selected color palette
    const palette = colorPalettes[colorPalette] || colorPalettes.standard;
    
    // Use the color for the specific familiarity level
    return palette[actualFamiliarityLevel] || 'transparent';
  };
  
  // Define the tooltip content based on familiarity level, language, and selection state
  const getTooltipText = () => {
    if (!isValid) return '';
    
    let tooltipText = '';
    
    // Add multi-select instruction if appropriate
    if (multiSelectionEnabled && !isSelected) {
      tooltipText = 'Ctrl+Click to select';
    } else if (multiSelectionEnabled && isSelected) {
      tooltipText = 'Ctrl+Click to deselect';
    } else {
      // Standard familiarity level description
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
    }
    
    // Add character type for CJK if available
    if (isCJK && characterData && characterData.type) {
      tooltipText += ` (${characterData.type})`;
    }
    
    return tooltipText;
  };
  
  // Only make valid words interactive
  const isInteractive = isValid;
  
  // Get background color based on familiarity level and selection state
  const backgroundColor = getBackgroundColor();
  
  // Add a border color for better visibility
  const getBorderColor = () => {
    if (isSelected) {
      return 'rgba(65, 90, 255, 0.8)'; // Darker blue for selected words
    }
    
    if (actualFamiliarityLevel === 0) return 'transparent';
    return backgroundColor;
  };
  
  // Get character-specific styling for CJK languages
  const getCJKStyle = () => {
    if (!isCJK) return {};
    
    return {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2px 3px',
      margin: '0 1px',
      borderRadius: '3px',
      fontSize: sourceLang === 'zh' ? '1.2em' : '1em', // Slightly larger for Chinese
      fontWeight: sourceLang === 'ja' && characterData?.type === 'kanji' ? 'bold' : 'normal',
      lineHeight: '1.5',
      textAlign: 'center',
      verticalAlign: 'middle'
    };
  };
  
  return (
    <motion.span
      className={`
        word-component
        ${isSelected ? 'selected' : ''}
        ${familiarityLevel > 0 ? `familiarity-level-${familiarityLevel}` : ''}
        ${isCJK ? 'cjk-word' : ''}
      `}
      data-word={cleanedWord}
      data-familiarity={actualFamiliarityLevel}
      data-language={sourceLang}
      data-selected={isSelected}
      initial={{ backgroundColor }}
      animate={{ 
        backgroundColor,
        scale: isHovered ? 1.05 : 1,
        y: isHovered ? -1 : 0,
        boxShadow: isSelected ? '0 0 0 1px rgba(65, 90, 255, 0.8)' : 'none',
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
        border: (actualFamiliarityLevel > 0 || isSelected) ? `1px solid ${getBorderColor()}` : 'none',
        ...getCJKStyle(),
        ...style
      }}
    >
      {word}
      
      {/* CJK Info Button (only for single characters in CJK languages) */}
      {isCJK && word.length === 1 && isInteractive && (
        <motion.div
          className="cjk-info-button"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          onClick={handleDetailsToggle}
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#007bff',
            color: 'white',
            fontSize: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          i
        </motion.div>
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="selection-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '-7px',
            left: '-7px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.3)',
            zIndex: 20
          }}
        >
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(65, 90, 255, 1)'
            }}
          />
        </motion.div>
      )}
      
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
      
      {/* Familiarity indicator (hide when selected to avoid confusion) */}
      {actualFamiliarityLevel > 0 && !isSelected && (
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
      
      {/* Detailed Character Information (for CJK) */}
      {showDetails && isCJK && characterData && (
        <motion.div
          className="character-details-panel"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            padding: '10px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            fontSize: '12px',
            textAlign: 'left'
          }}
        >
          <div style={{ fontSize: '24px', textAlign: 'center', margin: '5px 0' }}>
            {characterData.character}
          </div>
          
          <div style={{ marginBottom: '5px' }}>
            <strong>Type:</strong> {characterData.type || 'Unknown'}
          </div>
          
          {characterData.strokes && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Strokes:</strong> {characterData.strokes}
            </div>
          )}
          
          {characterData.readings && characterData.readings.length > 0 && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Readings:</strong> {characterData.readings.join(', ')}
            </div>
          )}
          
          {characterData.meaning && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Meaning:</strong> {characterData.meaning}
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(false);
            }}
            style={{
              marginTop: '5px',
              padding: '3px 8px',
              fontSize: '11px',
              backgroundColor: '#f1f1f1',
              border: '1px solid #ddd',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </motion.div>
      )}
    </motion.span>
  );
};

export default WordComponent;