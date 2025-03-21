import { useState, useEffect, useCallback } from 'react';
import { getEnglishDefinition, getSpanishDefinition, getMultiLanguageDefinition, getRandomWord } from '../services/dictionaryService';
import { detectLanguage } from '../services/translationService';

// Local in-memory cache
const definitionCache = new Map();

/**
 * Custom hook for dictionary lookups with Merriam-Webster integration
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.useCache - Whether to use caching (default: true)
 * @param {number} options.cacheTTL - Cache time-to-live in milliseconds (default: 24h)
 * @returns {Object} - Dictionary lookup functions and state
 */
const useDictionary = (options = {}) => {
  const { useCache = true, cacheTTL = 24 * 60 * 60 * 1000 } = options;
  
  const [currentWord, setCurrentWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [wordLanguage, setWordLanguage] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [recentDefinitions, setRecentDefinitions] = useState([]);

  /**
   * Clear old entries from the cache
   */
  const cleanupCache = useCallback(() => {
    if (!useCache) return;
    
    const now = Date.now();
    for (const [key, entry] of definitionCache.entries()) {
      if (now - entry.timestamp > cacheTTL) {
        definitionCache.delete(key);
      }
    }
  }, [useCache, cacheTTL]);

  /**
   * Reset the dictionary state for a new word lookup
   */
  const resetState = useCallback(() => {
    setDefinition(null);
    setError(null);
    setWordLanguage(null);
  }, []);

  /**
   * Look up a word in the English dictionary
   * @param {string} word - Word to look up
   */
  const lookupEnglishWord = useCallback(async (word) => {
    // Clean up the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      setError({ message: 'No word provided' });
      return;
    }
    
    // Reset state for new lookup
    resetState();
    setCurrentWord(trimmedWord);
    setLoading(true);
    setWordLanguage('en');
    
    try {
      // Check cache first
      const cacheKey = `en:${trimmedWord}`;
      
      if (useCache && definitionCache.has(cacheKey)) {
        const cachedEntry = definitionCache.get(cacheKey);
        setDefinition(cachedEntry.data);
        setLoading(false);
        
        // Update search history
        updateSearchHistory(trimmedWord, cachedEntry.data);
        return;
      }
      
      // Not in cache, fetch from API
      const result = await getEnglishDefinition(trimmedWord);
      
      if (result.error) {
        setError(result);
        setDefinition(null);
      } else {
        setDefinition(result);
        
        // Cache the result
        if (useCache) {
          definitionCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          // Clean up old cache entries
          cleanupCache();
        }
        
        // Update search history
        updateSearchHistory(trimmedWord, result);
      }
    } catch (err) {
      setError({ message: err.message });
      setDefinition(null);
    } finally {
      setLoading(false);
    }
  }, [useCache, cleanupCache, resetState]);

  /**
   * Look up a word in the Spanish dictionary
   * @param {string} word - Word to look up
   */
  const lookupSpanishWord = useCallback(async (word) => {
    // Clean up the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      setError({ message: 'No word provided' });
      return;
    }
    
    // Reset state for new lookup
    resetState();
    setCurrentWord(trimmedWord);
    setLoading(true);
    setWordLanguage('es');
    
    try {
      // Check cache first
      const cacheKey = `es:${trimmedWord}`;
      
      if (useCache && definitionCache.has(cacheKey)) {
        const cachedEntry = definitionCache.get(cacheKey);
        setDefinition(cachedEntry.data);
        setLoading(false);
        
        // Update search history
        updateSearchHistory(trimmedWord, cachedEntry.data);
        return;
      }
      
      // Not in cache, fetch from API
      const result = await getSpanishDefinition(trimmedWord);
      
      if (result.error) {
        setError(result);
        setDefinition(null);
      } else {
        setDefinition(result);
        
        // Cache the result
        if (useCache) {
          definitionCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          // Clean up old cache entries
          cleanupCache();
        }
        
        // Update search history
        updateSearchHistory(trimmedWord, result);
      }
    } catch (err) {
      setError({ message: err.message });
      setDefinition(null);
    } finally {
      setLoading(false);
    }
  }, [useCache, cleanupCache, resetState]);

  /**
   * Look up a word with automatic language detection
   * @param {string} word - Word to look up
   */
  const lookupWordAuto = useCallback(async (word) => {
    // Clean up the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      setError({ message: 'No word provided' });
      return;
    }
    
    // Reset state for new lookup
    resetState();
    setCurrentWord(trimmedWord);
    setLoading(true);
    
    try {
      // Check cache first with auto prefix
      const cacheKey = `auto:${trimmedWord}`;
      
      if (useCache && definitionCache.has(cacheKey)) {
        const cachedEntry = definitionCache.get(cacheKey);
        setDefinition(cachedEntry.data);
        setLoading(false);
        
        // Update search history
        updateSearchHistory(trimmedWord, cachedEntry.data);
        // Set the word language from cached result
        if (cachedEntry.data.detectedLanguage) {
          setWordLanguage(cachedEntry.data.detectedLanguage);
        }
        return;
      }
      
      // Not in cache, use multi-language lookup with Google language detection
      // Pass null as detectedLanguage to let getMultiLanguageDefinition handle detection
      const result = await getMultiLanguageDefinition(trimmedWord, null);
      
      if (result.error) {
        setError(result);
        setDefinition(null);
      } else {
        setDefinition(result);
        
        // Update word language from result
        if (result.detectedLanguage) {
          setWordLanguage(result.detectedLanguage);
        }
        
        // Cache the result
        if (useCache) {
          definitionCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          // Clean up old cache entries
          cleanupCache();
        }
        
        // Update search history
        updateSearchHistory(trimmedWord, result);
      }
    } catch (err) {
      setError({ message: err.message });
      setDefinition(null);
    } finally {
      setLoading(false);
    }
  }, [useCache, cleanupCache, resetState]);

  /**
   * Update the search history with the new word
   * @param {string} word - The word that was looked up
   * @param {Object} data - Definition data
   */
  const updateSearchHistory = (word, data) => {
    // Add to search history (most recent first)
    setSearchHistory(prev => {
      const newHistory = [word, ...prev.filter(w => w !== word)].slice(0, 50);
      return newHistory;
    });
    
    // Add to recent definitions (most recent first)
    setRecentDefinitions(prev => {
      const newDefinitions = [
        { word, data, timestamp: Date.now() },
        ...prev.filter(d => d.word !== word)
      ].slice(0, 10);
      return newDefinitions;
    });
  };
  
  /**
   * Get a random word and look it up
   * @param {string} level - Difficulty level
   */
  const lookupRandomWord = useCallback(async (level = 'medium') => {
    setLoading(true);
    try {
      const word = await getRandomWord(level);
      lookupWordAuto(word);
    } catch (err) {
      setError({ message: err.message });
      setLoading(false);
    }
  }, [lookupWordAuto]);
  
  /**
   * Clear the current definition
   */
  const clearDefinition = useCallback(() => {
    resetState();
    setCurrentWord('');
  }, [resetState]);

  // Clean up cache on component mount
  useEffect(() => {
    cleanupCache();
  }, [cleanupCache]);

  return {
    currentWord,
    loading,
    error,
    definition,
    wordLanguage,
    searchHistory,
    recentDefinitions,
    lookupEnglishWord,
    lookupSpanishWord,
    lookupWordAuto,
    lookupRandomWord,
    clearDefinition,
    resetState
  };
};

export default useDictionary;