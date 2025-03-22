import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useTranslation from '../../hooks/useTranslation';
import { useVocabulary } from '../../contexts/VocabularyContext';

/**
 * DefinitionDisplay - Component to display word translations
 * Enhanced with VocabularyContext integration for word saving and list management
 * 
 * @param {Object} props - Component props
 * @param {string} props.word - The word to translate
 * @param {boolean} props.isVisible - Whether the panel is visible
 * @param {Function} props.onClose - Function to call when panel is closed
 * @param {Function} props.onSaved - Optional callback for when a word is saved
 */
const DefinitionDisplay = ({
  word = '',
  isVisible = false,
  onClose,
  onSaved
}) => {
  const [familiarityRating, setFamiliarityRating] = useState(0);
  const previousWordRef = useRef('');
  const [saveStatus, setSaveStatus] = useState({ status: 'idle', message: '' });
  const [selectedLists, setSelectedLists] = useState([]);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  
  // Use vocabulary context with list functions
  const { 
    addWord, 
    hasWord, 
    getWordDetails,
    vocabularyLists,
    addWordToList,
    removeWordFromList,
    createList,
    getSelectedList
  } = useVocabulary();
  
  // Use the translation hook
  const {
    loading: translationLoading,
    error: translationError,
    translatedText,
    translationApi,
    translate,
    translateWithDetection,
    resetTranslation,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    swapLanguages,
    detectAndSetLanguage
  } = useTranslation();
  
  // When visibility changes or word changes, update
  useEffect(() => {
    if (isVisible) {
      // Only perform translation if the word changed
      if (word !== previousWordRef.current) {
        // Reset states
        resetSaveStatus();
        resetTranslation();
        
        // Check if word is already in vocabulary
        const existingWord = getWordDetails(word, sourceLang || 'en');
        
        if (existingWord) {
          // Set the initial familiarity rating from saved word
          setFamiliarityRating(existingWord.familiarityRating || 0);
          
          // Set languages to match the saved word
          if (existingWord.sourceLang && existingWord.targetLang) {
            setSourceLang(existingWord.sourceLang);
            setTargetLang(existingWord.targetLang);
            
            // Translate using saved languages
            translate(word, existingWord.sourceLang, existingWord.targetLang);
          } else {
            // Fallback to auto detection
            translateWithDetection(word);
          }
          
          // Check which lists have this word and pre-select them
          if (vocabularyLists.length > 0) {
            const wordLists = vocabularyLists
              .filter(list => list.words && list.words.includes(existingWord.id))
              .map(list => list.id);
            
            setSelectedLists(wordLists);
          }
        } else {
          // Reset familiarity for new words
          setFamiliarityRating(0);
          
          // Automatically detect language and translate
          translateWithDetection(word);
          
          // Pre-select the current selected list if any
          const currentList = getSelectedList();
          if (currentList) {
            setSelectedLists([currentList.id]);
          } else {
            setSelectedLists([]);
          }
        }
        
        // Update the ref to track the current word
        previousWordRef.current = word;
      }
    } else {
      // When panel is hidden, reset the word reference
      previousWordRef.current = '';
      setSaveStatus({ status: 'idle', message: '' });
      setShowCreateList(false);
    }
  }, [word, isVisible, resetTranslation, translateWithDetection, getWordDetails, translate, vocabularyLists, getSelectedList]);
  
  // Reset save status
  const resetSaveStatus = () => {
    setSaveStatus({ status: 'idle', message: '' });
  };
  
  // Handle manual translation after language change
  const handleManualTranslate = () => {
    if (word) {
      resetTranslation();
      translate(word, sourceLang, targetLang);
    }
  };
  
  // Toggle selection of a vocabulary list
  const toggleListSelection = (listId) => {
    setSelectedLists(prevSelected => {
      if (prevSelected.includes(listId)) {
        // Remove from selection
        return prevSelected.filter(id => id !== listId);
      } else {
        // Add to selection
        return [...prevSelected, listId];
      }
    });
  };
  
  // Handle creating a new list
  const handleCreateList = () => {
    if (!newListName.trim()) return;
    
    const newList = createList({
      name: newListName.trim(),
      description: newListDescription.trim()
    });
    
    if (newList) {
      // Pre-select the new list
      setSelectedLists(prev => [...prev, newList.id]);
      setNewListName('');
      setNewListDescription('');
      setShowCreateList(false);
    }
  };
  
  // Handle saving word
  const handleSaveWord = () => {
    if (!word || familiarityRating === 0) return;
    
    setSaveStatus({ status: 'saving', message: 'Saving word...' });
    
    // Check if word already exists
    const existingWord = getWordDetails(word, sourceLang);
    const isUpdate = Boolean(existingWord);
    
    // Prepare word data
    const wordData = {
      word,
      familiarityRating,
      translation: translatedText || null,
      sourceLang: sourceLang || 'en',
      targetLang: targetLang || 'es',
      date: new Date().toISOString(),
      // Include metadata to make filtering and display easier
      sourceLanguageName: getLanguageName(sourceLang),
      targetLanguageName: getLanguageName(targetLang)
    };
    
    try {
      // Add word to vocabulary
      const savedWord = addWord(wordData);
      
      if (savedWord) {
        // Update word's list memberships
        if (existingWord) {
          // For existing words, we need to figure out which lists to add to and which to remove from
          vocabularyLists.forEach(list => {
            const isInList = list.words && list.words.includes(existingWord.id);
            const shouldBeInList = selectedLists.includes(list.id);
            
            if (isInList && !shouldBeInList) {
              // Remove from this list
              removeWordFromList(existingWord.id, list.id);
            } else if (!isInList && shouldBeInList) {
              // Add to this list
              addWordToList(existingWord.id, list.id);
            }
          });
        } else {
          // For new words, just add to all selected lists
          selectedLists.forEach(listId => {
            addWordToList(savedWord.id, listId);
          });
        }
        
        setSaveStatus({ 
          status: 'success', 
          message: isUpdate ? 'Word updated successfully!' : 'Word saved to vocabulary!' 
        });
        
        // Clear status after a delay
        setTimeout(() => {
          resetSaveStatus();
        }, 3000);
        
        // Call onSaved callback if provided
        if (onSaved) {
          onSaved(savedWord);
        }
      } else {
        setSaveStatus({ status: 'error', message: 'Failed to save word' });
      }
    } catch (error) {
      console.error('Error saving word:', error);
      setSaveStatus({ status: 'error', message: 'Error saving word' });
    }
  };
  
  // Helper to get language name from code
  const getLanguageName = (code) => {
    const languageMap = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'tr': 'Turkish',
      'nl': 'Dutch',
      'sv': 'Swedish'
    };
    return languageMap[code] || code;
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 100, transition: { duration: 0.2 } }
  };
  
  // Panel content variants
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };
  
  // Status message variants
  const statusVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.1 } }
  };
  
  // If not visible, don't render anything
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key="translation-panel"
        className="translation-panel"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '350px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000
        }}
      >
        {/* Header with language indicator */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--secondary-color)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontWeight: '600', fontSize: '1.2rem' }}>
              {word}
            </h3>
            {sourceLang && (
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                {getLanguageName(sourceLang)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              transition: 'all 0.2s',
              padding: 0
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '15px 20px'
          }}
        >
          <motion.div
            key="translation-content"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={contentVariants}
          >
            {/* Word exists indicator */}
            {hasWord(word, sourceLang) && (
              <div
                style={{
                  backgroundColor: 'var(--success-light)',
                  color: 'var(--success)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '15px',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>✓</span>
                <span>This word is already in your vocabulary list</span>
              </div>
            )}
          
            {/* Language controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'white'
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="tr">Turkish</option>
                <option value="nl">Dutch</option>
                <option value="sv">Swedish</option>
              </select>
              
              <button
                onClick={swapLanguages}
                style={{
                  backgroundColor: 'var(--background)',
                  border: 'none',
                  margin: '0 10px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
              >
                ⇄
              </button>
              
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'white'
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="tr">Turkish</option>
                <option value="nl">Dutch</option>
                <option value="sv">Swedish</option>
              </select>
            </div>
            
            {/* Translate button */}
            <button
              onClick={handleManualTranslate}
              style={{
                display: 'block',
                width: '100%',
                marginBottom: '15px',
                padding: '8px',
                border: 'none',
                backgroundColor: 'var(--secondary-light)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
            >
              Translate
            </button>
            
            {/* Original word */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Original ({getLanguageName(sourceLang)}):
              </div>
              <div
                style={{
                  padding: '10px',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem'
                }}
              >
                {word}
              </div>
            </div>
            
            {/* Translation */}
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Translation ({getLanguageName(targetLang)}):
              </div>
              
              {translationLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>Translating...</div>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      border: '2px solid var(--secondary-light)',
                      borderTopColor: 'var(--secondary-color)',
                      borderRadius: '50%',
                      margin: '0 auto',
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                </div>
              ) : translationError ? (
                <div style={{ padding: '20px', color: 'var(--error)' }}>
                  <p>Error translating:</p>
                  <p>{translationError.message}</p>
                </div>
              ) : translatedText ? (
                <div>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--background)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  >
                    {translatedText}
                  </div>
                  
                  {/* Translation API attribution */}
                  {translationApi && (
                    <div style={{ 
                      marginTop: '8px',
                      fontSize: '0.8rem', 
                      color: 'var(--text-secondary)',
                      textAlign: 'right'
                    }}>
                      via {translationApi}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)'
                }}>
                  Click "Translate" to see translation
                </div>
              )}
            </div>
            
            {/* Vocabulary Lists Section */}
            <div style={{ marginTop: '20px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px' 
                }}
              >
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Add to vocabulary lists:
                </div>
                <button
                  onClick={() => setShowCreateList(!showCreateList)}
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-color)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {showCreateList ? 'Cancel' : '+ New List'}
                </button>
              </div>
              
              {/* Create new list form */}
              {showCreateList && (
                <div
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: 'var(--primary-light)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <label 
                      style={{ 
                        display: 'block', 
                        fontSize: '0.85rem',
                        marginBottom: '3px',
                        color: 'var(--text-secondary)' 
                      }}
                    >
                      List Name:
                    </label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list name"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label 
                      style={{ 
                        display: 'block', 
                        fontSize: '0.85rem',
                        marginBottom: '3px',
                        color: 'var(--text-secondary)' 
                      }}
                    >
                      Description (optional):
                    </label>
                    <input
                      type="text"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="Enter description"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)'
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCreateList}
                    disabled={!newListName.trim()}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: newListName.trim() ? 'var(--primary-color)' : 'var(--border)',
                      color: newListName.trim() ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: newListName.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Create List
                  </button>
                </div>
              )}
              
              {/* List of vocabulary lists */}
              <div
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)',
                  padding: vocabularyLists.length > 0 ? '5px' : '0'
                }}
              >
                {vocabularyLists.length > 0 ? (
                  vocabularyLists.map(list => (
                    <div
                      key={list.id}
                      onClick={() => toggleListSelection(list.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 10px',
                        marginBottom: '4px',
                        backgroundColor: selectedLists.includes(list.id) ? 'var(--primary-light)' : 'white',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: `1px solid ${selectedLists.includes(list.id) ? 'var(--primary-color)' : 'var(--border)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(list.id)}
                        onChange={() => {}} // Handled by the div click
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{list.name}</div>
                        {list.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {list.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '15px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}
                  >
                    No vocabulary lists available.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Footer with familiarity rating and save button */}
        <div
          style={{
            padding: '15px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Status message */}
          <AnimatePresence>
            {saveStatus.status !== 'idle' && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={statusVariants}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 
                    saveStatus.status === 'success' ? 'var(--success-light)' :
                    saveStatus.status === 'error' ? 'var(--error-light)' :
                    'var(--background)',
                  color: 
                    saveStatus.status === 'success' ? 'var(--success)' :
                    saveStatus.status === 'error' ? 'var(--error)' :
                    'var(--text-secondary)',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                }}
              >
                {saveStatus.message}
              </motion.div>
            )}
          </AnimatePresence>
        
          {/* Familiarity rating */}
          <div>
            <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              How familiar are you with this word?
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px'
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFamiliarityRating(rating)}
                  style={{
                    width: '36px',
                    height: '36px',
                    border: `2px solid ${
                      familiarityRating >= rating
                        ? `var(--highlight-level-${rating})`
                        : 'var(--border)'
                    }`,
                    borderRadius: 'var(--radius-circle)',
                    backgroundColor: familiarityRating >= rating
                      ? `var(--highlight-level-${rating})`
                      : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: familiarityRating >= rating ? '600' : 'normal',
                    color: familiarityRating >= rating && rating > 2 ? 'white' : 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
          
          {/* Save button */}
          <button
            onClick={handleSaveWord}
            disabled={familiarityRating === 0}
            style={{
              padding: '10px',
              border: 'none',
              backgroundColor: familiarityRating > 0 ? 'var(--primary-color)' : 'var(--border)',
              color: familiarityRating > 0 ? 'white' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              cursor: familiarityRating > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {hasWord(word, sourceLang) ? 'Update in Vocabulary' : 'Save to Vocabulary'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DefinitionDisplay;