import { useState, useEffect, useCallback } from 'react';
import { getWordDefinition, getCrossLanguageDefinition, getRandomWord } from '../services/dictionaryService';
import { cleanWord, isValidWord } from '../utils/textProcessing';
import { detectLanguage } from '../services/translationService';

// Local in-memory cache
const definitionCache = new Map();

/**
 * Custom hook for dictionary lookups with caching
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
  const [isTranslated, setIsTranslated] = useState(false);
  const [originalWord, setOriginalWord] = useState('');
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
   * Look up a word in the dictionary
   * @param {string} word - Word to look up
   * @param {string} language - Language code (default: 'en')
   */
  const lookupWord = useCallback(async (word, language = 'en') => {
    // Clean up the word
    const cleanedWord = cleanWord(word);
    
    // Validate the word
    if (!isValidWord(cleanedWord)) {
      setError({ message: 'Invalid word' });
      return;
    }
    
    setCurrentWord(cleanedWord);
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${language}:${cleanedWord}`;
      
      if (useCache && definitionCache.has(cacheKey)) {
        const cachedEntry = definitionCache.get(cacheKey);
        setDefinition(cachedEntry.data);
        setWordLanguage(cachedEntry.data.detectedLanguage || language);
        setIsTranslated(!!cachedEntry.data.isTranslated);
        setOriginalWord(cachedEntry.data.originalWord || cleanedWord);
        setLoading(false);
        
        // Update search history
        updateSearchHistory(cleanedWord, cachedEntry.data);
        return;
      }
      
      // Not in cache, fetch from API
      const result = await getWordDefinition(cleanedWord, language);
      
      if (result.error) {
        setError(result);
        setDefinition(null);
      } else {
        setDefinition(result);
        setWordLanguage(language);
        setIsTranslated(false);
        setOriginalWord(cleanedWord);
        
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
        updateSearchHistory(cleanedWord, result);
      }
    } catch (err) {
      setError({ message: err.message });
      setDefinition(null);
    } finally {
      setLoading(false);
    }
  }, [useCache, cleanupCache]);

  /**
   * Look up a word with automatic language detection and cross-language support
   * @param {string} word - Word to look up
   */
  const lookupWordAuto = useCallback(async (word) => {
    // Clean up the word
    const cleanedWord = cleanWord(word);
    
    // Validate the word
    if (!isValidWord(cleanedWord)) {
      setError({ message: 'Invalid word' });
      return;
    }
    
    setCurrentWord(cleanedWord);
    setLoading(true);
    setError(null);
    setIsTranslated(false);
    setOriginalWord('');
    
    try {
      // Check cache first with auto prefix
      const cacheKey = `auto:${cleanedWord}`;
      
      if (useCache && definitionCache.has(cacheKey)) {
        const cachedEntry = definitionCache.get(cacheKey);
        setDefinition(cachedEntry.data);
        setWordLanguage(cachedEntry.data.detectedLanguage || 'en');
        setIsTranslated(!!cachedEntry.data.isTranslated);
        setOriginalWord(cachedEntry.data.originalWord || cleanedWord);
        setLoading(false);
        
        // Update search history
        updateSearchHistory(cleanedWord, cachedEntry.data);
        return;
      }
      
      // Not in cache, use cross-language definition service
      const result = await getCrossLanguageDefinition(cleanedWord);
      
      if (result.error) {
        setError(result);
        setDefinition(null);
      } else {
        setDefinition(result);
        setWordLanguage(result.detectedLanguage || 'en');
        setIsTranslated(!!result.isTranslated);
        setOriginalWord(result.originalWord || cleanedWord);
        
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
        updateSearchHistory(cleanedWord, result);
      }
    } catch (err) {
      setError({ message: err.message });
      setDefinition(null);
    } finally {
      setLoading(false);
    }
  }, [useCache, cleanupCache]);

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
      lookupWord(word);
    } catch (err) {
      setError({ message: err.message });
      setLoading(false);
    }
  }, [lookupWord]);
  
  /**
   * Clear the current definition
   */
  const clearDefinition = useCallback(() => {
    setCurrentWord('');
    setDefinition(null);
    setError(null);
    setWordLanguage(null);
    setIsTranslated(false);
    setOriginalWord('');
  }, []);

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
    isTranslated,
    originalWord,
    searchHistory,
    recentDefinitions,
    lookupWord,
    lookupWordAuto,
    lookupRandomWord,
    clearDefinition
  };
};

export default useDictionary;