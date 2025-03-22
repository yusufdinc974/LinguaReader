/**
 * Text Processing Utility
 * Functions for processing and analyzing text, with a focus on vocabulary learning.
 * Enhanced with vocabulary highlighting and language detection capabilities.
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
 * Enhanced detection based on common words and character patterns
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code
 */
export const detectLanguage = (text) => {
  if (!text || text.length < 10) return 'en';
  
  // Check for non-Latin scripts first
  // Chinese (simplified)
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }
  
  // Japanese (includes hiragana, katakana and kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return 'ja';
  }
  
  // Korean
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return 'ko';
  }
  
  // Russian (Cyrillic)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru';
  }
  
  // Arabic
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar';
  }
  
  // Check for special Latin characters
  // If text contains Spanish characters, likely Spanish
  if (/[áéíóúüñ¿¡]/i.test(text)) {
    return 'es';
  }
  
  // If text contains French characters, likely French
  if (/[àâçéèêëîïôùûüÿæœ]/i.test(text)) {
    return 'fr';
  }
  
  // If text contains German characters, likely German
  if (/[äöüß]/i.test(text)) {
    return 'de';
  }
  
  // Check common word patterns for Latin alphabets
  const commonEnglishWords = ['the', 'and', 'of', 'to', 'in', 'a', 'is', 'that', 'for', 'it'];
  const commonSpanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'];
  const commonFrenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'être', 'que', 'en', 'qui'];
  const commonGermanWords = ['der', 'die', 'das', 'und', 'ist', 'in', 'von', 'zu', 'mit', 'den'];
  
  const words = extractWords(text.toLowerCase());
  
  let englishCount = 0;
  let spanishCount = 0;
  let frenchCount = 0;
  let germanCount = 0;
  
  for (const word of words) {
    if (commonEnglishWords.includes(word)) englishCount++;
    if (commonSpanishWords.includes(word)) spanishCount++;
    if (commonFrenchWords.includes(word)) frenchCount++;
    if (commonGermanWords.includes(word)) germanCount++;
  }
  
  // Calculate relative frequency
  const totalWords = words.length || 1; // Avoid division by zero
  const englishFreq = englishCount / totalWords;
  const spanishFreq = spanishCount / totalWords;
  const frenchFreq = frenchCount / totalWords;
  const germanFreq = germanCount / totalWords;
  
  // Find highest frequency
  const frequencies = [
    { lang: 'en', freq: englishFreq },
    { lang: 'es', freq: spanishFreq },
    { lang: 'fr', freq: frenchFreq },
    { lang: 'de', freq: germanFreq }
  ];
  
  // Sort by frequency (descending)
  frequencies.sort((a, b) => b.freq - a.freq);
  
  // If highest frequency is significant, return that language
  if (frequencies[0].freq > 0.05) {
    return frequencies[0].lang;
  }
  
  // Default to English for Latin alphabet without special markers
  if (/^[a-z0-9\s.,;:!?"'()\-]+$/i.test(text)) {
    return 'en';
  }
  
  return 'en'; // Default fallback
};

/**
 * Split text into tokens while preserving whitespace and punctuation
 * Useful for preserving text structure when highlighting words
 * @param {string} text - Text to split
 * @returns {Array} - Array of tokens (words, whitespace, punctuation)
 */
export const splitTextIntoTokens = (text) => {
  if (!text) return [];
  
  // Split on word boundaries preserving whitespace and punctuation
  return text.split(/(\b\w+\b|\s+|[^\w\s]+)/g).filter(Boolean);
};

/**
 * Process text for highlighting vocabulary words
 * Enhanced to handle language-specific highlighting
 * @param {string} text - Text to process
 * @param {Function} checkWordCallback - Function to check if a word is in vocabulary (receives word, sourceLang, targetLang)
 * @param {string} language - Language of the text
 * @param {string} targetLang - Optional target language for translation
 * @returns {string} - HTML string with highlighted words
 */
export const processTextForHighlighting = (text, checkWordCallback, language = 'en', targetLang = null) => {
  if (!text || !checkWordCallback) return text;
  
  // Split text into tokens
  const tokens = splitTextIntoTokens(text);
  
  // Process each token
  const processedTokens = tokens.map(token => {
    // Skip whitespace and punctuation
    if (!token.trim() || token.match(/^\s+$/) || token.match(/^[.,;:!?()'"''""—–-]+$/)) {
      return token;
    }
    
    // Clean the token to match the stored word format
    const cleanedToken = cleanWord(token);
    
    // Check if word is in vocabulary with accurate language matching
    const wordInfo = checkWordCallback(cleanedToken, language, targetLang);
    
    if (wordInfo) {
      const level = wordInfo.familiarityRating || 1;
      return `<span class="vocabulary-word level-${level}" data-word-id="${wordInfo.id}" data-source-lang="${wordInfo.sourceLang}" data-target-lang="${wordInfo.targetLang}">${token}</span>`;
    }
    
    return token;
  });
  
  return processedTokens.join('');
};

/**
 * Create a word map for efficient lookup during highlighting
 * Enhanced to include language pair information
 * @param {Array} vocabularyWords - Array of vocabulary words
 * @returns {Object} - Map of words to their vocabulary info
 */
export const createWordMap = (vocabularyWords) => {
  const wordMap = {};
  
  vocabularyWords.forEach(word => {
    // Create multiple keys for different lookup scenarios
    
    // Key by word+sourceLang
    const sourceLangKey = `${word.word.toLowerCase()}:${word.sourceLang}`;
    wordMap[sourceLangKey] = word;
    
    // Key by word+sourceLang+targetLang for precise matching
    const fullKey = `${word.word.toLowerCase()}:${word.sourceLang}:${word.targetLang}`;
    wordMap[fullKey] = word;
  });
  
  return wordMap;
};

/**
 * Find vocabulary words in a page of text
 * Enhanced to handle language-specific matching
 * @param {string} pageText - Text content of the page
 * @param {Object} wordMap - Map of vocabulary words
 * @param {string} language - Language of the page
 * @param {string} targetLang - Optional target language for translation
 * @returns {Array} - Array of found words with positions
 */
export const findVocabularyWordsInPage = (pageText, wordMap, language = 'en', targetLang = null) => {
  if (!pageText || !wordMap) return [];
  
  const foundWords = [];
  const words = extractWords(pageText);
  
  // Check each word
  for (const word of words) {
    // Try different key combinations for matching
    const sourceKey = `${word}:${language}`;
    const fullKey = targetLang ? `${word}:${language}:${targetLang}` : null;
    
    // First try the most specific match with source and target language
    let wordInfo = fullKey ? wordMap[fullKey] : null;
    
    // If not found, try with just source language
    if (!wordInfo) {
      wordInfo = wordMap[sourceKey];
    }
    
    if (wordInfo) {
      // Find all occurrences
      let position = 0;
      let index;
      const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
      
      while ((index = pageText.indexOf(word, position)) !== -1) {
        // Ensure it's a word boundary
        const prevChar = index > 0 ? pageText[index - 1] : ' ';
        const nextChar = index + word.length < pageText.length ? pageText[index + word.length] : ' ';
        
        if (!/[a-z0-9']/i.test(prevChar) && !/[a-z0-9']/i.test(nextChar)) {
          foundWords.push({
            word,
            index,
            length: word.length,
            ...wordInfo
          });
        }
        
        position = index + 1;
      }
    }
  }
  
  // Sort by position
  return foundWords.sort((a, b) => a.index - b.index);
};

/**
 * Generate HTML for text with vocabulary words highlighted
 * @param {string} text - Original text
 * @param {Array} foundWords - Array of found vocabulary words with positions
 * @param {Function} getColorCallback - Function to get highlight color
 * @returns {string} - HTML with highlighted words
 */
export const generateHighlightedHTML = (text, foundWords, getColorCallback) => {
  if (!text || !foundWords || !foundWords.length) return text;
  
  let result = '';
  let lastIndex = 0;
  
  // Process each found word
  for (const word of foundWords) {
    // Add text before the word
    result += text.substring(lastIndex, word.index);
    
    // Get highlight color
    const color = getColorCallback ? getColorCallback(word.familiarityRating) : null;
    
    // Add the highlighted word
    if (color) {
      result += `<span class="vocabulary-word level-${word.familiarityRating}" 
                      style="background-color: ${color};" 
                      data-word-id="${word.id}"
                      data-source-lang="${word.sourceLang}"
                      data-target-lang="${word.targetLang}">`;
      result += text.substr(word.index, word.length);
      result += '</span>';
    } else {
      result += text.substr(word.index, word.length);
    }
    
    lastIndex = word.index + word.length;
  }
  
  // Add any remaining text
  result += text.substring(lastIndex);
  
  return result;
};

/**
 * Get the appropriate color for a familiarity level
 * @param {Object} settings - Application settings containing highlight colors
 * @param {number} level - Familiarity level (1-5)
 * @returns {string} - CSS color value
 */
export const getHighlightColor = (settings, level) => {
  if (!settings || !settings.highlightColors) {
    // Default colors if settings not available
    const defaultColors = [
      '#ff6b6b', // Red - Level 1
      '#feca57', // Yellow - Level 2
      '#48dbfb', // Light Blue - Level 3
      '#1dd1a1', // Green - Level 4
      '#c8d6e5'  // Light Gray - Level 5
    ];
    
    return defaultColors[level - 1] || defaultColors[0];
  }
  
  const colorSetting = settings.highlightColors.find(c => c.level === level);
  return colorSetting ? colorSetting.color : settings.highlightColors[0].color;
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
  detectLanguage,
  splitTextIntoTokens,
  processTextForHighlighting,
  findVocabularyWordsInPage,
  generateHighlightedHTML,
  createWordMap,
  getHighlightColor
};