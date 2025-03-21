/**
 * Text Processing Utility
 * Functions for processing and analyzing text, with a focus on vocabulary learning.
 */

/**
 * Clean a word by removing punctuation and normalizing
 * @param {string} word - The word to clean
 * @returns {string} - The cleaned word
 */
export const cleanWord = (word) => {
    if (!word) return '';
    
    // Remove punctuation at the beginning and end
    let cleaned = word.replace(/^[^\w]+|[^\w]+$/g, '');
    
    // Convert to lowercase for standardization
    cleaned = cleaned.toLowerCase();
    
    return cleaned;
  };
  
  /**
   * Check if a string is a valid word
   * @param {string} word - Word to check
   * @returns {boolean} - True if it's a valid word
   */
  export const isValidWord = (word) => {
    if (!word) return false;
    
    const cleaned = cleanWord(word);
    
    // Minimum length check
    if (cleaned.length < 2) return false;
    
    // Must contain at least one letter
    if (!/[a-z]/i.test(cleaned)) return false;
    
    return true;
  };
  
  /**
   * Extract words from a text string
   * @param {string} text - Text to extract words from
   * @returns {Array} - Array of extracted words
   */
  export const extractWords = (text) => {
    if (!text) return [];
    
    // Match words including those with apostrophes and hyphens
    const wordMatches = text.match(/\b[\w''-]+\b/g) || [];
    
    // Filter and clean the words
    return wordMatches
      .map(cleanWord)
      .filter(isValidWord);
  };
  
  /**
   * Split text into sentences
   * @param {string} text - Text to split
   * @returns {Array} - Array of sentences
   */
  export const splitIntoSentences = (text) => {
    if (!text) return [];
    
    // Split by common sentence terminators while handling exceptions
    const sentenceRegex = /[.!?]+(?=\s+[A-Z]|$)/g;
    const sentences = text.split(sentenceRegex);
    
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  };
  
  /**
   * Get a word in context (surrounding text)
   * @param {string} text - Full text
   * @param {string} word - Target word
   * @param {number} contextSize - Number of characters of context on each side
   * @returns {Array} - Array of context strings containing the word
   */
  export const getWordInContext = (text, word, contextSize = 50) => {
    if (!text || !word) return [];
    
    const contexts = [];
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const start = Math.max(0, match.index - contextSize);
      const end = Math.min(text.length, match.index + word.length + contextSize);
      
      let context = text.substring(start, end);
      
      // Add ellipsis if we've truncated the beginning or end
      if (start > 0) context = '...' + context;
      if (end < text.length) context = context + '...';
      
      contexts.push(context);
    }
    
    return contexts;
  };
  
  /**
   * Count word frequency in text
   * @param {string} text - Text to analyze
   * @returns {Object} - Object mapping words to their frequencies
   */
  export const getWordFrequency = (text) => {
    const words = extractWords(text);
    const frequency = {};
    
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
    
    return frequency;
  };
  
  /**
   * Gets unique words from text
   * @param {string} text - Text to process
   * @returns {Array} - Array of unique words
   */
  export const getUniqueWords = (text) => {
    const words = extractWords(text);
    return [...new Set(words)];
  };
  
  /**
   * Calculate reading level metrics for text
   * @param {string} text - Text to analyze
   * @returns {Object} - Object with reading level metrics
   */
  export const calculateReadingLevel = (text) => {
    const words = extractWords(text);
    const sentences = splitIntoSentences(text);
    
    if (words.length === 0 || sentences.length === 0) {
      return {
        wordCount: 0,
        sentenceCount: 0,
        averageWordLength: 0,
        averageWordsPerSentence: 0
      };
    }
    
    const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
    
    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordLength: totalWordLength / words.length,
      averageWordsPerSentence: words.length / sentences.length
    };
  };
  
  /**
   * Detect probable language of text
   * Simple detection based on common words
   * @param {string} text - Text to analyze
   * @returns {string} - Detected language code ('en', 'es', or 'unknown')
   */
  export const detectLanguage = (text) => {
    if (!text || text.length < 10) return 'unknown';
    
    const commonEnglishWords = ['the', 'and', 'of', 'to', 'in', 'a', 'is', 'that', 'for', 'it'];
    const commonSpanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'];
    
    const words = extractWords(text.toLowerCase());
    
    let englishCount = 0;
    let spanishCount = 0;
    
    for (const word of words) {
      if (commonEnglishWords.includes(word)) englishCount++;
      if (commonSpanishWords.includes(word)) spanishCount++;
    }
    
    // Calculate relative frequency
    const englishFreq = englishCount / words.length;
    const spanishFreq = spanishCount / words.length;
    
    if (englishFreq > spanishFreq && englishFreq > 0.05) return 'en';
    if (spanishFreq > englishFreq && spanishFreq > 0.05) return 'es';
    
    return 'unknown';
  };
  
  export default {
    cleanWord,
    isValidWord,
    extractWords,
    splitIntoSentences,
    getWordInContext,
    getWordFrequency,
    getUniqueWords,
    calculateReadingLevel,
    detectLanguage
  };