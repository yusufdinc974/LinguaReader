/**
 * Text Processing Utility
 * Functions for processing and analyzing text, with a focus on vocabulary learning.
 * Enhanced with vocabulary highlighting and language detection capabilities.
 * Added support for CJK (Chinese, Japanese, Korean) languages.
 */

// Note: To fully implement CJK language support, install these packages:
// npm install kuromoji wanakana tiny-segmenter nodejieba

/**
 * Clean a word by removing punctuation and normalizing
 * Enhanced to handle CJK characters
 * @param {string} word - The word to clean
 * @param {string} language - Language of the word
 * @returns {string} - The cleaned word
 */
export const cleanWord = (word, language = 'en') => {
  if (!word) return '';
  
  // For CJK languages, we often want to preserve the character as is
  if (['ja', 'zh', 'ko'].includes(language)) {
    return word;
  }
  
  // Remove punctuation at the beginning and end
  let cleaned = word.replace(/^[^\w]+|[^\w]+$/g, '');
  
  // Convert to lowercase for standardization
  cleaned = cleaned.toLowerCase();
  
  return cleaned;
};

/**
 * Check if a string is a valid word
 * Enhanced to handle CJK characters
 * @param {string} word - Word to check
 * @param {string} language - Language of the word
 * @returns {boolean} - True if it's a valid word
 */
export const isValidWord = (word, language = 'en') => {
  if (!word) return false;
  
  // For CJK languages, any non-whitespace character is valid
  if (['ja', 'zh', 'ko'].includes(language)) {
    return word.trim().length > 0;
  }
  
  const cleaned = cleanWord(word);
  
  // Minimum length check
  if (cleaned.length < 2) return false;
  
  // Must contain at least one letter
  if (!/[a-z]/i.test(cleaned)) return false;
  
  return true;
};

/**
 * Extract words from a text string with proper CJK language support
 * @param {string} text - Text to extract words from
 * @param {string} language - Language code of the text
 * @returns {Array} - Array of extracted words
 */
export const extractWords = (text, language = null) => {
  if (!text) return [];
  
  // Auto-detect language if not provided
  const detectedLanguage = language || detectLanguage(text);
  
  // Use language-specific tokenization
  switch (detectedLanguage) {
    case 'ja':
      return extractJapaneseWords(text);
    case 'zh':
      return extractChineseWords(text);
    case 'ko':
      return extractKoreanWords(text);
    default:
      // Original logic for space-delimited languages
      const wordMatches = text.match(/\b[\w''-]+\b/g) || [];
      return wordMatches
        .map(word => cleanWord(word))
        .filter(word => isValidWord(word));
  }
};

/**
 * Extract words from Japanese text
 * @param {string} text - Japanese text
 * @returns {Array} - Array of extracted words
 */
export const extractJapaneseWords = (text) => {
  // This is a simplified implementation 
  // For production, you would use a proper tokenizer like Kuromoji
  
  // Simple implementation combining character-based and common patterns
  const words = [];
  let currentWord = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Skip whitespace and punctuation
    if (/\s|[！？。、（）［］【】「」『』…・]/.test(char)) {
      if (currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      continue;
    }
    
    // Character categories in Japanese
    const isKanji = /[\u4E00-\u9FFF]/.test(char);
    const isHiragana = /[\u3040-\u309F]/.test(char);
    const isKatakana = /[\u30A0-\u30FF]/.test(char);
    
    // Add individual kanji as separate words
    if (isKanji) {
      if (currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      words.push(char);
    } 
    // Group hiragana and katakana sequences
    else if (isHiragana || isKatakana) {
      currentWord += char;
    } 
    // Handle other characters
    else {
      if (currentWord) {
        words.push(currentWord);
        currentWord = '';
      }
      words.push(char);
    }
  }
  
  // Add any remaining word
  if (currentWord) {
    words.push(currentWord);
  }
  
  return words.filter(word => word.trim().length > 0);
};

/**
 * Extract words from Chinese text
 * @param {string} text - Chinese text
 * @returns {Array} - Array of extracted words
 */
export const extractChineseWords = (text) => {
  // For a real implementation, you would use a proper tokenizer like jieba
  
  // Simple character-based implementation for now
  const words = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Skip whitespace and punctuation
    if (/\s|[！？。，、（）［］【】""''…]/.test(char)) {
      continue;
    }
    
    // Add each character as a separate word
    words.push(char);
  }
  
  return words;
};

/**
 * Extract words from Korean text
 * @param {string} text - Korean text
 * @returns {Array} - Array of extracted words
 */
export const extractKoreanWords = (text) => {
  // For a real implementation, you would use a proper Korean tokenizer
  
  // Simple implementation that splits by space and then characters
  const words = [];
  const spaceDelimitedWords = text.split(/\s+/);
  
  for (const word of spaceDelimitedWords) {
    if (!word) continue;
    
    // For Korean, we'll add both the whole word and individual characters
    words.push(word);
    
    // Also add individual characters (for learning Hangul)
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      // Skip punctuation
      if (/[！？。，、（）［］【】""''…]/.test(char)) {
        continue;
      }
      words.push(char);
    }
  }
  
  return words.filter(word => word.trim().length > 0);
};

/**
 * Split text into sentences
 * Enhanced to recognize CJK sentence endings
 * @param {string} text - Text to split
 * @param {string} language - Language of the text
 * @returns {Array} - Array of sentences
 */
export const splitIntoSentences = (text, language = null) => {
  if (!text) return [];
  
  // Auto-detect language if not provided
  const detectedLanguage = language || detectLanguage(text);
  
  // CJK languages have different sentence terminators
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    // Split by common CJK sentence terminators
    const sentenceRegex = /[。！？!?]+/g;
    const sentences = text.split(sentenceRegex);
    
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Original logic for Latin script languages
  const sentenceRegex = /[.!?]+(?=\s+[A-Z]|$)/g;
  const sentences = text.split(sentenceRegex);
  
  return sentences.map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * Get a word in context (surrounding text)
 * Enhanced to handle CJK languages
 * @param {string} text - Full text
 * @param {string} word - Target word
 * @param {number} contextSize - Number of characters of context on each side
 * @param {string} language - Language of the text
 * @returns {Array} - Array of context strings containing the word
 */
export const getWordInContext = (text, word, contextSize = 50, language = null) => {
  if (!text || !word) return [];
  
  const detectedLanguage = language || detectLanguage(text);
  const contexts = [];
  
  // For CJK languages, we need to handle single characters differently
  if (['ja', 'zh', 'ko'].includes(detectedLanguage) && word.length === 1) {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === word) {
        const start = Math.max(0, i - contextSize);
        const end = Math.min(text.length, i + 1 + contextSize);
        
        let context = text.substring(start, end);
        
        // Add ellipsis if we've truncated the beginning or end
        if (start > 0) context = '...' + context;
        if (end < text.length) context = context + '...';
        
        contexts.push(context);
      }
    }
    
    return contexts;
  }
  
  // Original logic for multi-character words
  const wordRegex = new RegExp(`${word}`, 'g');
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
 * @param {string} language - Language of the text
 * @returns {Object} - Object mapping words to their frequencies
 */
export const getWordFrequency = (text, language = null) => {
  const detectedLanguage = language || detectLanguage(text);
  const words = extractWords(text, detectedLanguage);
  const frequency = {};
  
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  
  return frequency;
};

/**
 * Gets unique words from text
 * @param {string} text - Text to process
 * @param {string} language - Language of the text
 * @returns {Array} - Array of unique words
 */
export const getUniqueWords = (text, language = null) => {
  const detectedLanguage = language || detectLanguage(text);
  const words = extractWords(text, detectedLanguage);
  return [...new Set(words)];
};

/**
 * Calculate reading level metrics for text
 * @param {string} text - Text to analyze
 * @param {string} language - Language of the text
 * @returns {Object} - Object with reading level metrics
 */
export const calculateReadingLevel = (text, language = null) => {
  const detectedLanguage = language || detectLanguage(text);
  const words = extractWords(text, detectedLanguage);
  const sentences = splitIntoSentences(text, detectedLanguage);
  
  if (words.length === 0 || sentences.length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      averageWordLength: 0,
      averageWordsPerSentence: 0
    };
  }
  
  // For CJK languages, word length has different meaning
  let totalWordLength;
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    // For CJK, we count the number of characters
    totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
  } else {
    // For other languages, we use the original logic
    totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
  }
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    averageWordLength: totalWordLength / words.length,
    averageWordsPerSentence: words.length / sentences.length
  };
};

/**
 * Detect probable language of text
 * Enhanced detection for CJK languages
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code
 */
export const detectLanguage = (text) => {
  if (!text || text.length < 10) return 'en';
  
  // Check for CJK scripts with better differentiation
  
  // Japanese specific characters (hiragana and katakana)
  const hasJapaneseSpecific = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  
  // Korean specific characters (Hangul)
  const hasKoreanSpecific = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
  
  // Chinese/Kanji characters (shared by Japanese and Chinese)
  const hasHanCharacters = /[\u4E00-\u9FFF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF]/.test(text);
  
  // Check for Japanese first (presence of hiragana/katakana is a strong indicator)
  if (hasJapaneseSpecific) {
    return 'ja';
  }
  
  // Check for Korean
  if (hasKoreanSpecific) {
    return 'ko';
  }
  
  // If we have Han characters but no hiragana/katakana or Hangul, it's likely Chinese
  if (hasHanCharacters) {
    return 'zh';
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
 * Enhanced for CJK languages
 * @param {string} text - Text to split
 * @param {string} language - Language of the text
 * @returns {Array} - Array of tokens (words, whitespace, punctuation)
 */
export const splitTextIntoTokens = (text, language = null) => {
  if (!text) return [];
  
  const detectedLanguage = language || detectLanguage(text);
  
  // For CJK languages, we tokenize differently
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    // For CJK, we tokenize each character individually
    const tokens = [];
    for (let i = 0; i < text.length; i++) {
      tokens.push(text[i]);
    }
    return tokens;
  }
  
  // Original logic for Latin script languages
  return text.split(/(\b\w+\b|\s+|[^\w\s]+)/g).filter(Boolean);
};

/**
 * Process text for highlighting vocabulary words
 * Enhanced to handle CJK languages
 * @param {string} text - Text to process
 * @param {Function} checkWordCallback - Function to check if a word is in vocabulary
 * @param {string} language - Language of the text
 * @param {string} targetLang - Optional target language for translation
 * @returns {string} - HTML string with highlighted words
 */
export const processTextForHighlighting = (text, checkWordCallback, language = 'en', targetLang = null) => {
  if (!text || !checkWordCallback) return text;
  
  const detectedLanguage = language || detectLanguage(text);
  
  // For CJK languages, we need special handling
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    return processCJKTextForHighlighting(text, checkWordCallback, detectedLanguage, targetLang);
  }
  
  // Original logic for Latin script languages
  const tokens = splitTextIntoTokens(text);
  
  const processedTokens = tokens.map(token => {
    // Skip whitespace and punctuation
    if (!token.trim() || token.match(/^\s+$/) || token.match(/^[.,;:!?()'"''""—–-]+$/)) {
      return token;
    }
    
    const cleanedToken = cleanWord(token, detectedLanguage);
    const wordInfo = checkWordCallback(cleanedToken, detectedLanguage, targetLang);
    
    if (wordInfo) {
      const level = wordInfo.familiarityRating || 1;
      return `<span class="vocabulary-word level-${level}" data-word-id="${wordInfo.id}" data-source-lang="${wordInfo.sourceLang}" data-target-lang="${wordInfo.targetLang}">${token}</span>`;
    }
    
    return token;
  });
  
  return processedTokens.join('');
};

/**
 * Process CJK text for highlighting vocabulary words
 * @param {string} text - Text to process
 * @param {Function} checkWordCallback - Function to check if a word is in vocabulary
 * @param {string} language - Language of the text (ja, zh, ko)
 * @param {string} targetLang - Optional target language for translation
 * @returns {string} - HTML string with highlighted characters/words
 */
export const processCJKTextForHighlighting = (text, checkWordCallback, language, targetLang = null) => {
  if (!text) return '';
  
  let result = '';
  
  // For Japanese, we'll try to detect common word patterns
  if (language === 'ja') {
    // In a real implementation, use a tokenizer like Kuromoji
    // For now, use a character-by-character approach with special handling
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Skip whitespace
      if (char.trim() === '') {
        result += char;
        continue;
      }
      
      // Check if character is in vocabulary
      const wordInfo = checkWordCallback(char, language, targetLang);
      
      if (wordInfo) {
        const level = wordInfo.familiarityRating || 1;
        result += `<span class="vocabulary-word level-${level}" data-word-id="${wordInfo.id}" data-source-lang="${wordInfo.sourceLang}" data-target-lang="${wordInfo.targetLang}" data-is-cjk="true">${char}</span>`;
      } else {
        result += char;
      }
    }
    
    return result;
  }
  
  // For Chinese, process each character
  if (language === 'zh') {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Skip whitespace and punctuation
      if (/\s|[！？。，、（）［］【】""''…]/.test(char)) {
        result += char;
        continue;
      }
      
      // Check if character is in vocabulary
      const wordInfo = checkWordCallback(char, language, targetLang);
      
      if (wordInfo) {
        const level = wordInfo.familiarityRating || 1;
        result += `<span class="vocabulary-word level-${level}" data-word-id="${wordInfo.id}" data-source-lang="${wordInfo.sourceLang}" data-target-lang="${wordInfo.targetLang}" data-is-cjk="true">${char}</span>`;
      } else {
        result += char;
      }
    }
    
    return result;
  }
  
  // For Korean, process characters and words
  if (language === 'ko') {
    // Split by space first
    const words = text.split(/(\s+)/);
    
    for (const word of words) {
      // If it's a space, add it directly
      if (!word.trim()) {
        result += word;
        continue;
      }
      
      // Check if the whole word is in vocabulary
      const wordInfo = checkWordCallback(word, language, targetLang);
      
      if (wordInfo) {
        const level = wordInfo.familiarityRating || 1;
        result += `<span class="vocabulary-word level-${level}" data-word-id="${wordInfo.id}" data-source-lang="${wordInfo.sourceLang}" data-target-lang="${wordInfo.targetLang}" data-is-cjk="true">${word}</span>`;
      } else {
        // Process individual characters
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          
          // Check if character is in vocabulary
          const charInfo = checkWordCallback(char, language, targetLang);
          
          if (charInfo) {
            const level = charInfo.familiarityRating || 1;
            result += `<span class="vocabulary-word level-${level}" data-word-id="${charInfo.id}" data-source-lang="${charInfo.sourceLang}" data-target-lang="${charInfo.targetLang}" data-is-cjk="true">${char}</span>`;
          } else {
            result += char;
          }
        }
      }
    }
    
    return result;
  }
  
  // Fallback for other languages
  return text;
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
    
    // For CJK languages, also store without lowercasing
    if (['ja', 'zh', 'ko'].includes(word.sourceLang)) {
      const cjkKey = `${word.word}:${word.sourceLang}`;
      wordMap[cjkKey] = word;
    }
    
    // Key by word+sourceLang+targetLang for precise matching
    const fullKey = `${word.word.toLowerCase()}:${word.sourceLang}:${word.targetLang}`;
    wordMap[fullKey] = word;
    
    // For CJK languages, also store without lowercasing
    if (['ja', 'zh', 'ko'].includes(word.sourceLang)) {
      const cjkFullKey = `${word.word}:${word.sourceLang}:${word.targetLang}`;
      wordMap[cjkFullKey] = word;
    }
  });
  
  return wordMap;
};

/**
 * Find vocabulary words in a page of text
 * Enhanced to handle CJK languages
 * @param {string} pageText - Text content of the page
 * @param {Object} wordMap - Map of vocabulary words
 * @param {string} language - Language of the page
 * @param {string} targetLang - Optional target language for translation
 * @returns {Array} - Array of found words with positions
 */
export const findVocabularyWordsInPage = (pageText, wordMap, language = 'en', targetLang = null) => {
  if (!pageText || !wordMap) return [];
  
  const detectedLanguage = language || detectLanguage(pageText);
  const foundWords = [];
  
  // For CJK languages, we need special handling
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    // For CJK, check each character
    for (let i = 0; i < pageText.length; i++) {
      const char = pageText[i];
      
      // Skip whitespace and punctuation
      if (/\s|[！？。，、（）［］【】""''…]/.test(char)) {
        continue;
      }
      
      // Try different key combinations for matching
      const sourceKey = `${char}:${detectedLanguage}`;
      const fullKey = targetLang ? `${char}:${detectedLanguage}:${targetLang}` : null;
      
      // First try the most specific match with source and target language
      let wordInfo = fullKey ? wordMap[fullKey] : null;
      
      // If not found, try with just source language
      if (!wordInfo) {
        wordInfo = wordMap[sourceKey];
      }
      
      if (wordInfo) {
        foundWords.push({
          word: char,
          index: i,
          length: char.length,
          ...wordInfo
        });
      }
    }
    
    // For Japanese and Korean, also check for longer word sequences
    if (detectedLanguage === 'ja' || detectedLanguage === 'ko') {
      const words = detectedLanguage === 'ja' ? 
        extractJapaneseWords(pageText) : 
        extractKoreanWords(pageText);
      
      for (const word of words) {
        if (word.length <= 1) continue; // Skip single characters, already handled
        
        // Try different key combinations for matching
        const sourceKey = `${word}:${detectedLanguage}`;
        const fullKey = targetLang ? `${word}:${detectedLanguage}:${targetLang}` : null;
        
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
          
          while ((index = pageText.indexOf(word, position)) !== -1) {
            foundWords.push({
              word,
              index,
              length: word.length,
              ...wordInfo
            });
            
            position = index + 1;
          }
        }
      }
    }
  } else {
    // Original logic for Latin script languages
    const words = extractWords(pageText, detectedLanguage);
    
    // Check each word
    for (const word of words) {
      // Try different key combinations for matching
      const sourceKey = `${word}:${detectedLanguage}`;
      const fullKey = targetLang ? `${word}:${detectedLanguage}:${targetLang}` : null;
      
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
  }
  
  // Sort by position
  return foundWords.sort((a, b) => a.index - b.index);
};

/**
 * Generate HTML for text with vocabulary words highlighted
 * @param {string} text - Original text
 * @param {Array} foundWords - Array of found vocabulary words with positions
 * @param {Function} getColorCallback - Function to get highlight color
 * @param {string} language - Language of the text
 * @returns {string} - HTML with highlighted words
 */
export const generateHighlightedHTML = (text, foundWords, getColorCallback, language = 'en') => {
  if (!text || !foundWords || !foundWords.length) return text;
  
  const detectedLanguage = language || detectLanguage(text);
  let result = '';
  let lastIndex = 0;
  
  // Process each found word
  for (const word of foundWords) {
    // Add text before the word
    result += text.substring(lastIndex, word.index);
    
    // Get highlight color
    const color = getColorCallback ? getColorCallback(word.familiarityRating) : null;
    
    // Add special class for CJK characters
    const cjkClass = ['ja', 'zh', 'ko'].includes(detectedLanguage) ? ' cjk-character' : '';
    
    // Add the highlighted word
    if (color) {
      result += `<span class="vocabulary-word level-${word.familiarityRating}${cjkClass}" 
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

/**
 * Get character metadata for CJK characters
 * @param {string} character - Single CJK character
 * @param {string} language - Language of the character (ja, zh, ko)
 * @returns {Object} - Character metadata
 */
export const getCharacterMetadata = (character, language) => {
  // This is a simplified implementation
  // In a real app, you would use a database of character information
  
  // Basic metadata placeholder
  const metadata = {
    character,
    language,
    type: '',
    strokes: null,
    meaning: '',
    readings: [],
    examples: []
  };
  
  // Detect character type
  if (language === 'ja') {
    if (/[\u4E00-\u9FFF]/.test(character)) {
      metadata.type = 'kanji';
    } else if (/[\u3040-\u309F]/.test(character)) {
      metadata.type = 'hiragana';
    } else if (/[\u30A0-\u30FF]/.test(character)) {
      metadata.type = 'katakana';
    }
  } else if (language === 'zh') {
    metadata.type = 'hanzi';
  } else if (language === 'ko') {
    if (/[\uAC00-\uD7AF]/.test(character)) {
      metadata.type = 'hangul';
    } else if (/[\u4E00-\u9FFF]/.test(character)) {
      metadata.type = 'hanja';
    }
  }
  
  return metadata;
};

export default {
  cleanWord,
  isValidWord,
  extractWords,
  extractJapaneseWords,
  extractChineseWords,
  extractKoreanWords,
  splitIntoSentences,
  getWordInContext,
  getWordFrequency,
  getUniqueWords,
  calculateReadingLevel,
  detectLanguage,
  splitTextIntoTokens,
  processTextForHighlighting,
  processCJKTextForHighlighting,
  findVocabularyWordsInPage,
  generateHighlightedHTML,
  createWordMap,
  getHighlightColor,
  getCharacterMetadata
};