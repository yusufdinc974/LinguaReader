/**
 * Translation Service
 * Provides translation functionality using alternative free translation APIs
 */

// Translation API endpoints - updated with more reliable alternatives
const API_ENDPOINTS = [
  'https://api.mymemory.translated.net/get', // Primary API - MyMemory (more reliable and no API key needed)
  'https://translate.googleapis.com/translate_a/single' // Google Translate unofficial API as fallback
];

// Default API endpoint
let CURRENT_API_ENDPOINT = API_ENDPOINTS[0];

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
  
  // Try to translate with current endpoint
  try {
    if (CURRENT_API_ENDPOINT === API_ENDPOINTS[0]) {
      // Using MyMemory Translation API
      const url = `${CURRENT_API_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      
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
        error: false
      };
    } 
    else if (CURRENT_API_ENDPOINT === API_ENDPOINTS[1]) {
      // Using Google Translate API (unofficial)
      const url = `${CURRENT_API_ENDPOINT}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
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
        error: false
      };
    }
    
    // Default return if no endpoint matches (shouldn't happen, but just in case)
    throw new Error('No valid translation endpoint selected');
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Try fallback endpoint if available and not already tried
    const currentIndex = API_ENDPOINTS.indexOf(CURRENT_API_ENDPOINT);
    if (currentIndex < API_ENDPOINTS.length - 1) {
      CURRENT_API_ENDPOINT = API_ENDPOINTS[currentIndex + 1];
      console.log(`Retrying with fallback endpoint: ${CURRENT_API_ENDPOINT}`);
      return translateText(text, sourceLang, targetLang);
    }
    
    // All endpoints failed - implement mock translation for demonstration
    console.log("All translation APIs failed. Using mock translation.");
    return mockTranslation(text, sourceLang, targetLang);
  }
};

/**
 * Mock translation function when all APIs fail
 * This provides a limited but functional fallback with common words
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @returns {Object} - Translation result
 */
const mockTranslation = (text, sourceLang, targetLang) => {
  // Common English-Spanish word pairs
  const enToEs = {
    'hello': 'hola',
    'goodbye': 'adiós',
    'thank you': 'gracias',
    'please': 'por favor',
    'yes': 'sí',
    'no': 'no',
    'good': 'bueno',
    'bad': 'malo',
    'morning': 'mañana',
    'night': 'noche',
    'today': 'hoy',
    'tomorrow': 'mañana',
    'yesterday': 'ayer',
    'water': 'agua',
    'food': 'comida',
    'house': 'casa',
    'car': 'coche',
    'book': 'libro',
    'time': 'tiempo',
    'money': 'dinero',
    'friend': 'amigo',
    'family': 'familia',
    'love': 'amor',
    'work': 'trabajo',
    'name': 'nombre',
    'day': 'día',
    'year': 'año',
    'dog': 'perro',
    'cat': 'gato',
    'man': 'hombre',
    'woman': 'mujer',
    'child': 'niño',
    'people': 'gente',
    'country': 'país',
    'city': 'ciudad',
    'street': 'calle',
    'door': 'puerta',
    'window': 'ventana',
    'table': 'mesa',
    'chair': 'silla',
    'bed': 'cama',
    'phone': 'teléfono',
    'computer': 'computadora',
    'internet': 'internet',
    'school': 'escuela',
    'university': 'universidad',
    'student': 'estudiante',
    'teacher': 'profesor',
    'doctor': 'médico',
    'hospital': 'hospital',
    'store': 'tienda',
    'restaurant': 'restaurante',
    'hotel': 'hotel',
    'airport': 'aeropuerto',
    'train': 'tren',
    'bus': 'autobús',
    'vacation': 'vacaciones',
    'beach': 'playa',
    'mountain': 'montaña',
    'river': 'río',
    'sea': 'mar',
    'sun': 'sol',
    'moon': 'luna',
    'star': 'estrella',
    'sky': 'cielo',
    'earth': 'tierra',
    'world': 'mundo'
  };
  
  // Common Spanish-English word pairs (reverse of above)
  const esToEn = Object.entries(enToEs).reduce(
    (acc, [en, es]) => ({ ...acc, [es]: en }), 
    {}
  );
  
  // Choose the appropriate dictionary based on languages
  let dictionary;
  if (sourceLang === 'en' && targetLang === 'es') {
    dictionary = enToEs;
  } else if (sourceLang === 'es' && targetLang === 'en') {
    dictionary = esToEn;
  } else {
    // For unsupported language pairs, just return the original
    return {
      original: text,
      translated: text + ' (translation unavailable)',
      error: false
    };
  }
  
  // Very simple word-by-word translation
  let translatedText = text.toLowerCase();
  
  // Replace known words
  Object.entries(dictionary).forEach(([source, target]) => {
    const regex = new RegExp(`\\b${source}\\b`, 'gi');
    translatedText = translatedText.replace(regex, target);
  });
  
  return {
    original: text,
    translated: translatedText,
    error: false
  };
};

/**
 * Auto-detect the language of a text
 * Note: This is a simplified implementation since we don't have access to language detection APIs
 * @param {string} text - Text to detect language for
 * @returns {Promise<Object>} - Detected language
 */
export const detectLanguage = async (text) => {
  if (!text || text.trim() === '') {
    return { detected: 'en', confidence: 0, error: true };
  }
  
  // Simple detection based on common words
  const englishWords = ['the', 'and', 'is', 'in', 'to', 'a', 'it', 'that', 'was', 'for'];
  const spanishWords = ['el', 'la', 'es', 'en', 'y', 'a', 'que', 'de', 'por', 'un'];
  
  const lowerText = text.toLowerCase();
  let englishCount = 0;
  let spanishCount = 0;
  
  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) englishCount += matches.length;
  });
  
  spanishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) spanishCount += matches.length;
  });
  
  // Determine language based on count
  let detected = 'en';
  let confidence = 0.5;
  
  if (englishCount > spanishCount) {
    detected = 'en';
    confidence = Math.min(1, 0.5 + (englishCount - spanishCount) / 20);
  } else if (spanishCount > englishCount) {
    detected = 'es';
    confidence = Math.min(1, 0.5 + (spanishCount - englishCount) / 20);
  }
  
  return {
    detected,
    confidence,
    error: false
  };
};

/**
 * Get supported languages
 * @returns {Array} - List of supported languages
 */
export const getSupportedLanguages = () => {
  // Simplified list of languages commonly supported by translation APIs
  return [
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
  ];
};

export default {
  translateText,
  detectLanguage,
  getSupportedLanguages
};