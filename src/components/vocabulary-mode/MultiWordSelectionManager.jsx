import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabulary } from '../../contexts/VocabularyContext';
import MultiWordSelectionToolbar from './MultiWordSelectionToolbar';

/**
 * MultiWordSelection - Enhanced component for handling multi-word selection
 * with a floating toolbar for batch operations
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the multi-word selection UI is visible
 * @param {Function} props.onClose - Function to call when closing the selection UI
 * @param {Function} props.onTranslate - Function to request translation for selected words
 * @param {string} props.sourceLang - Source language of the document
 * @param {string} props.targetLang - Target language for translation
 */
const MultiWordSelection = ({
  visible = false,
  onClose,
  onTranslate,
  sourceLang = 'en',
  targetLang = 'en'
}) => {
  // Get vocabulary context for word operations
  const {
    selectedWords,
    clearSelectedWords,
    addWord,
    getWordDetails,
    addWordToList,
    removeWordFromList,
    getSelectedList
  } = useVocabulary();
  
  // Reference to track selection mode
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  
  // Listen for Ctrl/Cmd key to show visual indication of selection mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectionModeActive(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        setSelectionModeActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Handle case where user switches to another window while holding the key
    window.addEventListener('blur', () => setSelectionModeActive(false));
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', () => setSelectionModeActive(false));
    };
  }, []);
  
  // Handle batch translation of all selected words
  const handleTranslateAll = () => {
    if (selectedWords && selectedWords.length > 0 && onTranslate) {
      // Pass the selected words to be translated as a combined phrase
      onTranslate(selectedWords);
    } else {
      console.log('No selected words to translate or no translation handler');
    }
  };
  
  // Handle adding all selected words to vocabulary
  const handleAddToVocabulary = () => {
    if (!selectedWords || selectedWords.length === 0) return;
    
    if (selectedWords.length === 1) {
      // Single word handling
      const word = selectedWords[0];
      const existingWord = getWordDetails(word.word, word.sourceLang || sourceLang);
      
      if (!existingWord) {
        addWord({
          word: word.word,
          familiarityRating: 1, // Default rating for batch operations
          sourceLang: word.sourceLang || sourceLang,
          targetLang: targetLang,
          date: new Date().toISOString()
        });
        
        alert(`Added "${word.word}" to vocabulary!`);
      } else {
        alert(`"${word.word}" is already in your vocabulary.`);
      }
    } else {
      // Multiple words - add as a phrase
      const combinedText = selectedWords.map(w => w.word).join(' ');
      const existingWord = getWordDetails(combinedText, sourceLang);
      
      if (!existingWord) {
        addWord({
          word: combinedText,
          familiarityRating: 1,
          sourceLang: sourceLang,
          targetLang: targetLang,
          date: new Date().toISOString(),
          isPhrase: true
        });
        
        alert(`Added phrase "${combinedText}" to vocabulary!`);
      } else {
        alert(`The phrase "${combinedText}" is already in your vocabulary.`);
      }
    }
    
    // Clear selection after adding to vocabulary
    clearSelectedWords();
  };
  
  // Handle setting familiarity for all selected words
  const handleSetFamiliarity = (level) => {
    if (!selectedWords || selectedWords.length === 0) return;
    
    if (selectedWords.length === 1) {
      // Single word
      const word = selectedWords[0];
      const existingWord = getWordDetails(word.word, word.sourceLang || sourceLang);
      
      if (existingWord) {
        // Update existing word
        addWord({
          ...existingWord,
          familiarityRating: level,
          date: new Date().toISOString()
        });
      } else {
        // Add new word with specified familiarity
        addWord({
          word: word.word,
          familiarityRating: level,
          sourceLang: word.sourceLang || sourceLang,
          targetLang: targetLang,
          date: new Date().toISOString()
        });
      }
    } else {
      // For multiple words, handle each individually
      selectedWords.forEach(word => {
        const existingWord = getWordDetails(word.word, word.sourceLang || sourceLang);
        
        if (existingWord) {
          // Update existing word
          addWord({
            ...existingWord,
            familiarityRating: level,
            date: new Date().toISOString()
          });
        } else {
          // Add new word with specified familiarity
          addWord({
            word: word.word,
            familiarityRating: level,
            sourceLang: word.sourceLang || sourceLang,
            targetLang: targetLang,
            date: new Date().toISOString()
          });
        }
      });
    }
    
    alert(`Set familiarity level ${level} for ${selectedWords.length} word${selectedWords.length === 1 ? '' : 's'}!`);
    
    // Clear selection after setting familiarity
    clearSelectedWords();
  };
  
  return (
    <>
      {/* Selection Mode Indicator */}
      {selectionModeActive && (
        <div 
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'var(--primary-color, rgba(75, 105, 255, 0.9))',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          Selection Mode (Ctrl+Click words)
        </div>
      )}
      
      {/* Enhanced Selection Toolbar */}
      <MultiWordSelectionToolbar
        selectedWords={selectedWords || []}
        onClearSelection={clearSelectedWords}
        onTranslateAll={handleTranslateAll}
        onAddToVocabulary={handleAddToVocabulary}
        onSetFamiliarity={handleSetFamiliarity}
        visible={visible && selectedWords && selectedWords.length > 0}
        sourceLang={sourceLang}
        targetLang={targetLang}
      />
    </>
  );
};

export default MultiWordSelection;