/**
 * Translation Service
 * Optimized to use Google's translation API which works reliably without CORS issues
 * Enhanced with support for CJK languages and dictionary lookup
 */

// Google Translate API (unofficial but reliable)
const GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';

// MyMemory as fallback
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

// Added support for Japanese Jisho API
const JISHO_API = 'https://jisho.org/api/v1/search/words';

// Added support for Chinese dictionary API (placeholder - replace with actual API)
const CHINESE_DICT_API = 'https://api.ctext.org/getToken';

// Supported languages with enhanced CJK support
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese', hasSpecialDict: true },
  { code: 'ja', name: 'Japanese', hasSpecialDict: true },
  { code: 'ko', name: 'Korean', hasSpecialDict: true },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'pl', name: 'Polish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' }
];

/**
 * Translate text between languages
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code (e.g., 'en', 'es')
 * @param {string} targetLang - Target language code (e.g., 'en', 'es')
 * @returns {Promise<Object>} - Translation result
 */
export const translateText = async (text, sourceLang = 'en', targetLang = 'es') => {
  // Don't translate empty text
  if (!text || text.trim() === '') {
    return { translated: '', error: false, original: text };
  }
  
  // Don't translate if source and target are the same
  if (sourceLang === targetLang) {
    return { translated: text, error: false, original: text };
  }

  // For CJK languages, try specialized dictionary lookup first if it's a single character/word
  if ((sourceLang === 'ja' || sourceLang === 'zh' || sourceLang === 'ko') && text.length <= 5) {
    try {
      const dictResult = await lookupInSpecializedDictionary(text, sourceLang, targetLang);
      if (dictResult && !dictResult.error) {
        return dictResult;
      }
    } catch (error) {
      console.log('Specialized dictionary lookup failed, falling back to translation API');
    }
  }

  // Try Google Translate first (works reliably)
  try {
    console.log('Attempting translation with Google API');
    
    // Google Translate API (unofficial)
    const url = `${GOOGLE_TRANSLATE_API}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract translated text from the nested array structure
    const translatedText = data[0].map(item => item[0]).join('');
    
    return {
      original: text,
      translated: translatedText,
      error: false,
      api: 'Google'
    };
  } catch (error) {
    console.error('Google Translate API error:', error);
    
    // Try MyMemory as fallback
    try {
      console.log('Falling back to MyMemory API');
      
      // MyMemory Translation API
      const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error(`Translation failed: ${data.responseStatus}`);
      }
      
      return {
        original: text,
        translated: data.responseData.translatedText,
        error: false,
        api: 'MyMemory'
      };
    } catch (err) {
      console.error('MyMemory API error:', err);
      
      // Both APIs failed - provide a simple response
      return {
        original: text,
        translated: '',
        error: true,
        message: 'Translation services unavailable. Please try again later.'
      };
    }
  }
};

/**
 * Look up a word in a specialized dictionary for CJK languages
 * @param {string} word - Word to look up
 * @param {string} sourceLang - Source language (ja, zh, ko)
 * @param {string} targetLang - Target language
 * @returns {Promise<Object>} - Dictionary result
 */
export const lookupInSpecializedDictionary = async (word, sourceLang, targetLang) => {
  if (!word) return { error: true, message: 'No word provided' };
  
  // Japanese dictionary (Jisho)
  if (sourceLang === 'ja') {
    try {
      const url = `${JISHO_API}?keyword=${encodeURIComponent(word)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Jisho API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const entry = data.data[0];
        
        // Get appropriate translation based on target language
        let translation = '';
        let readings = [];
        
        if (entry.senses && entry.senses.length > 0) {
          // Get all English definitions
          const definitions = entry.senses[0].english_definitions || [];
          translation = definitions.join('; ');
          
          // Get readings if available
          if (entry.japanese && entry.japanese.length > 0) {
            readings = entry.japanese.map(j => ({
              reading: j.reading || '',
              word: j.word || ''
            }));
          }
        }
        
        return {
          original: word,
          translated: translation,
          readings: readings,
          error: false,
          api: 'Jisho',
          dictionary: true,
          isJapanese: true
        };
      } else {
        // No results found, fall back to translation API
        throw new Error('No results found in Jisho');
      }
    } catch (error) {
      console.error('Jisho API error:', error);
      return { error: true, message: 'Japanese dictionary lookup failed' };
    }
  }
  
  // Chinese dictionary (placeholder implementation)
  if (sourceLang === 'zh') {
    // In a real implementation, you would use a Chinese dictionary API
    // For now, we'll rely on the translation API
    return { error: true, message: 'Chinese dictionary not implemented yet' };
  }
  
  // Korean dictionary (placeholder implementation)
  if (sourceLang === 'ko') {
    // In a real implementation, you would use a Korean dictionary API
    // For now, we'll rely on the translation API
    return { error: true, message: 'Korean dictionary not implemented yet' };
  }
  
  return { error: true, message: 'No specialized dictionary available' };
};

/**
 * Translate multiple words at once
 * @param {Array} words - Array of words to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @returns {Promise<Array>} - Array of translation results
 */
export const translateMultipleWords = async (words, sourceLang, targetLang) => {
  if (!words || !words.length) return [];
  
  const results = [];
  
  // For CJK languages, batch process no more than 5 words at a time
  const batchSize = ['ja', 'zh', 'ko'].includes(sourceLang) ? 5 : 20;
  
  // Process in batches
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    // Process each word in the batch
    const batchPromises = batch.map(word => translateText(word, sourceLang, targetLang));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Translate a sentence (continuous text block)
 * @param {string} sentence - Sentence to translate
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @returns {Promise<Object>} - Translation result
 */
export const translateSentence = async (sentence, sourceLang, targetLang) => {
  // This is a direct passthrough to translateText
  // In the future, you could add sentence-specific processing here
  return translateText(sentence, sourceLang, targetLang);
};

/**
 * Auto-detect the language of a text using Google's translation API
 * @param {string} text - Text to detect language for
 * @returns {Promise<Object>} - Detected language
 */
export const detectLanguage = async (text) => {
  if (!text || text.trim() === '') {
    return { detected: 'en', confidence: 0, error: true };
  }
  
  try {
    // Using Google Translate API for language detection
    const encodedText = encodeURIComponent(text);
    const url = `${GOOGLE_TRANSLATE_API}?client=gtx&sl=auto&tl=en&dt=t&q=${encodedText}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Language detection API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The detected language is typically in data[2]
    if (data && data[2]) {
      const detectedLang = data[2];
      const confidence = 0.9; // Google usually has high confidence
      
      return {
        detected: detectedLang,
        confidence: confidence,
        error: false
      };
    } else {
      throw new Error('Could not extract language detection information from API response');
    }
  } catch (error) {
    console.error('Language detection error:', error);
    
    // Default to English on error
    return { 
      detected: 'en', 
      confidence: 0.5, 
      error: true,
      message: error.message
    };
  }
};

/**
 * Get supported languages - returns fixed list to avoid API calls
 * @returns {Array} - List of supported languages
 */
export const getSupportedLanguages = () => {
  return SUPPORTED_LANGUAGES;
};

/**
 * Get character details for CJK languages
 * @param {string} character - Single character to look up
 * @param {string} language - Language code (ja, zh, ko)
 * @returns {Promise<Object>} - Character details
 */
export const getCharacterDetails = async (character, language) => {
  if (!character || character.length !== 1) {
    return { error: true, message: 'Please provide a single character' };
  }
  
  // For Japanese characters
  if (language === 'ja') {
    try {
      // Use Jisho API for kanji lookup
      const url = `${JISHO_API}?keyword=${encodeURIComponent(character)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Jisho API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // Process and return character details
        return {
          character,
          details: data.data[0],
          error: false
        };
      } else {
        throw new Error('Character not found in dictionary');
      }
    } catch (error) {
      console.error('Error fetching Japanese character details:', error);
      return { 
        character, 
        error: true, 
        message: 'Could not retrieve character details' 
      };
    }
  }
  
  // For Chinese characters
  if (language === 'zh') {
    // In a real implementation, you would use a Chinese character API
    // This is a placeholder implementation
    return { 
      character, 
      error: true, 
      message: 'Chinese character details not implemented yet' 
    };
  }
  
  // For Korean characters
  if (language === 'ko') {
    // In a real implementation, you would use a Korean character API
    // This is a placeholder implementation
    return { 
      character, 
      error: true, 
      message: 'Korean character details not implemented yet' 
    };
  }
  
  return { 
    character, 
    error: true, 
    message: 'Unsupported language for character details' 
  };
};

export default {
  translateText,
  detectLanguage,
  getSupportedLanguages,
  lookupInSpecializedDictionary,
  translateMultipleWords,
  translateSentence,
  getCharacterDetails
};