import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVocabulary } from '../../contexts/VocabularyContext';

/**
 * HighlightingControls - Component for controlling word highlighting options
 * Allows toggling between all words and only words from the selected list
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onHighlightingChange - Callback when highlighting options change
 */
const HighlightingControls = ({ onHighlightingChange }) => {
  const { vocabularyLists, selectedListId, getSelectedList } = useVocabulary();
  const [highlightListOnly, setHighlightListOnly] = useState(false);
  const [highlightingEnabled, setHighlightingEnabled] = useState(true);
  
  // Get the selected list name
  const selectedList = getSelectedList();
  const listName = selectedList ? selectedList.name : 'No list selected';
  
  // Handle highlighting toggle
  const toggleHighlightListOnly = () => {
    const newValue = !highlightListOnly;
    setHighlightListOnly(newValue);
    
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: newValue
      });
    }
  };
  
  // Handle enabling/disabling highlighting
  const toggleHighlighting = () => {
    const newValue = !highlightingEnabled;
    setHighlightingEnabled(newValue);
    
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: newValue,
        listOnly: highlightListOnly
      });
    }
  };
  
  // Update when selected list changes
  useEffect(() => {
    // When list selection changes, notify parent
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: highlightListOnly
      });
    }
  }, [selectedListId, onHighlightingChange, highlightingEnabled, highlightListOnly]);
  
  return (
    <div
      style={{
        padding: '10px 15px',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        marginBottom: '15px'
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Highlighting Controls</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Master highlighting toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <label
              htmlFor="highlight-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span>Enable Word Highlighting</span>
            </label>
          </div>
          
          <div>
            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
              <input
                id="highlight-toggle"
                type="checkbox"
                checked={highlightingEnabled}
                onChange={toggleHighlighting}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span 
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: highlightingEnabled ? 'var(--primary-color)' : '#ccc',
                  transition: '.4s',
                  borderRadius: '34px'
                }}
              >
                <span 
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '16px',
                    width: '16px',
                    left: highlightingEnabled ? '22px' : '2px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    transition: '.4s',
                    borderRadius: '50%'
                  }}
                />
              </span>
            </label>
          </div>
        </div>
        
        {/* List-specific highlighting toggle */}
        {highlightingEnabled && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label
                htmlFor="list-toggle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <span>Highlight words from selected list only</span>
                <span 
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '2px 6px',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-color)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {listName}
                </span>
              </label>
            </div>
            
            <div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input
                  id="list-toggle"
                  type="checkbox"
                  checked={highlightListOnly}
                  onChange={toggleHighlightListOnly}
                  disabled={!selectedListId}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span 
                  style={{
                    position: 'absolute',
                    cursor: selectedListId ? 'pointer' : 'not-allowed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: highlightListOnly ? 'var(--success)' : '#ccc',
                    transition: '.4s',
                    borderRadius: '34px',
                    opacity: selectedListId ? 1 : 0.5
                  }}
                >
                  <span 
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '16px',
                      width: '16px',
                      left: highlightListOnly ? '22px' : '2px',
                      bottom: '2px',
                      backgroundColor: 'white',
                      transition: '.4s',
                      borderRadius: '50%'
                    }}
                  />
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* Highlighting guide */}
      <div
        style={{
          display: 'flex',
          marginTop: '15px',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px',
          backgroundColor: 'var(--background)',
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '5px' }}>
          Highlighting levels:
        </div>
        
        {[1, 2, 3, 4, 5].map(level => (
          <div 
            key={level}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <div 
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: `var(--highlight-level-${level})`,
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.85rem' }}>
              Level {level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HighlightingControls;