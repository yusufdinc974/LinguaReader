import { useState, useEffect, useCallback } from 'react';
import { translateText, detectLanguage, getSupportedLanguages } from '../services/translationService';

// Local in-memory cache
const translationCache = new Map();

/**
 * Custom hook for translation functionality with caching
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.useCache - Whether to use caching (default: true)
 * @param {number} options.cacheTTL - Cache time-to-live in milliseconds (default: 24h)
 * @returns {Object} - Translation functions and state
 */
const useTranslation = (options = {}) => {
  const { useCache = true, cacheTTL = 24 * 60 * 60 * 1000 } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [detectedLang, setDetectedLang] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [translationApi, setTranslationApi] = useState(null);
  
  /**
   * Clean up old entries from the cache
   */
  const cleanupCache = useCallback(() => {
    if (!useCache) return;
    
    const now = Date.now();
    for (const [key, entry] of translationCache.entries()) {
      if (now - entry.timestamp > cacheTTL) {
        translationCache.delete(key);
      }
    }
  }, [useCache, cacheTTL]);
  
  /**
   * Reset the translation state
   */
  const resetTranslation = useCallback(() => {
    setTranslatedText('');
    setError(null);
    setTranslationApi(null);
  }, []);
  
  /**
   * Effect to reset translation when languages change
   */
  useEffect(() => {
    // Reset translated text when language settings change
    if (originalText) {
      // Re-translate with new language settings
      translate(originalText, sourceLang, targetLang);
    } else {
      resetTranslation();
    }
  }, [sourceLang, targetLang]);
  
  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} from - Source language code (default: current sourceLang)
   * @param {string} to - Target language code (default: current targetLang)
   */
  const translate = useCallback(async (text, from = sourceLang, to = targetLang) => {
    if (!text || text.trim() === '') {
      setTranslatedText('');
      setOriginalText('');
      return;
    }
    
    // Always update the original text
    setOriginalText(text);
    
    // Reset translated text before starting a new translation
    setTranslatedText('');
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first
      const cacheKey = `${from}:${to}:${text}`;
      
      if (useCache && translationCache.has(cacheKey)) {
        const cachedEntry = translationCache.get(cacheKey);
        setTranslatedText(cachedEntry.data.translated);
        setTranslationApi(cachedEntry.data.api);
        setLoading(false);
        return;
      }
      
      // Not in cache, perform translation
      const result = await translateText(text, from, to);
      
      if (result.error) {
        setError({ message: result.message || 'Translation failed' });
        setTranslatedText('');
      } else {
        setTranslatedText(result.translated);
        setTranslationApi(result.api);
        
        // Cache the result
        if (useCache) {
          translationCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          // Clean up old cache entries
          cleanupCache();
        }
      }
    } catch (err) {
      setError({ message: err.message });
      setTranslatedText('');
    } finally {
      setLoading(false);
    }
  }, [sourceLang, targetLang, useCache, cleanupCache]);
  
  /**
   * Auto-detect language of text and set it as source language
   * @param {string} text - Text to detect language for
   * @returns {Promise<string>} - Detected language code
   */
  const detectAndSetLanguage = useCallback(async (text) => {
    if (!text || text.trim() === '') return sourceLang;
    
    try {
      const result = await detectLanguage(text);
      
      if (!result.error) {
        setDetectedLang({
          code: result.detected,
          confidence: result.confidence
        });
        
        // Set the detected language as source language if confidence is high enough
        if (result.confidence > 0.5) {
          // Only update if different from current
          if (result.detected !== sourceLang) {
            setSourceLang(result.detected);
            
            // Set target language to the opposite of the detected language
            if (result.detected === 'en') {
              setTargetLang('es');
            } else if (result.detected === 'es') {
              setTargetLang('en');
            }
          }
          return result.detected;
        }
      }
    } catch (err) {
      console.error('Language detection error:', err);
    }
    
    return sourceLang;
  }, [sourceLang]);
  
  /**
   * Translate a word with automatic language detection
   * @param {string} word - Word to translate
   */
  const translateWithDetection = useCallback(async (word) => {
    if (!word || word.trim() === '') {
      resetTranslation();
      return;
    }
    
    // First detect the language
    try {
      setLoading(true);
      const detectedSource = await detectAndSetLanguage(word);
      
      // Determine target based on detected source
      const detectedTarget = detectedSource === 'en' ? 'es' : 'en';
      
      // Now translate with the detected settings
      await translate(word, detectedSource, detectedTarget);
    } catch (err) {
      console.error('Translation with detection error:', err);
      setError({ message: 'Failed to detect language and translate' });
    } finally {
      setLoading(false);
    }
  }, [detectAndSetLanguage, translate, resetTranslation]);
  
  /**
   * Switch source and target languages
   */
  const swapLanguages = useCallback(() => {
    const newSource = targetLang;
    const newTarget = sourceLang;
    
    setSourceLang(newSource);
    setTargetLang(newTarget);
    
    // Also swap the text if we have a translation
    if (originalText && translatedText) {
      setOriginalText(translatedText);
      // The re-translation will happen in the useEffect
    }
  }, [sourceLang, targetLang, originalText, translatedText]);
  
  /**
   * Clear current translation
   */
  const clearTranslation = useCallback(() => {
    setOriginalText('');
    setTranslatedText('');
    setError(null);
    setTranslationApi(null);
  }, []);
  
  // Initialize supported languages
  useEffect(() => {
    setLanguages(getSupportedLanguages());
  }, []);
  
  // Clean up cache on component mount
  useEffect(() => {
    cleanupCache();
  }, [cleanupCache]);
  
  return {
    loading,
    error,
    originalText,
    translatedText,
    sourceLang,
    targetLang,
    detectedLang,
    translationApi,
    languages,
    translate,
    detectAndSetLanguage,
    translateWithDetection,
    setSourceLang,
    setTargetLang,
    swapLanguages,
    clearTranslation,
    resetTranslation
  };
};

export default useTranslation;