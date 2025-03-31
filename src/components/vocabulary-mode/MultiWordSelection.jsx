import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useVocabulary } from '../../contexts/VocabularyContext';
import * as translationService from '../../services/translationService';

/**
 * MultiWordSelection - Component for handling multiple word selection and translation
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the selection toolbar is visible
 * @param {Function} props.onClose - Function to call when closing the toolbar
 */
const MultiWordSelection = ({ visible = false, onClose }) => {
  const { selectedWords, clearSelectedWords, processSelectedWords } = useVocabulary();
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Get the source and target languages
  // We'll use the first selected word's languages as the default
  const sourceLang = selectedWords && selectedWords[0]?.sourceLang || 'en';
  const targetLang = selectedWords && selectedWords[0]?.targetLang || 'en';
  
  // Handle translation
  const handleTranslate = async () => {
    if (!selectedWords || !selectedWords.length) return;
    
    setIsTranslating(true);
    
    try {
      // Extract text from selected words
      const text = selectedWords.map(word => word.word).join(' ');
      
      // Translate the text
      const result = await translationService.translateText(text, sourceLang, targetLang);
      
      if (!result.error) {
        setTranslatedText(result.translated);
        setShowTranslation(true);
      } else {
        setTranslatedText('Translation failed. Please try again.');
        setShowTranslation(true);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('An error occurred during translation.');
      setShowTranslation(true);
    } finally {
      setIsTranslating(false);
    }
  };
  
  // Handle adding all selected words to a specific list
  const handleAddToList = async () => {
    if (!selectedWords || !selectedWords.length) return;
    
    // In a real implementation, you would show a list selector
    // For now, we'll assume the first list is selected
    const listId = 'default-list';
    
    const success = await processSelectedWords('addToList', { listId });
    
    if (success) {
      // Show success notification
      alert('Words added to list successfully!');
      clearSelectedWords();
      onClose();
    } else {
      // Show error notification
      alert('Failed to add words to list.');
    }
  };
  
  // Handle updating familiarity for all selected words
  const handleUpdateFamiliarity = async (rating) => {
    if (!selectedWords || !selectedWords.length) return;
    
    const success = await processSelectedWords('updateFamiliarity', { rating });
    
    if (success) {
      // Show success notification
      alert(`Familiarity updated to level ${rating} for all selected words.`);
      clearSelectedWords();
      onClose();
    } else {
      // Show error notification
      alert('Failed to update familiarity.');
    }
  };
  
  // Handle clearing the selection
  const handleClear = () => {
    clearSelectedWords();
    setShowTranslation(false);
    setTranslatedText('');
    if (onClose) onClose();
  };
  
  // Don't render if no words are selected or if not visible
  if (!visible || !selectedWords || selectedWords.length === 0) {
    return null;
  }
  
  return (
    <motion.div
      className={`selection-toolbar ${!visible ? 'hidden' : ''}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="selection-count">
        {selectedWords.length} word{selectedWords.length !== 1 ? 's' : ''} selected
      </div>
      
      <div className="selection-actions">
        <button 
          className="selection-button primary"
          onClick={handleTranslate}
          disabled={isTranslating}
        >
          {isTranslating ? 'Translating...' : 'Translate'}
        </button>
        
        <button 
          className="selection-button secondary"
          onClick={handleAddToList}
        >
          Add to List
        </button>
        
        <button 
          className="selection-button danger"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>
      
      {/* Translation result */}
      {showTranslation && (
        <motion.div
          className="translation-result"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          style={{
            backgroundColor: '#f8f9fa',
            padding: '8px 12px',
            marginTop: '8px',
            borderRadius: '4px',
            fontSize: '14px',
            maxWidth: '500px'
          }}
        >
          <div className="original-text" style={{ marginBottom: '4px' }}>
            <strong>Original:</strong> {selectedWords.map(word => word.word).join(' ')}
          </div>
          <div className="translated-text">
            <strong>Translation:</strong> {translatedText}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MultiWordSelection;