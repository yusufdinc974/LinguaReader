import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCharacterMetadata } from '../../utils/textProcessing';
import * as cjkUtils from '../../utils/cjkUtils';

/**
 * CJKCharacterDetails - Component for displaying detailed information about CJK characters
 * 
 * @param {Object} props - Component props
 * @param {string} props.character - The character to display details for
 * @param {string} props.language - Language of the character ('ja', 'zh', 'ko')
 * @param {Function} props.onClose - Function to call when closing the panel
 */
const CJKCharacterDetails = ({ character, language, onClose }) => {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  // Load character metadata when the component mounts
  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoading(true);
      
      try {
        // Get basic metadata
        const characterData = getCharacterMetadata(character, language);
        
        // Add language-specific data
        if (language === 'ja' && characterData.type === 'kanji') {
          // Add JLPT level
          characterData.jlptLevel = cjkUtils.getJLPTLevel(character);
          
          // Add readings
          characterData.readings = cjkUtils.getJapaneseReadings(character);
          
          // Add stroke count
          characterData.strokes = cjkUtils.getStrokeCount(character);
          
          // Add example words
          characterData.examples = cjkUtils.getExampleWords(character, language);
          
          // Add radicals
          characterData.radicals = cjkUtils.getRadicals(character);
          
          // Add stroke order
          characterData.strokeOrder = cjkUtils.getStrokeOrder(character);
        }
        else if (language === 'zh') {
          // Add HSK level
          characterData.hskLevel = cjkUtils.getHSKLevel(character);
          
          // Add stroke count
          characterData.strokes = cjkUtils.getStrokeCount(character);
          
          // Add example words
          characterData.examples = cjkUtils.getExampleWords(character, language);
          
          // Add radicals
          characterData.radicals = cjkUtils.getRadicals(character);
          
          // Add stroke order
          characterData.strokeOrder = cjkUtils.getStrokeOrder(character);
          
          // Add traditional/simplified variant
          const isSimplified = true; // This would be determined by analysis
          characterData.variant = isSimplified ? 
            cjkUtils.convertChineseForm(character, 'traditional') : 
            cjkUtils.convertChineseForm(character, 'simplified');
          characterData.variantType = isSimplified ? 'traditional' : 'simplified';
        }
        else if (language === 'ko' && characterData.type === 'hangul') {
          // Add decomposition
          characterData.components = cjkUtils.decomposeHangul(character);
          
          // Add example words
          characterData.examples = cjkUtils.getExampleWords(character, language);
        }
        
        setMetadata(characterData);
      } catch (error) {
        console.error('Error loading character metadata:', error);
        // Set basic metadata if there's an error
        setMetadata({
          character,
          language,
          type: 'unknown',
          error: true
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMetadata();
  }, [character, language]);
  
  if (isLoading) {
    return (
      <div className="cjk-character-details loading">
        <div className="loading-spinner"></div>
        <p>Loading character information...</p>
      </div>
    );
  }
  
  if (!metadata) {
    return (
      <div className="cjk-character-details error">
        <p>Could not load character information.</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
  
  // Render component based on language
  return (
    <motion.div
      className="cjk-character-details"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="character-header">
        <div className="character-display">
          <span className="character">{character}</span>
        </div>
        
        <div className="character-type">
          <span>{metadata.type || 'Character'}</span>
          
          {/* Language-specific level indicators */}
          {language === 'ja' && metadata.jlptLevel && (
            <span className="level-badge jlpt-level">JLPT N{metadata.jlptLevel}</span>
          )}
          
          {language === 'zh' && metadata.hskLevel && (
            <span className="level-badge hsk-level">HSK {metadata.hskLevel}</span>
          )}
        </div>
        
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {/* Navigation tabs */}
      <div className="character-tabs">
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        
        {(language === 'ja' || language === 'zh') && (
          <button 
            className={`tab-button ${activeTab === 'strokes' ? 'active' : ''}`}
            onClick={() => setActiveTab('strokes')}
          >
            Strokes
          </button>
        )}
        
        {metadata.examples && metadata.examples.length > 0 && (
          <button 
            className={`tab-button ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </button>
        )}
      </div>
      
      {/* Tab content */}
      <div className="tab-content">
        {/* General information tab */}
        {activeTab === 'general' && (
          <div className="general-info">
            {/* Japanese specific content */}
            {language === 'ja' && (
              <>
                {metadata.type === 'kanji' && (
                  <>
                    {metadata.readings && (
                      <div className="info-section">
                        <h4>Readings</h4>
                        {metadata.readings.on && metadata.readings.on.length > 0 && (
                          <div className="reading-group">
                            <span className="reading-label">On:</span>
                            <span className="reading-value">{metadata.readings.on.join(', ')}</span>
                          </div>
                        )}
                        {metadata.readings.kun && metadata.readings.kun.length > 0 && (
                          <div className="reading-group">
                            <span className="reading-label">Kun:</span>
                            <span className="reading-value">{metadata.readings.kun.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {metadata.radicals && metadata.radicals.length > 0 && (
                      <div className="info-section">
                        <h4>Radicals</h4>
                        <div className="radicals-container">
                          {metadata.radicals.map((radical, index) => (
                            <span key={index} className="radical">{radical}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {metadata.strokes && (
                      <div className="info-section">
                        <h4>Stroke Count</h4>
                        <span>{metadata.strokes}</span>
                      </div>
                    )}
                  </>
                )}
                
                {metadata.type === 'hiragana' && (
                  <div className="info-section">
                    <h4>Katakana Equivalent</h4>
                    <span>{cjkUtils.convertJapaneseScript(character, 'katakana')}</span>
                  </div>
                )}
                
                {metadata.type === 'katakana' && (
                  <div className="info-section">
                    <h4>Hiragana Equivalent</h4>
                    <span>{cjkUtils.convertJapaneseScript(character, 'hiragana')}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Chinese specific content */}
            {language === 'zh' && (
              <>
                {metadata.variant && (
                  <div className="info-section">
                    <h4>{metadata.variantType === 'traditional' ? 'Traditional Form' : 'Simplified Form'}</h4>
                    <span className="variant-character">{metadata.variant}</span>
                  </div>
                )}
                
                {metadata.radicals && metadata.radicals.length > 0 && (
                  <div className="info-section">
                    <h4>Radicals</h4>
                    <div className="radicals-container">
                      {metadata.radicals.map((radical, index) => (
                        <span key={index} className="radical">{radical}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {metadata.strokes && (
                  <div className="info-section">
                    <h4>Stroke Count</h4>
                    <span>{metadata.strokes}</span>
                  </div>
                )}
              </>
            )}
            
            {/* Korean specific content */}
            {language === 'ko' && (
              <>
                {metadata.components && (
                  <div className="info-section">
                    <h4>Hangul Components</h4>
                    <div className="hangul-components">
                      {metadata.components.initial && (
                        <div className="component">
                          <span className="component-label">Initial:</span>
                          <span className="component-value">{metadata.components.initial}</span>
                        </div>
                      )}
                      {metadata.components.medial && (
                        <div className="component">
                          <span className="component-label">Medial:</span>
                          <span className="component-value">{metadata.components.medial}</span>
                        </div>
                      )}
                      {metadata.components.final && (
                        <div className="component">
                          <span className="component-label">Final:</span>
                          <span className="component-value">{metadata.components.final}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Strokes tab */}
        {activeTab === 'strokes' && (
          <div className="strokes-info">
            <div className="stroke-order">
              <h4>Stroke Order</h4>
              {metadata.strokeOrder && !metadata.strokeOrder.isPlaceholder ? (
                <div className="stroke-animation">
                  {/* This would be an SVG animation in a real implementation */}
                  <div className="stroke-placeholder">
                    <span className="character">{character}</span>
                    <p>Stroke order animation would appear here</p>
                  </div>
                </div>
              ) : (
                <div className="stroke-placeholder">
                  <span className="character">{character}</span>
                  <p>Stroke order not available</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Examples tab */}
        {activeTab === 'examples' && (
          <div className="examples-info">
            <h4>Example Words</h4>
            {metadata.examples && metadata.examples.length > 0 ? (
              <ul className="examples-list">
                {metadata.examples.map((example, index) => (
                  <li key={index} className="example-item">
                    <div className="example-word">{example.word}</div>
                    <div className="example-reading">
                      {language === 'ja' && example.reading}
                      {language === 'zh' && example.pinyin}
                      {language === 'ko' && example.romanized}
                    </div>
                    <div className="example-meaning">{example.meaning}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No examples available</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CJKCharacterDetails;