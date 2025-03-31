import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as storageService from '../services/storageService';
import { detectLanguage } from '../utils/textProcessing';

// Create context
const VocabularyContext = createContext();

/**
 * Provider component for vocabulary management
 * Enhanced with CJK language support
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const VocabularyProvider = ({ children }) => {
  // State for vocabulary words
  const [vocabularyWords, setVocabularyWords] = useState([]);
  const [currentPdfVocabulary, setCurrentPdfVocabulary] = useState([]);
  const [currentPdfId, setCurrentPdfId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWords: 0,
    byLanguage: {},
    byFamiliarity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  
  // State for vocabulary lists
  const [vocabularyLists, setVocabularyLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  
  // State for selected words (new feature for multi-word selection)
  const [selectedWords, setSelectedWords] = useState([]);

  // Load vocabulary on mount
  useEffect(() => {
    loadVocabulary();
    loadVocabularyLists();
  }, []);

  // Load vocabulary data from storage
  const loadVocabulary = useCallback(async () => {
    setLoading(true);
    try {
      // Get all vocabulary words
      const allWords = storageService.getAllVocabulary();
      setVocabularyWords(allWords);
      
      // Calculate statistics
      calculateStats(allWords);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load vocabulary lists from storage
  const loadVocabularyLists = useCallback(async () => {
    try {
      const lists = storageService.getAllVocabularyLists();
      setVocabularyLists(lists);
      
      // Set selected list to default list if none selected
      if (!selectedListId) {
        const defaultListId = storageService.getDefaultListId();
        setSelectedListId(defaultListId);
      }
    } catch (error) {
      console.error('Error loading vocabulary lists:', error);
    }
  }, [selectedListId]);

  // Calculate statistics from vocabulary words
  const calculateStats = useCallback((words) => {
    const stats = {
      totalWords: words.length,
      byLanguage: {},
      byFamiliarity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
    
    // Process each word
    words.forEach(word => {
      // Count by source language
      const langKey = `${word.sourceLang}-${word.targetLang}`;
      if (!stats.byLanguage[langKey]) {
        stats.byLanguage[langKey] = 0;
      }
      stats.byLanguage[langKey]++;
      
      // Count by familiarity
      if (word.familiarityRating) {
        stats.byFamiliarity[word.familiarityRating]++;
      }
    });
    
    setStats(stats);
  }, []);

  // Set current PDF and load its vocabulary
  const setCurrentPdf = useCallback((pdfId) => {
    setCurrentPdfId(pdfId);
    
    if (pdfId) {
      // Load vocabulary specific to this PDF
      const pdfVocabulary = storageService.getPDFVocabulary(pdfId);
      setCurrentPdfVocabulary(pdfVocabulary);
    } else {
      setCurrentPdfVocabulary([]);
    }
  }, []);

  // Add a word to vocabulary
  const addWord = useCallback((wordData) => {
    try {
      // Ensure language is set if not provided
      if (!wordData.sourceLang) {
        wordData.sourceLang = detectLanguage(wordData.word);
      }
      
      // Add to storage
      const newWord = storageService.addVocabularyWord(wordData, currentPdfId);
      
      // Update state
      setVocabularyWords(prevWords => {
        // Replace if exists, otherwise add
        const wordIndex = prevWords.findIndex(w => 
          w.word === newWord.word && w.sourceLang === newWord.sourceLang
        );
        
        if (wordIndex >= 0) {
          const updatedWords = [...prevWords];
          updatedWords[wordIndex] = newWord;
          return updatedWords;
        } else {
          return [...prevWords, newWord];
        }
      });
      
      // Update PDF-specific vocabulary if applicable
      if (currentPdfId) {
        setCurrentPdfVocabulary(prevWords => {
          const wordIndex = prevWords.findIndex(w => 
            w.word === newWord.word && w.sourceLang === newWord.sourceLang
          );
          
          if (wordIndex >= 0) {
            const updatedWords = [...prevWords];
            updatedWords[wordIndex] = newWord;
            return updatedWords;
          } else {
            return [...prevWords, newWord];
          }
        });
      }
      
      // Recalculate stats
      calculateStats([...vocabularyWords.filter(w => 
        !(w.word === newWord.word && w.sourceLang === newWord.sourceLang)
      ), newWord]);
      
      return newWord;
    } catch (error) {
      console.error('Error adding word:', error);
      return null;
    }
  }, [currentPdfId, vocabularyWords, calculateStats]);

  // Update a word in vocabulary
  const updateWord = useCallback((wordId, newData) => {
    try {
      // Update in storage
      const updatedWord = storageService.updateVocabularyWord(wordId, newData);
      
      if (!updatedWord) return null;
      
      // Update in state
      setVocabularyWords(prevWords => 
        prevWords.map(word => 
          word.id === wordId ? updatedWord : word
        )
      );
      
      // Update in PDF-specific vocabulary if applicable
      if (currentPdfId) {
        setCurrentPdfVocabulary(prevWords => 
          prevWords.map(word => 
            word.id === wordId ? updatedWord : word
          )
        );
      }
      
      // Recalculate stats
      calculateStats(vocabularyWords.map(word => 
        word.id === wordId ? updatedWord : word
      ));
      
      return updatedWord;
    } catch (error) {
      console.error('Error updating word:', error);
      return null;
    }
  }, [vocabularyWords, currentPdfId, calculateStats]);

  // Remove a word from vocabulary
  const removeWord = useCallback((wordId) => {
    try {
      // Create a filtered array first to get the actual remaining words
      const remainingWords = vocabularyWords.filter(word => word.id !== wordId);
      
      // Remove from storage - Make sure this is called first
      storageService.removeVocabularyWord(wordId, currentPdfId);
      
      // Remove from state
      setVocabularyWords(remainingWords);
      
      // Remove from PDF-specific vocabulary if applicable
      if (currentPdfId) {
        setCurrentPdfVocabulary(prevWords => 
          prevWords.filter(word => word.id !== wordId)
        );
      }
      
      // Recalculate stats with the actual remaining words
      calculateStats(remainingWords);
      
      // Force a refresh of vocabulary lists
      loadVocabularyLists();
      
      return true;
    } catch (error) {
      console.error('Error removing word:', error);
      return false;
    }
  }, [currentPdfId, vocabularyWords, calculateStats, loadVocabularyLists]);

  // Get words filtered by language
  const getWordsByLanguage = useCallback((sourceLang, targetLang) => {
    // If only sourceLang is provided
    if (sourceLang && !targetLang) {
      return vocabularyWords.filter(word => word.sourceLang === sourceLang);
    }
    // If only targetLang is provided
    else if (!sourceLang && targetLang) {
      return vocabularyWords.filter(word => word.targetLang === targetLang);
    }
    // If both are provided
    else if (sourceLang && targetLang) {
      return vocabularyWords.filter(word => 
        word.sourceLang === sourceLang && word.targetLang === targetLang
      );
    }
    // If neither is provided
    return vocabularyWords;
  }, [vocabularyWords]);

  // Get words filtered by familiarity rating
  const getWordsByFamiliarity = useCallback((rating) => {
    if (!rating) return vocabularyWords;
    return vocabularyWords.filter(word => word.familiarityRating === rating);
  }, [vocabularyWords]);

  // Update word familiarity
  const updateWordFamiliarity = useCallback((wordId, rating) => {
    return updateWord(wordId, { familiarityRating: rating });
  }, [updateWord]);
  
  // Check if a word exists in vocabulary
  const hasWord = useCallback((word, sourceLang) => {
    // Ensure word is a string before trying to use toLowerCase()
    if (!word || typeof word !== 'string') return false;
    
    // For CJK languages, do exact comparison instead of lowercase
    if (['ja', 'zh', 'ko'].includes(sourceLang)) {
      return vocabularyWords.some(item => 
        item.word === word && item.sourceLang === sourceLang
      );
    }
    
    // For other languages, use case-insensitive comparison
    return vocabularyWords.some(item => 
      item.word.toLowerCase() === word.toLowerCase() && 
      item.sourceLang === sourceLang
    );
  }, [vocabularyWords]);
  
  // Get word details if it exists in vocabulary
  const getWordDetails = useCallback((word, sourceLang) => {
    // Ensure word is a string before trying to use toLowerCase()
    if (!word || typeof word !== 'string') return null;
    
    // For CJK languages, do exact comparison instead of lowercase
    if (['ja', 'zh', 'ko'].includes(sourceLang)) {
      return vocabularyWords.find(item => 
        item.word === word && item.sourceLang === sourceLang
      ) || null;
    }
    
    // For other languages, use case-insensitive comparison
    return vocabularyWords.find(item => 
      item.word.toLowerCase() === word.toLowerCase() && 
      item.sourceLang === sourceLang
    ) || null;
  }, [vocabularyWords]);
  
  // Create a new vocabulary list
  const createList = useCallback((listData) => {
    try {
      const newList = storageService.createVocabularyList(listData);
      if (newList) {
        setVocabularyLists(prevLists => [...prevLists, newList]);
      }
      return newList;
    } catch (error) {
      console.error('Error creating vocabulary list:', error);
      return null;
    }
  }, []);
  
  // Update a vocabulary list
  const updateList = useCallback((listId, newData) => {
    try {
      const updatedList = storageService.updateVocabularyList(listId, newData);
      if (updatedList) {
        setVocabularyLists(prevLists => 
          prevLists.map(list => list.id === listId ? updatedList : list)
        );
      }
      return updatedList;
    } catch (error) {
      console.error('Error updating vocabulary list:', error);
      return null;
    }
  }, []);
  
  // Delete a vocabulary list
  const deleteList = useCallback((listId) => {
    try {
      const success = storageService.deleteVocabularyList(listId);
      if (success) {
        setVocabularyLists(prevLists => 
          prevLists.filter(list => list.id !== listId)
        );
        
        // If we deleted the selected list, select a different one
        if (selectedListId === listId) {
          const defaultListId = storageService.getDefaultListId();
          setSelectedListId(defaultListId);
        }
      }
      return success;
    } catch (error) {
      console.error('Error deleting vocabulary list:', error);
      return false;
    }
  }, [selectedListId]);
  
  // Add a word to a list
  const addWordToList = useCallback((wordId, listId) => {
    try {
      const success = storageService.addWordToList(wordId, listId);
      if (success) {
        // Just reload lists to keep everything in sync
        loadVocabularyLists();
      }
      return success;
    } catch (error) {
      console.error('Error adding word to list:', error);
      return false;
    }
  }, [loadVocabularyLists]);
  
  // Remove a word from a list
  const removeWordFromList = useCallback((wordId, listId) => {
    try {
      const success = storageService.removeWordFromList(wordId, listId);
      if (success) {
        // Just reload lists to keep everything in sync
        loadVocabularyLists();
      }
      return success;
    } catch (error) {
      console.error('Error removing word from list:', error);
      return false;
    }
  }, [loadVocabularyLists]);
  
  // Get words in a list
  const getWordsInList = useCallback((listId) => {
    if (!listId) return [];
    try {
      return storageService.getWordsInList(listId);
    } catch (error) {
      console.error('Error getting words in list:', error);
      return [];
    }
  }, []);
  
  // Set the selected list
  const selectList = useCallback((listId) => {
    setSelectedListId(listId);
  }, []);
  
  // Get the selected list
  const getSelectedList = useCallback(() => {
    return vocabularyLists.find(list => list.id === selectedListId) || null;
  }, [vocabularyLists, selectedListId]);
  
  // Set a list as the default
  const setDefaultList = useCallback((listId) => {
    try {
      return storageService.setDefaultList(listId);
    } catch (error) {
      console.error('Error setting default list:', error);
      return false;
    }
  }, []);
  
  // Add a word to selected words (for multi-selection)
  const addToSelectedWords = useCallback((word) => {
    if (!word) return;
    
    setSelectedWords(prev => {
      if (!prev) return [word];
      
      // Check if already selected
      if (prev.some(w => w.id === word.id)) {
        return prev;
      }
      return [...prev, word];
    });
  }, []);
  
  // Remove a word from selected words
  const removeFromSelectedWords = useCallback((wordId) => {
    if (!wordId) return;
    
    setSelectedWords(prev => {
      if (!prev) return [];
      return prev.filter(w => w.id !== wordId);
    });
  }, []);
  
  // Clear all selected words
  const clearSelectedWords = useCallback(() => {
    setSelectedWords([]);
  }, []);
  
  // Batch process selected words (e.g., translate all, add all to list)
  const processSelectedWords = useCallback(async (action, options = {}) => {
    if (!selectedWords || !selectedWords.length) return false;
    
    switch (action) {
      case 'addToList':
        if (!options.listId) return false;
        
        // Add all selected words to the specified list
        const results = await Promise.all(
          selectedWords.map(word => addWordToList(word.id, options.listId))
        );
        
        // Return true if all operations succeeded
        return results.every(result => result === true);
        
      case 'updateFamiliarity':
        if (!options.rating) return false;
        
        // Update familiarity for all selected words
        const updateResults = await Promise.all(
          selectedWords.map(word => updateWordFamiliarity(word.id, options.rating))
        );
        
        // Return true if all operations succeeded
        return updateResults.every(result => !!result);
        
      case 'delete':
        // Delete all selected words
        const deleteResults = await Promise.all(
          selectedWords.map(word => removeWord(word.id))
        );
        
        // Clear selection after deletion
        clearSelectedWords();
        
        // Return true if all operations succeeded
        return deleteResults.every(result => result === true);
        
      default:
        return false;
    }
  }, [selectedWords, addWordToList, updateWordFamiliarity, removeWord, clearSelectedWords]);

  // Context value
  const contextValue = {
    vocabularyWords,
    currentPdfVocabulary,
    currentPdfId,
    loading,
    stats,
    setCurrentPdf,
    addWord,
    updateWord,
    removeWord,
    getWordsByLanguage,
    getWordsByFamiliarity,
    updateWordFamiliarity,
    hasWord,
    getWordDetails,
    refreshVocabulary: loadVocabulary,
    // Vocabulary lists functions
    vocabularyLists,
    selectedListId,
    createList,
    updateList,
    deleteList,
    addWordToList,
    removeWordFromList,
    getWordsInList,
    selectList,
    getSelectedList,
    setDefaultList,
    refreshVocabularyLists: loadVocabularyLists,
    // Multi-selection functions
    selectedWords,
    addToSelectedWords,
    removeFromSelectedWords,
    clearSelectedWords,
    processSelectedWords
  };

  return (
    <VocabularyContext.Provider value={contextValue}>
      {children}
    </VocabularyContext.Provider>
  );
};

// Custom hook for using vocabulary context
export const useVocabulary = () => {
  const context = useContext(VocabularyContext);
  if (!context) {
    throw new Error('useVocabulary must be used within a VocabularyProvider');
  }
  return context;
};

export default VocabularyContext;