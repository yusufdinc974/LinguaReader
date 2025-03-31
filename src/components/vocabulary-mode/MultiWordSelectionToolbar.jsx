import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MultiWordSelectionToolbar - Displays a toolbar for batch operations on selected words
 * 
 * @param {Object} props - Component props
 * @param {Array} props.selectedWords - Array of selected word objects
 * @param {Function} props.onClearSelection - Function to clear all selected words
 * @param {Function} props.onTranslateAll - Function to translate all selected words
 * @param {Function} props.onAddToVocabulary - Function to add all selected words to vocabulary
 * @param {Function} props.onSetFamiliarity - Function to set familiarity level for all selected words
 * @param {boolean} props.visible - Whether the toolbar is visible
 * @param {string} props.sourceLang - Source language of the selected words
 * @param {string} props.targetLang - Target language for translation
 */
const MultiWordSelectionToolbar = ({
  selectedWords = [],
  onClearSelection,
  onTranslateAll,
  onAddToVocabulary,
  onSetFamiliarity,
  visible = false,
  sourceLang = 'en',
  targetLang = 'es'
}) => {
  // Reference to the toolbar for positioning
  const toolbarRef = useRef(null);
  
  // State to manage toolbar position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Track whether we're showing the familiarity submenu
  const [showFamiliarityMenu, setShowFamiliarityMenu] = useState(false);

  // Update toolbar position based on selected words
  useEffect(() => {
    if (selectedWords.length > 0 && toolbarRef.current) {
      // Calculate the position based on the first selected word
      // In a real implementation, you might want to calculate this based on
      // the bounding rectangles of all selected words
      const firstWordElement = document.querySelector('.vocabulary-word.selected-word');
      
      if (firstWordElement) {
        const rect = firstWordElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position the toolbar above the first selected word
        setPosition({
          x: rect.left + scrollLeft + (rect.width / 2) - (toolbarRef.current.offsetWidth / 2),
          y: rect.top + scrollTop - toolbarRef.current.offsetHeight - 10
        });
      }
    }
  }, [selectedWords, visible]);

  // If no words are selected or toolbar is hidden, don't render anything
  if (!visible || selectedWords.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={toolbarRef}
          className="multi-word-selection-toolbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* Selected words count */}
          <div className="selected-count" style={{ marginRight: '8px', fontWeight: 'bold' }}>
            {selectedWords.length} {selectedWords.length === 1 ? 'word' : 'words'}
          </div>
          
          {/* Translate button */}
          <button
            onClick={onTranslateAll}
            className="toolbar-button"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--primary-color, #4B69FF)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Translate
          </button>
          
          {/* Add to vocabulary button */}
          <button
            onClick={onAddToVocabulary}
            className="toolbar-button"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--success, #29CC7A)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Add to Vocab
          </button>
          
          {/* Set familiarity button (with submenu) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFamiliarityMenu(!showFamiliarityMenu)}
              className="toolbar-button"
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--warning, #F7B92D)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Set Familiarity
              <span style={{ marginLeft: '4px', fontSize: '10px' }}>▼</span>
            </button>
            
            {/* Familiarity level submenu */}
            <AnimatePresence>
              {showFamiliarityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    padding: '4px',
                    marginTop: '4px',
                    zIndex: 1001,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    minWidth: '100%'
                  }}
                >
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => {
                        onSetFamiliarity(level);
                        setShowFamiliarityMenu(false);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                        ':hover': {
                          backgroundColor: '#f5f5f5'
                        }
                      }}
                    >
                      Level {level}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Clear selection button */}
          <button
            onClick={onClearSelection}
            className="toolbar-button"
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear selection"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiWordSelectionToolbar;