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
 * Extract words from a text string with proper position tracking
 * @param {string} text - Text to extract words from
 * @param {string} language - Language code of the text
 * @returns {Array} - Array of extracted words with positions
 */
export const extractWords = (text, language = null) => {
  if (!text) return [];
  
  // Auto-detect language if not provided
  const detectedLanguage = language || detectLanguage(text);
  
  // Use language-specific tokenization
  switch (detectedLanguage) {
    case 'ja':
    case 'zh':
    case 'ko':
      // For CJK languages, preserve the original text without splitting
      return [{
        text: text,
        position: 0,
        length: text.length,
        language: detectedLanguage
      }];
    default:
      // For Latin languages, use word boundary matching
      const words = [];
      const regex = /\b[\p{L}\p{N}]+(?:[-''][\p{L}\p{N}]+)*\b/gu;
      let match;
      
      // Track processed positions to prevent duplicates
      const processedPositions = new Set();
      
      while ((match = regex.exec(text)) !== null) {
        const position = match.index;
        const originalWord = match[0];
        
        // Create a unique position identifier
        const positionKey = `${originalWord}:${position}`;
        
        // Only add if we haven't processed this exact position before
        if (!processedPositions.has(positionKey)) {
          processedPositions.add(positionKey);
          
          words.push({
            text: originalWord,
            position: position,
            length: originalWord.length,
            language: detectedLanguage,
            cleaned: originalWord.toLowerCase().replace(/^[^\w\u0080-\uFFFF]+|[^\w\u0080-\uFFFF]+$/g, '')
          });
        }
      }
      
      return words;
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
 * Detects the language of a given text with high accuracy
 * @param {string} text - The text to analyze
 * @returns {string} - The detected language code ('en', 'es', 'ja', 'zh', 'ko', etc.)
 */
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en';

  // Clean the text first
  const cleanText = text.trim();
  if (!cleanText) return 'en';

  // Character type counters
  const counts = {
    latin: 0,          // Basic Latin letters
    latinExt: 0,       // Extended Latin (accented characters)
    cjk: 0,            // Chinese/Japanese Kanji
    hiragana: 0,       // Japanese Hiragana
    katakana: 0,       // Japanese Katakana
    hangul: 0,         // Korean Hangul
    cyrillic: 0,       // Russian and other Cyrillic scripts
    arabic: 0,         // Arabic script
    devanagari: 0,     // Hindi and other Indic scripts
    thai: 0,           // Thai script
    punctuation: 0     // General punctuation
  };

  // Regular expressions for different scripts
  const patterns = {
    latin: /[a-zA-Z]/,
    latinExt: /[\u00C0-\u00FF\u0100-\u017F]/,
    cjk: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
    hiragana: /[\u3040-\u309F]/,
    katakana: /[\u30A0-\u30FF]/,
    hangul: /[\uAC00-\uD7AF\u1100-\u11FF]/,
    cyrillic: /[\u0400-\u04FF]/,
    arabic: /[\u0600-\u06FF]/,
    devanagari: /[\u0900-\u097F]/,
    thai: /[\u0E00-\u0E7F]/,
    punctuation: /[!.,;:?'"()\-]/
  };

  // Common words patterns for different languages
  const commonPatterns = {
    en: /\b(the|and|in|to|of|a|is|that|for|it|with|you|this|on|are|was|have)\b/gi,
    es: /\b(el|la|en|de|que|y|a|los|se|del|las|un|por|con|una|su|para|es)\b/gi,
    fr: /\b(le|la|les|des|un|une|et|en|de|du|dans|sur|pour|par|avec|qui)\b/gi,
    de: /\b(der|die|das|und|in|zu|den|mit|von|für|auf|dem|sie|ist|ein)\b/gi,
    pt: /\b(o|a|de|que|e|do|da|em|um|para|com|não|uma|os|no|se)\b/gi
  };

  // Count character types
  for (const char of cleanText) {
    for (const [script, pattern] of Object.entries(patterns)) {
      if (pattern.test(char)) {
        counts[script]++;
      }
    }
  }

  // Calculate total meaningful characters (excluding punctuation and spaces)
  const totalChars = Object.values(counts).reduce((sum, count) => sum + count, 0) - counts.punctuation;
  if (totalChars === 0) return 'en';

  // Calculate percentages
  const percentages = {};
  for (const [script, count] of Object.entries(counts)) {
    if (script !== 'punctuation') {
      percentages[script] = (count / totalChars) * 100;
    }
  }

  // Common word matches for Latin-based languages
  const wordMatches = {};
  if (percentages.latin + percentages.latinExt > 30) {
    for (const [lang, pattern] of Object.entries(commonPatterns)) {
      const matches = cleanText.match(pattern) || [];
      wordMatches[lang] = matches.length;
    }
  }

  // Decision logic with thresholds
  const STRONG_THRESHOLD = 60;  // Strong indication of a script
  const MEDIUM_THRESHOLD = 30;  // Medium indication of a script
  const WEAK_THRESHOLD = 15;    // Weak indication of a script

  // Japanese detection (combination of Kanji, Hiragana, and Katakana)
  const japaneseTotal = percentages.hiragana + percentages.katakana + percentages.cjk;
  if (japaneseTotal > MEDIUM_THRESHOLD && percentages.hiragana > 5) {
    return 'ja';
  }

  // Korean detection (Hangul with possible Hanja)
  if (percentages.hangul > MEDIUM_THRESHOLD) {
    return 'ko';
  }

  // Chinese detection (primarily CJK characters)
  if (percentages.cjk > STRONG_THRESHOLD && percentages.hiragana + percentages.katakana < 5) {
    return 'zh';
  }

  // Latin script languages
  if (percentages.latin + percentages.latinExt > MEDIUM_THRESHOLD) {
    // Find the language with the most common word matches
    const maxMatches = Math.max(...Object.values(wordMatches));
    if (maxMatches > 0) {
      const detectedLang = Object.keys(wordMatches).find(lang => wordMatches[lang] === maxMatches);
      return detectedLang;
    }
  }

  // Other scripts
  if (percentages.cyrillic > STRONG_THRESHOLD) return 'ru';
  if (percentages.arabic > STRONG_THRESHOLD) return 'ar';
  if (percentages.devanagari > STRONG_THRESHOLD) return 'hi';
  if (percentages.thai > STRONG_THRESHOLD) return 'th';

  // If no strong matches found, use the script with the highest percentage
  const dominantScript = Object.entries(percentages)
    .filter(([script]) => script !== 'punctuation')
    .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

  // Map dominant script to language
  const scriptToLang = {
    latin: 'en',
    latinExt: 'en',
    cjk: 'zh',
    hiragana: 'ja',
    katakana: 'ja',
    hangul: 'ko',
    cyrillic: 'ru',
    arabic: 'ar',
    devanagari: 'hi',
    thai: 'th'
  };

  return scriptToLang[dominantScript] || 'en';
};

/**
 * Split text into tokens while preserving positions
 * @param {string} text - Text to split
 * @param {string} language - Language of the text
 * @returns {Array} - Array of tokens with positions
 */
export const splitTextIntoTokens = (text, language = null) => {
  if (!text) return [];
  
  const detectedLanguage = language || detectLanguage(text);
  
  // For CJK languages, preserve the original text
  if (['ja', 'zh', 'ko'].includes(detectedLanguage)) {
    return [{
      text: text,
      type: 'text',
      position: 0,
      length: text.length,
      language: detectedLanguage
    }];
  }
  
  const tokens = [];
  const regex = /(\b[\p{L}\p{N}]+(?:[-''][\p{L}\p{N}]+)*\b)|(\s+)|([^\w\s])/gu;
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, word, whitespace, punctuation] = match;
    const position = match.index;
    
    // Add any skipped text
    if (position > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, position),
        type: 'other',
        position: lastIndex,
        length: position - lastIndex
      });
    }
    
    // Add the matched token
    if (word) {
      tokens.push({
        text: word,
        type: 'word',
        position: position,
        length: word.length,
        language: detectedLanguage,
        cleaned: word.toLowerCase().replace(/^[^\w\u0080-\uFFFF]+|[^\w\u0080-\uFFFF]+$/g, '')
      });
    } else if (whitespace) {
      tokens.push({
        text: whitespace,
        type: 'whitespace',
        position: position,
        length: whitespace.length
      });
    } else if (punctuation) {
      tokens.push({
        text: punctuation,
        type: 'punctuation',
        position: position,
        length: punctuation.length
      });
    }
    
    lastIndex = position + fullMatch.length;
  }
  
  // Add any remaining text
  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      type: 'other',
      position: lastIndex,
      length: text.length - lastIndex
    });
  }
  
  return tokens;
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