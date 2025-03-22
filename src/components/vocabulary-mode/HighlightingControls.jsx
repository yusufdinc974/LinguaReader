import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVocabulary } from '../../contexts/VocabularyContext';

/**
 * HighlightingControls - Component for controlling word highlighting options
 * Allows toggling between all words and only words from the selected list
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onHighlightingChange - Callback when highlighting options change
 * @param {Object} props.initialSettings - Initial highlight settings
 */
const HighlightingControls = ({ 
  onHighlightingChange,
  initialSettings = { 
    enabled: true, 
    listOnly: false, 
    selectedListId: null,
    colorPalette: 'standard'
  }
}) => {
  const { vocabularyLists, selectedListId, getSelectedList } = useVocabulary();
  const [highlightListOnly, setHighlightListOnly] = useState(initialSettings.listOnly);
  const [highlightingEnabled, setHighlightingEnabled] = useState(initialSettings.enabled);
  const [filterListId, setFilterListId] = useState(initialSettings.selectedListId || selectedListId);
  const [colorPalette, setColorPalette] = useState(initialSettings.colorPalette || 'standard');
  
  // Color palette options
  const colorPalettes = {
    standard: [
      { level: 1, color: 'rgba(255, 107, 107, 0.6)' }, // Red
      { level: 2, color: 'rgba(254, 202, 87, 0.6)' },  // Yellow
      { level: 3, color: 'rgba(72, 219, 251, 0.6)' },  // Blue
      { level: 4, color: 'rgba(29, 209, 161, 0.6)' },  // Teal
      { level: 5, color: 'rgba(136, 84, 208, 0.3)' }   // Purple
    ],
    pastel: [
      { level: 1, color: 'rgba(255, 179, 186, 0.7)' }, // Pastel Pink
      { level: 2, color: 'rgba(255, 223, 186, 0.7)' }, // Pastel Orange
      { level: 3, color: 'rgba(186, 255, 201, 0.7)' }, // Pastel Green
      { level: 4, color: 'rgba(186, 225, 255, 0.7)' }, // Pastel Blue
      { level: 5, color: 'rgba(223, 186, 255, 0.7)' }  // Pastel Purple
    ],
    vibrant: [
      { level: 1, color: 'rgba(255, 0, 0, 0.5)' },     // Bright Red
      { level: 2, color: 'rgba(255, 165, 0, 0.5)' },   // Bright Orange
      { level: 3, color: 'rgba(255, 255, 0, 0.5)' },   // Bright Yellow
      { level: 4, color: 'rgba(0, 255, 0, 0.5)' },     // Bright Green
      { level: 5, color: 'rgba(0, 0, 255, 0.5)' }      // Bright Blue
    ]
  };
  
  // Get the selected list name
  const selectedList = getSelectedList();
  const listName = selectedList ? selectedList.name : 'No list selected';
  
  // Update when selected list changes
  useEffect(() => {
    console.log('Selected list changed:', selectedListId);
    
    // Update the filter list ID if it's not already set
    if (selectedListId && !filterListId) {
      setFilterListId(selectedListId);
    }
  }, [selectedListId, filterListId]);
  
  // Update when initial settings change
  useEffect(() => {
    console.log('Initial settings changed:', initialSettings);
    
    // Only update state from initialSettings on first load, not on every initialSettings change
    if (!window.settingsInitialized) {
      setHighlightingEnabled(initialSettings.enabled !== undefined ? initialSettings.enabled : true);
      setHighlightListOnly(initialSettings.listOnly !== undefined ? initialSettings.listOnly : false);
      setFilterListId(initialSettings.selectedListId || selectedListId || '');
      setColorPalette(initialSettings.colorPalette || 'standard');
      window.settingsInitialized = true;
      console.log('Settings initialized from initialSettings:', initialSettings);
    }
  }, [initialSettings, selectedListId]);
  
  // Handle list selection change
  const handleListChange = (e) => {
    const newListId = e.target.value;
    setFilterListId(newListId);
    
    // Enable listOnly if a list is selected, disable if not
    const shouldEnableListOnly = newListId !== '';
    if (shouldEnableListOnly !== highlightListOnly) {
      setHighlightListOnly(shouldEnableListOnly);
    }
    
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: shouldEnableListOnly,
        selectedListId: newListId,
        colorPalette: colorPalette
      });
    }
  };
  
  // Handle highlighting toggle
  const toggleHighlightListOnly = () => {
    const newValue = !highlightListOnly;
    setHighlightListOnly(newValue);
    
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: newValue,
        selectedListId: filterListId,
        colorPalette: colorPalette
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
        listOnly: highlightListOnly,
        selectedListId: filterListId,
        colorPalette: colorPalette
      });
    }
  };
  
  // Handle color palette change
  const handlePaletteChange = (palette) => {
    setColorPalette(palette);
    
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: highlightListOnly,
        selectedListId: filterListId,
        colorPalette: palette
      });
    }
  };
  
  // Update when selected list changes
  useEffect(() => {
    // When list selection changes, notify parent
    if (onHighlightingChange) {
      onHighlightingChange({
        enabled: highlightingEnabled,
        listOnly: highlightListOnly,
        selectedListId: filterListId,
        colorPalette: colorPalette
      });
    }
  }, [onHighlightingChange, highlightingEnabled, highlightListOnly, filterListId, colorPalette]);
  
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
        
        {/* Vocabulary List Filter Dropdown */}
        {highlightingEnabled && (
          <div style={{ marginTop: '10px' }}>
            <label 
              htmlFor="list-filter" 
              style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: '500',
                fontSize: '0.9rem'
              }}
            >
              Filter by Vocabulary List:
            </label>
            <select
              id="list-filter"
              value={filterListId || ''}
              onChange={handleListChange}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All Lists</option>
              {vocabularyLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.words ? list.words.length : 0} words)
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* List-specific highlighting toggle */}
        {highlightingEnabled && filterListId && (
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
                <span>Highlight only words from selected list</span>
              </label>
            </div>
            
            <div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input
                  id="list-toggle"
                  type="checkbox"
                  checked={highlightListOnly}
                  onChange={toggleHighlightListOnly}
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
                    backgroundColor: highlightListOnly ? 'var(--success)' : '#ccc',
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
        
        {/* Color Palette Selection */}
        {highlightingEnabled && (
          <div style={{ marginTop: '15px' }}>
            <label 
              style={{ 
                display: 'block', 
                marginBottom: '10px', 
                fontWeight: '500',
                fontSize: '0.9rem'
              }}
            >
              Color Palette:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.keys(colorPalettes).map(palette => (
                <div 
                  key={palette}
                  onClick={() => handlePaletteChange(palette)}
                  style={{
                    border: `2px solid ${colorPalette === palette ? 'var(--primary-color)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '5px',
                    cursor: 'pointer',
                    backgroundColor: colorPalette === palette ? 'var(--primary-light)' : 'white',
                    flexBasis: '30%',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '2px', 
                    marginBottom: '5px' 
                  }}>
                    {colorPalettes[palette].map(({ level, color }) => (
                      <div 
                        key={level}
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: color,
                          borderRadius: '2px',
                          border: '1px solid rgba(0,0,0,0.1)'
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    {palette}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Highlighting guide */}
      {highlightingEnabled && (
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
          
          {colorPalettes[colorPalette].map(({ level, color }) => (
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
                  backgroundColor: color,
                  borderRadius: '3px'
                }}
              />
              <span style={{ fontSize: '0.85rem' }}>
                Level {level}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightingControls;