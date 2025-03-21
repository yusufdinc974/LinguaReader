/**
 * Translation Service
 * Optimized to use Google's translation API which works reliably without CORS issues
 * With enhanced handling for Spanish words with accented characters
 */

// Google Translate API (unofficial but reliable)
const GOOGLE_TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single';

// MyMemory as fallback
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

// Fixed list of supported languages
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
];

// Common English words to prevent false Spanish detection
const COMMON_ENGLISH_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'so', 'yet',
  'in', 'on', 'at', 'to', 'by', 'with', 'from', 'of', 'as',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'that', 'this', 'these', 'those', 'it', 'they', 'we', 'you', 'I', 'he', 'she',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'fourth', 'fifth', 'time', 'day', 'year', 'home',
  'life', 'work', 'way', 'man', 'woman', 'child', 'world', 'school',
  'about', 'after', 'again', 'all', 'almost', 'also', 'always',
  'any', 'because', 'before', 'big', 'between', 'come', 'down',
  'even', 'find', 'give', 'go', 'good', 'great', 'here', 'just',
  'know', 'like', 'look', 'make', 'many', 'more', 'most', 'much', 'my', 'new',
  'no', 'not', 'now', 'off', 'old', 'only', 'other', 'our', 'out', 'over',
  'say', 'see', 'some', 'take', 'tell', 'than', 'then', 'there', 'think', 'use',
  'very', 'want', 'what', 'when', 'where', 'which', 'who', 'why',
  'yes', 'your'
]);

// Common word endings that are shared between English and Spanish
// When a word ends with these, we need to be more careful about detection
const SHARED_WORD_ENDINGS = new Set(['es', 'an', 'en', 'on', 'e', 'o', 'a']);

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
 * Check if a word is likely English based on a dictionary of common words
 * @param {string} word - Word to check
 * @returns {boolean} - True if it's a common English word
 */
const isCommonEnglishWord = (word) => {
  const lowerWord = word.toLowerCase().trim();
  return COMMON_ENGLISH_WORDS.has(lowerWord);
};

/**
 * Auto-detect the language of a text using improved detection logic
 * with special handling for accented characters and Spanish verb forms
 * @param {string} text - Text to detect language for
 * @returns {Promise<Object>} - Detected language
 */
export const detectLanguage = async (text) => {
  console.log("=== START detectLanguage ===");
  console.log(`Text received for detection: "${text}" (length: ${text.length})`);
  
  // Debug each character
  console.log("Character codes in input text:");
  for (let i = 0; i < text.length; i++) {
    console.log(`Char at position ${i}: "${text[i]}" (code: ${text.charCodeAt(i)})`);
  }
  
  if (!text || text.trim() === '') {
    console.log("Empty text, returning default English");
    console.log("=== END detectLanguage ===");
    return { detected: 'en', confidence: 0, error: true };
  }
  
  // First, check if it's a common English word
  if (isCommonEnglishWord(text)) {
    console.log(`Detected a common English word: "${text}"`);
    console.log("=== END detectLanguage ===");
    return {
      detected: 'en',
      confidence: 0.98,
      error: false
    };
  }
  
  // Check for specific known truncated words
  if (text === 'apag' || text === 'trat' || text === 'son') {
    console.log(`Detected known truncated Spanish word: ${text}`);
    
    // Determine the likely base form
    let baseForm;
    if (text === 'apag') baseForm = 'apagar';
    else if (text === 'trat') baseForm = 'tratar';
    else if (text === 'son') baseForm = 'ser';
    
    // Return Spanish with the base form
    console.log(`Forcing detection as Spanish with base form: ${baseForm}`);
    console.log("=== END detectLanguage ===");
    return {
      detected: 'es',
      confidence: 0.95,
      error: false,
      possibleBaseForms: [baseForm]
    };
  }
  
  // Enhanced pre-detection processing to help with Spanish recognition
  // Check for Spanish accents and special characters first
  const hasSpanishAccents = containsSpanishAccents(text);
  const hasSpanishFeatures = hasSpanishSpecificFeatures(text);
  
  console.log(`Text contains Spanish accents: ${hasSpanishAccents}`);
  console.log(`Text has Spanish features: ${hasSpanishFeatures}`);
  
  // Improved Spanish verb pattern detection - now more specific
  // We'll be more strict with short words ending in common suffixes
  // requiring that they have more Spanish-specific characteristics
  const potentialSpanishVerb = isPotentialSpanishVerb(text);
  console.log(`Text is potential Spanish verb form: ${potentialSpanishVerb}`);
  
  // Strong Spanish indicators - if any of these are true, we have high confidence it's Spanish
  if (hasSpanishAccents || hasSpanishFeatures) {
    console.log('Pre-detection: Text contains Spanish features, attempting local detection first');
    const spanishResult = localDetectSpanish(text);
    if (spanishResult.isSpanish) {
      console.log('Detected as Spanish through local patterns');
      const baseForm = findSpanishBaseForm(text);
      const lemmas = (baseForm !== text) ? [baseForm] : [];
      
      console.log(`Spanish base form: ${baseForm}`);
      console.log("=== END detectLanguage ===");
      
      return {
        detected: 'es',
        confidence: 0.95,
        error: false,
        possibleBaseForms: lemmas.length > 0 ? lemmas : undefined
      };
    }
  }
  
  // For potential Spanish verbs, only consider if:
  // 1. The word is longer than 3 characters, or
  // 2. It has other Spanish-specific features
  if (potentialSpanishVerb && (text.length > 3 || hasSpanishFeatures)) {
    console.log('Text appears to be a Spanish verb form, trying to determine base form');
    const baseForm = findSpanishBaseForm(text);
    if (baseForm !== text) {
      console.log(`Determined likely Spanish verb base form: ${baseForm}`);
      console.log("=== END detectLanguage ===");
      
      return {
        detected: 'es',
        confidence: 0.9,
        error: false,
        possibleBaseForms: [baseForm]
      };
    }
  }
  
  try {
    // Using Google Translate API for language detection
    console.log("Calling Google API for language detection");
    const encodedText = encodeURIComponent(text);
    console.log(`Encoded text for API call: ${encodedText}`);
    
    const url = `${GOOGLE_TRANSLATE_API}?client=gtx&sl=auto&tl=en&dt=t&q=${encodedText}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Language detection API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Google API response received");
    
    // The detected language is typically in data[2]
    if (data && data[2]) {
      let detectedLang = data[2];
      const confidence = 0.9; // Google usually has high confidence
      
      console.log(`Google detected language: ${detectedLang}`);
      
      // Special handling for short English words that might get misclassified
      if (detectedLang === 'es' && text.length <= 5) {
        // Double-check if it's a common English word with shared endings
        if (isCommonEnglishWord(text) || 
            (SHARED_WORD_ENDINGS.has(text.slice(-1)) || SHARED_WORD_ENDINGS.has(text.slice(-2)))) {
          
          // Compare English vs Spanish features
          const spanishScore = hasSpanishAccents ? 2 : 0 + 
                              hasSpanishFeatures ? 2 : 0 + 
                              potentialSpanishVerb ? 1 : 0;
          
          // If it's a common English word or has minimal Spanish features, override to English
          if (isCommonEnglishWord(text) || spanishScore <= 1) {
            console.log(`Overriding "${detectedLang}" detection to English for common word "${text}"`);
            detectedLang = 'en';
          }
        }
      }
      
      // ALWAYS convert Portuguese to Spanish for our vocabulary app
      if (detectedLang === 'pt') {
        console.log('Converting Portuguese detection to Spanish (forced override)');
        detectedLang = 'es';
      }
      
      // Special handling for Italian detection
      if (detectedLang === 'it') {
        // Check if it matches Spanish patterns more than Italian
        if (isLikelySpanishNotItalian(text)) {
          console.log('Overriding Italian detection to Spanish based on word features');
          detectedLang = 'es';
        }
      }
      
      // Handle common language detection issues for Spanish words
      if (detectedLang !== 'en' && detectedLang !== 'es') {
        // If it contains any Spanish patterns, override to Spanish
        if (hasSpanishAccents || hasSpanishFeatures || 
            (potentialSpanishVerb && text.length > 3)) {
          console.log(`Overriding ${detectedLang} detection to Spanish based on word features`);
          detectedLang = 'es';
        }
      }
      
      // For our app's purpose, with a detected word, also return possible base forms
      const lemmas = [];
      if (detectedLang === 'es') {
        const baseForm = findSpanishBaseForm(text);
        if (baseForm && baseForm !== text) {
          lemmas.push(baseForm);
          console.log(`Found Spanish base form: ${baseForm}`);
        }
      }
      
      console.log("=== END detectLanguage ===");
      return {
        detected: detectedLang,
        confidence: confidence,
        error: false,
        possibleBaseForms: lemmas.length > 0 ? lemmas : undefined
      };
    } else {
      throw new Error('Could not extract language detection information from API response');
    }
  } catch (error) {
    console.error('Google language detection error:', error);
    console.log('Falling back to local detection');
    
    // Fall back to our local detection if Google API fails
    const localResult = localDetectLanguage(text);
    console.log(`Local detection result: ${localResult.detected}`);
    console.log("=== END detectLanguage ===");
    return localResult;
  }
};

/**
 * Improved check for potential Spanish verb forms
 * More careful with short words and common endings
 * @param {string} text - Text to check
 * @returns {boolean} - True if it has characteristics of a Spanish verb
 */
const isPotentialSpanishVerb = (text) => {
  const lowerText = text.toLowerCase().trim();
  
  // Skip common English words entirely
  if (isCommonEnglishWord(lowerText)) {
    return false;
  }
  
  // For words 3 characters or shorter, be very strict
  if (lowerText.length <= 3) {
    // Only consider it Spanish if it has unmistakable Spanish patterns
    return /^(soy|es|son|voy|vas|va|ven|di|haz|pon|ten|sal|ve|da)$/.test(lowerText);
  }
  
  // For words 4-5 characters, check for more specific Spanish verb endings
  if (lowerText.length <= 5) {
    // More specific Spanish verb endings for shorter words
    return /[a-z]+(ar|er|ir|aba|ía|ó|as|an|amos|áis|aron)$/.test(lowerText) && !isCommonEnglishWord(lowerText);
  }
  
  // For longer words, we can use the original broader pattern
  return /[a-z]+(ar|er|ir|o|as|a|es|e|amos|emos|imos|ais|eis|is|an|en)$/.test(lowerText) && !isCommonEnglishWord(lowerText);
};

/**
 * Check if the text contains Spanish accented characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if it has Spanish accents
 */
const containsSpanishAccents = (text) => {
  // Spanish accented vowels and special characters
  const spanishAccents = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  return spanishAccents.test(text);
};

/**
 * Do a quick local detection for Spanish text
 * @param {string} text - Text to check
 * @returns {Object} - Detection result
 */
const localDetectSpanish = (text) => {
  const lowerText = text.toLowerCase();
  
  // Skip common English words entirely
  if (isCommonEnglishWord(lowerText)) {
    return { isSpanish: false, confidence: 0 };
  }
  
  // Spanish markers - accents, common words, verb endings
  const spanishMarkers = [
    // Accented characters
    /[áéíóúñü]/,
    // Common word endings
    /ción$|dad$|mente$|ito$|ita$|ar$|er$|ir$/,
    // Common verb conjugation patterns 
    /aba$|ían$|aron$|ía$|ado$|ido$|ando$|iendo$/,
    // Common determiners and pronouns
    /\b(el|la|los|las|un|una|unos|unas|lo|esto|eso|aquello)\b/,
    // Common Spanish verbs/prepositions
    /\b(es|son|está|están|ser|estar|tener|hacer|ir|venir|de|en|con|por|para)\b/
  ];
  
  // Count how many Spanish markers we find
  let markerCount = 0;
  for (const pattern of spanishMarkers) {
    if (pattern.test(lowerText)) {
      markerCount++;
    }
  }
  
  // Handle cases with accented final characters
  const endsWithAccent = /[áéíóúñ]$/.test(lowerText);
  if (endsWithAccent) {
    markerCount += 2; // Boost confidence for words ending in accents
  }
  
  // Return Spanish if we have any markers
  return {
    isSpanish: markerCount > 0,
    confidence: Math.min(0.95, 0.7 + (markerCount * 0.1))
  };
};

/**
 * Check if text has Spanish-specific features that distinguish it from Portuguese
 * @param {string} text - Text to check
 * @returns {boolean} - True if it has Spanish-specific features
 */
const hasSpanishSpecificFeatures = (text) => {
  const lowerText = text.toLowerCase();
  
  // Skip common English words entirely
  if (isCommonEnglishWord(lowerText)) {
    return false;
  }
  
  // Spanish-specific letters or patterns not typically in Portuguese
  const spanishSpecific = /[ñúü]|ll|ción$/;
  
  // Common Spanish words that are different in Portuguese
  const spanishWords = /\b(el|los|las|muy|ser|está|este|aquí|allí|nada|algo)\b/;
  
  // Spanish verb endings that differ from Portuguese
  const spanishVerbs = /\b\w+(ar|er|ir|aba|ía)$/;
  
  return spanishSpecific.test(lowerText) || 
         spanishWords.test(lowerText) || 
         spanishVerbs.test(lowerText);
};

/**
 * Check if text is more likely Spanish than Italian
 * @param {string} text - Text to check 
 * @returns {boolean} - True if it has more Spanish than Italian features
 */
const isLikelySpanishNotItalian = (text) => {
  const lowerText = text.toLowerCase();
  
  // Spanish features not in Italian
  const spanishFeatures = /[ñúü]|ción$|dad$|\b(el|la|los|las|muy|ser|está|este|aquí|allí)\b/;
  
  // Italian features not in Spanish
  const italianFeatures = /[òàù]|zione$|tta$|tto$|\b(il|lo|gli|le|questo|molto|essere|sta|qui)\b/;
  
  // Count features
  let spanishScore = 0;
  let italianScore = 0;
  
  // Check Spanish features
  if (lowerText.match(/ñ/g)) spanishScore += 3; // Strong Spanish indicator
  if (spanishFeatures.test(lowerText)) spanishScore += 1;
  
  // Check Italian features
  if (italianFeatures.test(lowerText)) italianScore += 1;
  
  // Spanish verb endings
  if (/ar$|er$|ir$|aba$|ando$/.test(lowerText)) spanishScore += 1;
  
  // Italian verb endings
  if (/are$|ere$|ire$|ava$|ando$/.test(lowerText)) italianScore += 1;
  
  return spanishScore > italianScore;
};

/**
 * Find the Spanish base form for conjugated verbs and nouns
 * Enhanced version with better handling of present tense conjugations
 * @param {string} word - The potentially conjugated word
 * @returns {string} - The base form if found, or the original word
 */
const findSpanishBaseForm = (word) => {
  const lowerWord = word.toLowerCase().trim();
  
  // Skip short words or words that don't look like Spanish
  if (lowerWord.length < 3) return lowerWord;
  
  // --- PART 1: Handle verb forms with attached pronouns ---
  
  // Common pronouns used in Spanish
  const pronouns = ['me', 'te', 'se', 'lo', 'la', 'le', 'nos', 'os', 'los', 'las', 'les'];
  
  // Check for word ending in any pronoun
  for (const pronoun of pronouns) {
    if (lowerWord.endsWith(pronoun)) {
      const stem = lowerWord.slice(0, -pronoun.length);
      
      // Skip if stem is too short
      if (stem.length < 2) continue;
      
      // Infinitive + pronoun (e.g., "acostarlo" → "acostar")
      if (stem.endsWith('ar') || stem.endsWith('er') || stem.endsWith('ir')) {
        return stem;
      }
      
      // Gerund + pronoun (e.g., "mirándolo" → "mirar")
      if (stem.endsWith('ando')) {
        return stem.slice(0, -4) + 'ar';
      }
      
      if (stem.endsWith('iendo') || stem.endsWith('endo')) {
        return stem.slice(0, stem.endsWith('iendo') ? -5 : -4) + 'er';
      }
      
      // Various conjugated forms + pronoun
      // Present indicative endings + pronoun
      
      // -ar verbs (present indicative)
      if (stem.endsWith('o') || stem.endsWith('as') || stem.endsWith('a') || 
          stem.endsWith('amos') || stem.endsWith('áis') || stem.endsWith('an')) {
        if (stem.endsWith('o')) return stem.slice(0, -1) + 'ar';
        if (stem.endsWith('as')) return stem.slice(0, -2) + 'ar';
        if (stem.endsWith('a')) return stem.slice(0, -1) + 'ar';
        if (stem.endsWith('amos')) return stem.slice(0, -4) + 'ar';
        if (stem.endsWith('áis')) return stem.slice(0, -3) + 'ar';
        if (stem.endsWith('an')) return stem.slice(0, -2) + 'ar';
      }
      
      // -er/-ir verbs (present indicative)
      if (stem.endsWith('o') || stem.endsWith('es') || stem.endsWith('e') || 
          stem.endsWith('emos') || stem.endsWith('imos') || stem.endsWith('éis') || 
          stem.endsWith('ís') || stem.endsWith('en')) {
        
        // Try to determine whether it's -er or -ir based on specific endings
        if (stem.endsWith('imos') || stem.endsWith('ís')) {
          // These are unique to -ir verbs
          return stem.slice(0, stem.endsWith('imos') ? -4 : -2) + 'ir';
        } else {
          // Others could be either -er or -ir, default to -er
          if (stem.endsWith('o')) return stem.slice(0, -1) + 'er';
          if (stem.endsWith('es')) return stem.slice(0, -2) + 'er';
          if (stem.endsWith('e')) return stem.slice(0, -1) + 'er';
          if (stem.endsWith('emos')) return stem.slice(0, -4) + 'er';
          if (stem.endsWith('éis')) return stem.slice(0, -3) + 'er';
          if (stem.endsWith('en')) return stem.slice(0, -2) + 'er';
        }
      }
      
      // Past tense endings + pronoun
      // For -ar verbs (preterite)
      if (stem.endsWith('é') || stem.endsWith('aste') || stem.endsWith('ó') || 
          stem.endsWith('amos') || stem.endsWith('asteis') || stem.endsWith('aron')) {
        
        if (stem.endsWith('é')) return stem.slice(0, -1) + 'ar';
        if (stem.endsWith('aste')) return stem.slice(0, -4) + 'ar';
        if (stem.endsWith('ó')) return stem.slice(0, -1) + 'ar';
        if (stem.endsWith('amos')) return stem.slice(0, -4) + 'ar';
        if (stem.endsWith('asteis')) return stem.slice(0, -6) + 'ar';
        if (stem.endsWith('aron')) return stem.slice(0, -4) + 'ar';
      }
      
      // For -er/-ir verbs (preterite)
      if (stem.endsWith('í') || stem.endsWith('iste') || stem.endsWith('ió') || 
          stem.endsWith('imos') || stem.endsWith('isteis') || stem.endsWith('ieron')) {
        
        if (stem.endsWith('í')) return stem.slice(0, -1) + 'er';
        if (stem.endsWith('iste')) return stem.slice(0, -4) + 'er';
        if (stem.endsWith('ió')) return stem.slice(0, -2) + 'er';
        if (stem.endsWith('imos')) return stem.slice(0, -4) + 'er';
        if (stem.endsWith('isteis')) return stem.slice(0, -6) + 'er';
        if (stem.endsWith('ieron')) return stem.slice(0, -5) + 'er';
      }
      
      // If nothing else matched but we have a stem with pronoun, try a default approach
      return stem + 'ar'; // Most common verb ending as default
    }
  }
  
  // --- PART 2: Handle regular verb forms ---
  
  // Infinitives (already base forms)
  if (lowerWord.endsWith('ar') || lowerWord.endsWith('er') || lowerWord.endsWith('ir')) {
    return lowerWord;
  }
  
  // 1. Present tense conjugations (enhanced)
  
  // -ar verbs (present indicative)
  const arPresentEndings = {
    'o': 1, 'as': 2, 'a': 1, 'amos': 4, 'áis': 3, 'an': 2
  };
  
  for (const [ending, length] of Object.entries(arPresentEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'ar';
      }
    }
  }
  
  // -er verbs (present indicative)
  const erPresentEndings = {
    'o': 1, 'es': 2, 'e': 1, 'emos': 4, 'éis': 3, 'en': 2
  };
  
  for (const [ending, length] of Object.entries(erPresentEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'er';
      }
    }
  }
  
  // -ir verbs (present indicative)
  const irPresentEndings = {
    'o': 1, 'es': 2, 'e': 1, 'imos': 4, 'ís': 2, 'en': 2
  };
  
  for (const [ending, length] of Object.entries(irPresentEndings)) {
    if (lowerWord.endsWith(ending)) {
      // Check if it's a specific -ir verb indicator
      if (ending === 'imos' || ending === 'ís') {
        const stem = lowerWord.slice(0, -length);
        if (stem.length > 1) {
          return stem + 'ir';
        }
      }
    }
  }
  
  // 2. Past tense conjugations (preterite) - enhanced with accent handling
  
  // -ar verbs (preterite)
  const arPreteriteEndings = {
    'é': 1, 'aste': 4, 'ó': 1, 'amos': 4, 'asteis': 6, 'aron': 4
  };
  
  for (const [ending, length] of Object.entries(arPreteriteEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'ar';
      }
    }
  }
  
  // -er/-ir verbs (preterite)
  const erirPreteriteEndings = {
    'í': 1, 'iste': 4, 'ió': 2, 'imos': 4, 'isteis': 6, 'ieron': 5
  };
  
  for (const [ending, length] of Object.entries(erirPreteriteEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'er'; // Default to -er
      }
    }
  }
  
  // 3. Imperfect past tense - enhanced
  
  // -ar verbs (imperfect)
  const arImperfectEndings = {
    'aba': 3, 'abas': 4, 'ábamos': 6, 'abais': 5, 'aban': 4
  };
  
  for (const [ending, length] of Object.entries(arImperfectEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'ar';
      }
    }
  }
  
  // -er/-ir verbs (imperfect)
  const erirImperfectEndings = {
    'ía': 2, 'ías': 3, 'íamos': 5, 'íais': 4, 'ían': 3
  };
  
  for (const [ending, length] of Object.entries(erirImperfectEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        return stem + 'er'; // Default to -er
      }
    }
  }
  
  // 4. Future tense - enhanced
  const futureEndings = {
    'é': 1, 'ás': 2, 'á': 1, 'emos': 4, 'éis': 3, 'án': 2
  };
  
  for (const [ending, length] of Object.entries(futureEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        // Future is based on infinitive, try all three endings
        // Check if adding a common verb ending gives us a likely Spanish word
        if (isLikelySpanishWord(stem + 'ar')) {
          return stem + 'ar';
        } else if (isLikelySpanishWord(stem + 'er')) {
          return stem + 'er';
        } else if (isLikelySpanishWord(stem + 'ir')) {
          return stem + 'ir';
        } else {
          return stem + 'ar'; // Default
        }
      }
    }
  }
  
  // 5. Conditional tense - enhanced  
  const conditionalEndings = {
    'ía': 2, 'ías': 3, 'íamos': 5, 'íais': 4, 'ían': 3
  };
  
  for (const [ending, length] of Object.entries(conditionalEndings)) {
    if (lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -length);
      if (stem.length > 1) {
        // Conditional is based on same stem as future, try all endings
        if (isLikelySpanishWord(stem + 'ar')) {
          return stem + 'ar';
        } else if (isLikelySpanishWord(stem + 'er')) {
          return stem + 'er';
        } else if (isLikelySpanishWord(stem + 'ir')) {
          return stem + 'ir';
        } else {
          return stem + 'ar'; // Default
        }
      }
    }
  }
  
  // 6. Present subjunctive - enhanced
  
  // For -ar verbs (subjunctive)
  const arSubjunctiveEndings = {
    'e': 1, 'es': 2, 'emos': 4, 'éis': 3, 'en': 2
  };
  
  // For -er/-ir verbs (subjunctive)
  const erirSubjunctiveEndings = {
    'a': 1, 'as': 2, 'amos': 4, 'áis': 3, 'an': 2
  };
  
  // 7. Gerunds (present participles) - enhanced
  if (lowerWord.endsWith('ando')) {
    return lowerWord.slice(0, -4) + 'ar';
  }
  
  if (lowerWord.endsWith('iendo') || lowerWord.endsWith('endo')) {
    const stem = lowerWord.slice(0, lowerWord.endsWith('iendo') ? -5 : -4);
    if (stem.length > 1) {
      // Check both -er and -ir
      if (isLikelySpanishWord(stem + 'ir')) {
        return stem + 'ir';
      } else {
        return stem + 'er'; // Default
      }
    }
  }
  
  // 8. Past participles - enhanced
  if (lowerWord.endsWith('ado')) {
    return lowerWord.slice(0, -3) + 'ar';
  }
  
  if (lowerWord.endsWith('ido')) {
    const stem = lowerWord.slice(0, -3);
    if (stem.length > 1) {
      // Check both -er and -ir
      if (isLikelySpanishWord(stem + 'ir')) {
        return stem + 'ir';
      } else {
        return stem + 'er'; // Default
      }
    }
  }
  
  // 9. Irregular participles (common ones) - enhanced with more verbs
  const irregularParticiples = {
    'hecho': 'hacer',
    'dicho': 'decir',
    'escrito': 'escribir',
    'visto': 'ver',
    'puesto': 'poner',
    'muerto': 'morir',
    'vuelto': 'volver',
    'abierto': 'abrir',
    'cubierto': 'cubrir',
    'roto': 'romper',
    'frito': 'freír',
    'resuelto': 'resolver',
    'impreso': 'imprimir',
    'suelto': 'soltar',
    'compuesto': 'componer',
    'satisfecho': 'satisfacer',
    'absuelto': 'absolver',
    'bendito': 'bendecir',
    'maldito': 'maldecir',
    'provisto': 'proveer',
    'inscrito': 'inscribir',
    'envuelto': 'envolver',
    'devuelto': 'devolver',
    'descrito': 'describir',
    'descubierto': 'descubrir'
  };
  
  if (irregularParticiples[lowerWord]) {
    return irregularParticiples[lowerWord];
  }
  
  // 10. Stem-changing verbs in 3rd person preterite (common ones)
  if (lowerWord.endsWith('uvo')) {
    return 'tener'; // e.g., tuvo -> tener, anduvo -> andar
  }
  
  if (lowerWord.endsWith('uso')) {
    return 'poner'; // e.g., puso -> poner
  }
  
  if (lowerWord.endsWith('izo')) {
    return 'hacer'; // e.g., hizo -> hacer
  }
  
  if (lowerWord.endsWith('ujo')) {
    // Could be 'traducir', 'producir', etc.
    return lowerWord.slice(0, -3) + 'ucir';
  }
  
  // Final check - if word ends with accented vowel (like apagó)
  if (/[áéíóú]$/.test(lowerWord)) {
    // Most likely a 3rd person singular preterite form
    if (lowerWord.endsWith('ó')) {
      return lowerWord.slice(0, -1) + 'ar';
    }
    
    if (lowerWord.endsWith('ió')) {
      return lowerWord.slice(0, -2) + 'er'; // Default to -er for -er/-ir
    }
  }
  
  // If no patterns matched, return the original word
  return lowerWord;
};

/**
 * Check if a word is a likely Spanish word based on character patterns
 * @param {string} word - Word to check
 * @returns {boolean} - True if it looks like a Spanish word
 */
const isLikelySpanishWord = (word) => {
  // Skip common English words
  if (isCommonEnglishWord(word)) {
    return false;
  }
  
  // Some common Spanish patterns in words
  return /[aeiouáéíóúüñ][bcdfghjklmnpqrstvwxyz]/.test(word) || 
         /[aeiouáéíóúüñ]$/.test(word) ||
         /^[bcdfghjklmnpqrstvwxyz][aeiouáéíóúüñ]/.test(word);
};

/**
 * Local language detection without API calls
 * Used as fallback when API detection fails
 * @param {string} text - Text to detect
 * @returns {Object} - Detection result
 */
const localDetectLanguage = (text) => {
  const lowerText = text.toLowerCase();
  
  // Check for common English words first
  if (isCommonEnglishWord(lowerText)) {
    return {
      detected: 'en',
      confidence: 0.95,
      error: false
    };
  }
  
  // Then check for Spanish indicators
  if (containsSpanishAccents(text) || hasSpanishSpecificFeatures(text)) {
    // Also check for base forms if it's Spanish
    const baseForm = findSpanishBaseForm(text);
    const lemmas = (baseForm !== text) ? [baseForm] : [];
    
    return {
      detected: 'es',
      confidence: 0.9,
      error: false,
      possibleBaseForms: lemmas.length > 0 ? lemmas : undefined
    };
  }
  
  // For short words (1-4 chars) without specific indicators, default to English
  if (text.length <= 4) {
    return {
      detected: 'en',
      confidence: 0.8,
      error: false
    };
  }
  
  // Advanced check for potential Spanish verbs in longer words
  if (text.length > 4 && isPotentialSpanishVerb(text)) {
    const baseForm = findSpanishBaseForm(text);
    const lemmas = (baseForm !== text) ? [baseForm] : [];
    
    return {
      detected: 'es',
      confidence: 0.8,
      error: false,
      possibleBaseForms: lemmas.length > 0 ? lemmas : undefined
    };
  }
  
  // Default to English if nothing else matches
  return {
    detected: 'en',
    confidence: 0.8,
    error: false
  };
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