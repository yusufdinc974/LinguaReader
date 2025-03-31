import React from 'react';

/**
 * MultiWordSelectionToolbar - Shows a simple translation button for selected words
 * 
 * @param {Object} props - Component props
 * @param {Array} props.selectedWords - Array of selected word objects
 * @param {Function} props.onTranslateAll - Function to translate all selected words
 * @param {Function} props.onClearSelection - Function to clear all selected words
 * @param {boolean} props.visible - Whether the toolbar is visible
 */
const MultiWordSelectionToolbar = ({
  selectedWords = [],
  onTranslateAll,
  onClearSelection,
  visible = false
}) => {
  // Don't render anything if not visible or no words selected
  if (!visible || selectedWords.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      backgroundColor: 'white',
      padding: '10px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    }}>
      <span style={{ fontSize: '14px', color: '#666' }}>
        {selectedWords.length} {selectedWords.length === 1 ? 'word' : 'words'} selected
      </span>
      <button
        onClick={() => {
          if (onTranslateAll) {
            onTranslateAll(selectedWords);
          }
          if (onClearSelection) {
            onClearSelection();
          }
        }}
        style={{
          backgroundColor: 'var(--primary-color, #4B69FF)',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>Translate</span>
        <span style={{ fontSize: '12px' }}>→</span>
      </button>
      <button
        onClick={onClearSelection}
        style={{
          backgroundColor: 'transparent',
          color: '#666',
          border: 'none',
          padding: '8px',
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
    </div>
  );
};

export default MultiWordSelectionToolbar;