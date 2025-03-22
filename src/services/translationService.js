/**
 * Translation Service
 * Optimized to use Google's translation API which works reliably without CORS issues
 */

// Google Translate API (unofficial but reliable)
const GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';

// MyMemory as fallback
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
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

export default {
  translateText,
  detectLanguage,
  getSupportedLanguages
};