/**
 * Dictionary Service
 * Provides access to Merriam-Webster dictionary APIs for word definitions and related data.
 * Enhanced with Google's language detection and better Spanish definition parsing.
 */

import { translateText, detectLanguage } from './translationService';

// Merriam-Webster API keys
const MW_LEARNERS_API_KEY = '5f9d6904-36b7-4ecc-a57e-394af95ac05d'; // English Learner's Dictionary
const MW_SPANISH_API_KEY = 'da6f593f-9acf-42a1-a672-0526daf688d6'; // Spanish-English Dictionary

// Merriam-Webster API endpoints
const MW_LEARNERS_API_URL = 'https://www.dictionaryapi.com/api/v3/references/learners/json/';
const MW_SPANISH_API_URL = 'https://www.dictionaryapi.com/api/v3/references/spanish/json/';

/**
 * Get English definition from Merriam-Webster Learner's Dictionary
 * @param {string} word - Word to look up
 * @returns {Promise<Object>} - Definition data
 */
export const getEnglishDefinition = async (word) => {
  try {
    // Trim and validate the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      throw new Error('No word provided');
    }

    // Make API request
    const response = await fetch(`${MW_LEARNERS_API_URL}${encodeURIComponent(trimmedWord)}?key=${MW_LEARNERS_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Dictionary API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if we got valid results
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        error: true,
        message: `No definition found for "${trimmedWord}"`,
        word: trimmedWord,
        suggestions: Array.isArray(data) ? data.slice(0, 5) : []
      };
    }
    
    // Check if the response contains strings (suggestions) instead of definitions
    if (typeof data[0] === 'string') {
      return {
        error: true,
        message: `No exact match for "${trimmedWord}"`,
        word: trimmedWord,
        suggestions: data.slice(0, 5)
      };
    }
    
    // Process data into a more usable format
    return processEnglishDefinitionData(data, trimmedWord);
  } catch (error) {
    console.error('Error fetching English definition:', error);
    
    return {
      error: true,
      message: error.message,
      word
    };
  }
};

/**
 * Check if a word is likely a truncated Spanish verb and try to reconstruct it
 * Handles truncated forms from various tenses: present, preterite, future, conditional, imperfect
 * @param {string} truncated - The truncated word
 * @returns {Promise<Array>} - Array of possible reconstructed base forms to try
 */
async function reconstructTruncatedVerb(truncated) {
  // Skip very short words or non-truncated words
  if (truncated.length < 3 || !endsWithConsonant(truncated)) {
    return [];
  }
  
  const possibleForms = [];
  
  // 1. Check for specific common truncated verbs first
  const commonTruncatedVerbs = {
    'apag': 'apagar',
    'trat': 'tratar',
    'logr': 'lograr',
    'acost': 'acostar',
    'entr': 'entrar',
    'habl': 'hablar',
    'llam': 'llamar',
    'trabaj': 'trabajar',
    'termin': 'terminar',
    'compr': 'comprar',
    'empez': 'empezar',
    'pag': 'pagar',
    'jug': 'jugar',
    'pens': 'pensar',
    'prepar': 'preparar',
    'busc': 'buscar',
    'llor': 'llorar',
    'despert': 'despertar',
    'cambi': 'cambiar',
    'pas': 'pasar',
    'pint': 'pintar',
    'cont': 'contar',
    'esper': 'esperar',
    'mir': 'mirar',
    'escuch': 'escuchar',
    'pregunt': 'preguntar',
    'estudi': 'estudiar',
    'escrib': 'escribir',
    'viv': 'vivir',
    'recib': 'recibir',
    'vend': 'vender',
    'aprend': 'aprender',
    'respond': 'responder',
    'mand': 'mandar',
    'guard': 'guardar',
    'cruz': 'cruzar',
    'dej': 'dejar',
    'bail': 'bailar',
    'ayud': 'ayudar',
    'explic': 'explicar',
    'utiliz': 'utilizar',
    'organiz': 'organizar',
    'acept': 'aceptar',
    'record': 'recordar',
    'disfrut': 'disfrutar',
    'estren': 'estrenar'
  };
  
  if (commonTruncatedVerbs[truncated]) {
    possibleForms.push(commonTruncatedVerbs[truncated]);
    // We found an exact match, but still check other forms for completeness
  }
  
  // 2. Try standard verb endings (most common, in order of frequency)
  possibleForms.push(truncated + 'ar'); // Most common
  possibleForms.push(truncated + 'er');
  possibleForms.push(truncated + 'ir');
  
  // 3. Try to detect truncated forms from different tenses
  
  // Check for preterite (past tense) forms missing final 'ó' 
  // Common in 3rd person singular verbs like "apagó" (truncated to "apag")
  const preteriteBaseAr = truncated + 'ar';
  const preteriteResult = await getSpanishDefinition(preteriteBaseAr);
  if (!preteriteResult.error) {
    // This is likely from a preterite form of an -ar verb
    if (!possibleForms.includes(preteriteBaseAr)) {
      possibleForms.unshift(preteriteBaseAr); // Add to beginning (higher priority)
    }
  }
  
  // Check for future tense truncated forms
  // Future tense forms like "hablará" (will speak), which could be truncated to "hablar"
  if (truncated.endsWith('ar') || truncated.endsWith('er') || truncated.endsWith('ir')) {
    // This could be a future form truncated right at the infinitive
    const base = truncated;
    if (!possibleForms.includes(base)) {
      possibleForms.push(base);
    }
  }
  
  // Check for imperfect tense truncated forms
  // Imperfect forms like "hablaba" (was speaking), could be truncated to "hablab"
  if (truncated.endsWith('ab')) {
    // Likely imperfect form of -ar verb (like "hablaba" -> "hablab")
    const imperfectBaseAr = truncated.slice(0, -2) + 'ar';
    if (!possibleForms.includes(imperfectBaseAr)) {
      possibleForms.push(imperfectBaseAr);
    }
  }
  
  if (truncated.endsWith('i')) {
    // Could be imperfect of -er/-ir verb (like "comía" -> "comi")
    const imperfectBaseEr = truncated + 'r';
    const imperfectBaseIr = truncated.slice(0, -1) + 'ir';
    if (!possibleForms.includes(imperfectBaseEr)) {
      possibleForms.push(imperfectBaseEr);
    }
    if (!possibleForms.includes(imperfectBaseIr)) {
      possibleForms.push(imperfectBaseIr);
    }
  }
  
  // Check for conditional tense truncated forms 
  // Conditional forms like "hablaría" (would speak), could be truncated to "hablar"
  // This is covered by the future tense check above since they have the same stem
  
  // 4. Check for stem-changing verbs
  // Common e->ie and o->ue changes in present tense
  if (truncated.includes('e')) {
    const stemChangedE = truncated.replace(/([^i]e)([^i])/, 'ie$2');
    if (stemChangedE !== truncated) {
      possibleForms.push(stemChangedE + 'ar');
      possibleForms.push(stemChangedE + 'er');
    }
  }
  
  if (truncated.includes('o')) {
    const stemChangedO = truncated.replace(/([^u]o)([^u])/, 'ue$2');
    if (stemChangedO !== truncated) {
      possibleForms.push(stemChangedO + 'ar');
      possibleForms.push(stemChangedO + 'er');
    }
  }
  
  // 5. Handle irregular verb mappings
  const irregularVerbs = {
    // Irregular preterite forms
    'hic': 'hacer',
    'pus': 'poner',
    'tuv': 'tener',
    'estuv': 'estar',
    'dij': 'decir',
    'traj': 'traer',
    'vin': 'venir',
    'quis': 'querer',
    'pud': 'poder',
    'sup': 'saber',
    'anduv': 'andar',
    
    // Future/conditional irregulars
    'dir': 'decir',   // dirá (future)
    'har': 'hacer',   // hará (future)
    'pondr': 'poner', // pondrá (future)
    'saldr': 'salir', // saldrá (future)
    'vendr': 'venir', // vendrá (future)
    'querr': 'querer', // querrá (future)
    'podr': 'poder',  // podrá (future)
    'sabr': 'saber',  // sabrá (future)
    'cabr': 'caber'   // cabrá (future)
  };
  
  if (irregularVerbs[truncated]) {
    possibleForms.unshift(irregularVerbs[truncated]); // Add to beginning (high priority)
  }
  
  // Return unique list of possible forms
  return [...new Set(possibleForms)];
}

/**
 * Helper to check if a word ends with a consonant
 * @param {string} word - Word to check
 * @returns {boolean} - True if word ends with consonant
 */
function endsWithConsonant(word) {
  return /[bcdfghjklmnpqrstvwxyz]$/.test(word);
}

/**
 * Get Spanish-English definition from Merriam-Webster Spanish Dictionary
 * @param {string} word - Word to look up (Spanish)
 * @returns {Promise<Object>} - Definition data
 */
export const getSpanishDefinition = async (word) => {
  try {
    // Trim and validate the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      throw new Error('No word provided');
    }

    // Make API request
    const response = await fetch(`${MW_SPANISH_API_URL}${encodeURIComponent(trimmedWord)}?key=${MW_SPANISH_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Dictionary API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the raw data to understand its structure better
    console.log('Spanish API raw data structure:', JSON.stringify(data[0], null, 2).substring(0, 1000) + '...');
    
    // Check if we got valid results
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        error: true,
        message: `No definition found for "${trimmedWord}"`,
        word: trimmedWord,
        suggestions: Array.isArray(data) ? data.slice(0, 5) : []
      };
    }
    
    // Check if the response contains strings (suggestions) instead of definitions
    if (typeof data[0] === 'string') {
      return {
        error: true,
        message: `No exact match for "${trimmedWord}"`,
        word: trimmedWord,
        suggestions: data.slice(0, 5)
      };
    }
    
    // Process data into a more usable format
    return processSpanishDefinitionData(data, trimmedWord);
  } catch (error) {
    console.error('Error fetching Spanish definition:', error);
    
    return {
      error: true,
      message: error.message,
      word
    };
  }
};

/**
 * Get definition for any language with auto-detection
 * @param {string} word - Word to look up
 * @param {string} detectedLanguage - Detected language code if available
 * @returns {Promise<Object>} - Definition with language information
 */
export const getMultiLanguageDefinition = async (word, detectedLanguage = null) => {
  // Get the cleaned word
  const trimmedWord = word.trim().toLowerCase();
  
  // Use Google's language detection through our translation service
  let possibleBaseForms = [];
  
  if (!detectedLanguage) {
    try {
      // We'll use the detectLanguage function from translationService.js
      const langResult = await detectLanguage(trimmedWord);
      detectedLanguage = langResult.detected;
      
      // Get possible base forms if available
      if (langResult.possibleBaseForms) {
        possibleBaseForms = langResult.possibleBaseForms;
      }
      
      console.log(`Google detected language for "${trimmedWord}": ${detectedLanguage} (confidence: ${langResult.confidence})`);
      if (possibleBaseForms.length > 0) {
        console.log(`Possible base forms: ${possibleBaseForms.join(', ')}`);
      }
    } catch (error) {
      console.error('Language detection error:', error);
      // Default to English if detection fails
      detectedLanguage = 'en';
    }
  }
  
  // Process differently based on detected language
  if (detectedLanguage === 'es') {
    console.log(`Looking up Spanish word: ${trimmedWord}`);
    
    // First try with the original word
    let result = await getSpanishDefinition(trimmedWord);
    
    // If no definition found, try to reconstruct if it might be a truncated verb
    if (result.error) {
      // Check for possible truncated verb forms
      const reconstructedForms = await reconstructTruncatedVerb(trimmedWord);
      
      if (reconstructedForms.length > 0) {
        console.log(`Detected possible truncated verb. Trying forms: ${reconstructedForms.join(', ')}`);
        
        // Try each reconstructed form
        for (const baseForm of reconstructedForms) {
          console.log(`Trying reconstructed form: "${baseForm}"`);
          const baseResult = await getSpanishDefinition(baseForm);
          
          if (!baseResult.error) {
            console.log(`Found definition for base form "${baseForm}"`);
            // Add information about the original word
            baseResult.originalWord = trimmedWord;
            baseResult.isBaseForm = false;
            baseResult.derivedFrom = baseForm;
            baseResult.detectedLanguage = 'es';
            return baseResult;
          }
        }
      }
      
      // If no reconstructed forms worked, try the base forms from language detection
      if (possibleBaseForms.length > 0) {
        console.log(`No definition found for "${trimmedWord}", trying base forms from detection...`);
        
        // Try each possible base form
        for (const baseForm of possibleBaseForms) {
          console.log(`Trying base form: "${baseForm}"`);
          const baseResult = await getSpanishDefinition(baseForm);
          
          if (!baseResult.error) {
            console.log(`Found definition for base form "${baseForm}"`);
            // Add information about the original word
            baseResult.originalWord = trimmedWord;
            baseResult.isBaseForm = false;
            baseResult.derivedFrom = baseForm;
            baseResult.detectedLanguage = 'es';
            return baseResult;
          }
        }
      }
    }
    
    result.detectedLanguage = 'es';
    return result;
  } else {
    // For English (or unknown), use Learner's dictionary
    console.log(`Looking up English word: ${trimmedWord}`);
    const result = await getEnglishDefinition(trimmedWord);
    result.detectedLanguage = 'en';
    return result;
  }
};

/**
 * Helper function to find base form for Spanish words
 * This is used when we need to get base forms but don't want to import the entire translationService
 * @param {string} word - Spanish word to find base form for
 * @returns {Promise<string>} - Base form of the word
 */
const findBaseFormForSpanishWord = async (word) => {
  try {
    // Use our detection API to get base forms
    const langResult = await detectLanguage(word);
    if (langResult.possibleBaseForms && langResult.possibleBaseForms.length > 0) {
      return langResult.possibleBaseForms[0];
    }
    
    // If detection didn't provide base forms, handle some common patterns
    if (word.endsWith('ó')) {
      return word.slice(0, -1) + 'ar'; // e.g., "apagó" -> "apagar"
    }
    
    if (word.endsWith('ió')) {
      return word.slice(0, -2) + 'er'; // e.g., "comió" -> "comer"
    }
    
    // Default case - return original word
    return word;
  } catch (err) {
    console.error('Error finding base form:', err);
    return word;
  }
};

/**
 * Process Merriam-Webster Learner's dictionary data into our app format
 * @param {Array} data - Raw API data
 * @param {string} originalWord - Original word requested
 * @returns {Object} - Processed definition
 */
const processEnglishDefinitionData = (data, originalWord) => {
  try {
    // We'll use the first entry which is typically the most relevant
    const entry = data[0];
    
    // Safety check to ensure we have a valid entry
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid API response format');
    }
    
    // Extract word info
    const word = entry.meta?.id?.split(':')[0] || originalWord;
    
    // Extract phonetics and audio
    let phonetic = '';
    let audioFile = '';
    
    if (entry.hwi) {
      if (entry.hwi.prs && entry.hwi.prs.length > 0) {
        phonetic = entry.hwi.prs[0].mw || '';
        
        // Audio file construction (per Merriam-Webster docs)
        if (entry.hwi.prs[0].sound) {
          const audioName = entry.hwi.prs[0].sound.audio;
          if (audioName) {
            const audioSubdir = getAudioSubdirectory(audioName);
            audioFile = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${audioSubdir}/${audioName}.mp3`;
          }
        }
      }
    }
    
    // Extract definitions by part of speech
    const meaningsByPOS = {};
    
    // Make sure we have valid def structure before processing
    if (entry.fl && entry.def && Array.isArray(entry.def)) {
      const pos = entry.fl; // e.g., "noun", "verb", etc.
      
      meaningsByPOS[pos] = [];
      
      // Process each definition block safely
      entry.def.forEach(defBlock => {
        if (defBlock && defBlock.sseq && Array.isArray(defBlock.sseq)) {
          defBlock.sseq.forEach(senseSequence => {
            if (Array.isArray(senseSequence)) {
              senseSequence.forEach(sense => {
                // Handle structured senses - typically [sense-number, sense-data]
                if (Array.isArray(sense) && sense.length > 1 && sense[1].dt) {
                  // Extract the definition text safely
                  const definition = extractDefinitionText(sense[1].dt);
                  
                  // Extract examples if available
                  let example = null;
                  
                  // Safely extract examples
                  if (Array.isArray(sense[1].dt)) {
                    const visEntries = sense[1].dt.filter(dt => 
                      Array.isArray(dt) && dt.length > 0 && dt[0] === 'vis'
                    );
                    
                    if (visEntries.length > 0 && visEntries[0][1] && visEntries[0][1].t) {
                      // Safely remove markup like {bc}, {it}, etc.
                      example = visEntries[0][1].t.replace(/\{[^}]*\}/g, '').trim();
                    }
                  }
                  
                  // Add definition to meanings only if we got something
                  if (definition) {
                    meaningsByPOS[pos].push({
                      definition,
                      example
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
    
    // If no meanings were extracted, provide a fallback
    if (Object.keys(meaningsByPOS).length === 0 || 
        Object.values(meaningsByPOS).every(defs => defs.length === 0)) {
      // Try to extract simple definitions if available
      if (entry.shortdef && Array.isArray(entry.shortdef) && entry.shortdef.length > 0) {
        const pos = entry.fl || 'definition';
        meaningsByPOS[pos] = entry.shortdef.map(def => ({
          definition: def,
          example: null
        }));
      } else {
        // Last resort fallback
        meaningsByPOS['definition'] = [{
          definition: `Definition for "${word}"`,
          example: null
        }];
      }
    }
    
    // Convert to our standard format
    const meanings = Object.entries(meaningsByPOS).map(([partOfSpeech, definitions]) => ({
      partOfSpeech,
      definitions,
      synonyms: extractSynonyms(entry) || [],
      antonyms: extractAntonyms(entry) || []
    }));
    
    return {
      word,
      phonetic: phonetic || null,
      audioFile,
      meanings,
      detectedLanguage: 'en',
      error: false,
      api: 'Merriam-Webster Learner\'s'
    };
  } catch (error) {
    console.error('Error processing definition data:', error);
    return {
      error: true,
      message: 'Error processing definition data',
      word: originalWord,
      errorDetails: error.message
    };
  }
};

/**
 * Process Merriam-Webster Spanish dictionary data into our app format
 * @param {Array} data - Raw API data
 * @param {string} originalWord - Original word requested
 * @returns {Object} - Processed definition
 */
const processSpanishDefinitionData = (data, originalWord) => {
  try {
    // We'll use the first entry which is typically the most relevant
    const entry = data[0];
    
    // Safety check
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid API response format');
    }
    
    // Extract word info
    const spanishWord = entry.meta?.id?.split(':')[0] || originalWord;
    
    // Try to get part of speech - in Spanish it's often things like "masculine noun"
    const partOfSpeech = entry.fl || '';
    
    // Get English translations from shortdef or other fields
    let englishTranslations = [];
    
    // Check if we have shortdef with translations
    if (entry.shortdef && Array.isArray(entry.shortdef) && entry.shortdef.length > 0) {
      englishTranslations = entry.shortdef.filter(def => def && def.trim() !== '');
    }
    
    // If shortdef didn't have good translations, try to find them in the def structure
    if (englishTranslations.length === 0 && entry.def && Array.isArray(entry.def)) {
      // Extract translations from deeper structure
      entry.def.forEach(defBlock => {
        // For Spanish dictionary, translations are often in sense-based structures
        if (defBlock.sseq && Array.isArray(defBlock.sseq)) {
          defBlock.sseq.forEach(senseSequence => {
            if (Array.isArray(senseSequence)) {
              senseSequence.forEach(sense => {
                if (Array.isArray(sense) && sense.length > 1) {
                  // Try to get the English translation from cxl (cross language) field
                  if (sense[1].cxl && Array.isArray(sense[1].cxl)) {
                    sense[1].cxl.forEach(cxl => {
                      if (cxl && Array.isArray(cxl) && cxl.length > 1 && cxl[0] === 'cxt' && typeof cxl[1] === 'string') {
                        englishTranslations.push(cxl[1].replace(/\{[^}]*\}/g, '').trim());
                      }
                    });
                  }
                  
                  // Also try to get it from the dt field
                  if (sense[1].dt && Array.isArray(sense[1].dt)) {
                    // Extract definition text from the dt field
                    const text = extractSpanishDefinitionText(sense[1].dt);
                    if (text && !englishTranslations.includes(text)) {
                      englishTranslations.push(text);
                    }
                  }
                }
              });
            }
          });
        }
      });
    }
    
    // Get the main English translation
    const englishTranslation = englishTranslations.length > 0 ? englishTranslations[0] : '';
    
    // Create definition objects
    const definitions = englishTranslations.map(translation => ({
      definition: translation,
      example: null // Examples could be extracted similarly, but we'll keep it simple for now
    }));
    
    // Create meanings array
    const meanings = [];
    
    // Only add meanings if we have translations
    if (definitions.length > 0) {
      meanings.push({
        partOfSpeech: partOfSpeech,
        definitions: definitions,
        synonyms: [],
        antonyms: []
      });
    } else {
      // If no translations found, provide a placeholder
      meanings.push({
        partOfSpeech: partOfSpeech,
        definitions: [{
          definition: `Spanish word "${spanishWord}" - translation not available`,
          example: null
        }],
        synonyms: [],
        antonyms: []
      });
    }
    
    return {
      word: spanishWord,
      englishTranslation,
      spanishWord: true,
      translatedDefinition: true,
      meanings,
      detectedLanguage: 'es',
      error: false,
      api: 'Merriam-Webster Spanish'
    };
  } catch (error) {
    console.error('Error processing Spanish definition data:', error);
    return {
      error: true,
      message: 'Error processing Spanish definition data',
      word: originalWord,
      errorDetails: error.message
    };
  }
};

/**
 * Helper to safely extract definition text from Merriam-Webster data structure
 * @param {Array} dt - Definition text array
 * @returns {string} - Extracted definition text
 */
const extractDefinitionText = (dt) => {
  if (!dt || !Array.isArray(dt)) return '';
  
  try {
    // Find the text definition, typically marked with "text"
    const textElements = dt.filter(item => 
      Array.isArray(item) && item.length > 0 && item[0] === 'text' && typeof item[1] === 'string'
    );
    
    if (textElements.length > 0) {
      return textElements.map(item => item[1])
        .join(' ')
        // Remove markup like {bc} {sx} etc.
        .replace(/\{[^}]*\}/g, '')
        .trim();
    }
    
    // Try alternative formats if text not found
    // Sometimes definition is in the first element
    if (dt[0] && Array.isArray(dt[0]) && dt[0].length > 1 && typeof dt[0][1] === 'string') {
      return dt[0][1]
        .replace(/\{[^}]*\}/g, '')
        .trim();
    }
    
    // Last resort: Try to find any text in the structure
    for (const item of dt) {
      if (Array.isArray(item) && item.length > 1) {
        if (typeof item[1] === 'string') {
          return item[1].replace(/\{[^}]*\}/g, '').trim();
        }
        else if (item[1] && typeof item[1].t === 'string') {
          return item[1].t.replace(/\{[^}]*\}/g, '').trim();
        }
      }
    }
  } catch (error) {
    console.error('Error extracting definition text:', error);
  }
  
  return 'Definition not available in standard format';
};

/**
 * Helper to extract definition text specifically for Spanish dictionary
 * which has a different structure
 * @param {Array} dt - Definition text array from Spanish dictionary
 * @returns {string} - Extracted definition text
 */
const extractSpanishDefinitionText = (dt) => {
  if (!dt || !Array.isArray(dt)) return '';
  
  try {
    let text = '';
    
    // Spanish dictionary often has translations in "translation" elements
    const translationElements = dt.filter(item => 
      Array.isArray(item) && item.length > 0 && item[0] === 'translation'
    );
    
    if (translationElements.length > 0) {
      for (const item of translationElements) {
        // Check if the translation element has content
        if (item[1] && typeof item[1] === 'string') {
          text += ' ' + item[1].replace(/\{[^}]*\}/g, '').trim();
        }
        // Sometimes it's in a nested structure
        else if (item[1] && item[1].t && typeof item[1].t === 'string') {
          text += ' ' + item[1].t.replace(/\{[^}]*\}/g, '').trim();
        }
      }
      
      if (text.trim()) return text.trim();
    }
    
    // Try other element types
    for (const item of dt) {
      if (Array.isArray(item) && item.length > 1) {
        // Check direct text
        if (typeof item[1] === 'string' && item[1].trim()) {
          return item[1].replace(/\{[^}]*\}/g, '').trim();
        }
        // Check for t property (common in Merriam-Webster)
        else if (item[1] && typeof item[1].t === 'string' && item[1].t.trim()) {
          return item[1].t.replace(/\{[^}]*\}/g, '').trim();
        }
      }
    }
  } catch (error) {
    console.error('Error extracting Spanish definition text:', error);
  }
  
  return '';
};

/**
 * Safely extract synonyms from entry
 * @param {Object} entry - Dictionary entry
 * @returns {Array} - Synonyms
 */
const extractSynonyms = (entry) => {
  try {
    if (entry.syns && Array.isArray(entry.syns) && entry.syns.length > 0) {
      const firstSyn = entry.syns[0];
      if (firstSyn && firstSyn.pt && Array.isArray(firstSyn.pt) && firstSyn.pt.length > 0) {
        const synData = firstSyn.pt[0];
        if (Array.isArray(synData) && synData.length > 1 && Array.isArray(synData[1])) {
          return synData[1];
        }
      }
    }
  } catch (error) {
    console.error('Error extracting synonyms:', error);
  }
  
  return [];
};

/**
 * Safely extract antonyms from entry
 * @param {Object} entry - Dictionary entry
 * @returns {Array} - Antonyms
 */
const extractAntonyms = (entry) => {
  try {
    if (entry.ants && Array.isArray(entry.ants) && entry.ants.length > 0) {
      const firstAnt = entry.ants[0];
      if (firstAnt && firstAnt.pt && Array.isArray(firstAnt.pt) && firstAnt.pt.length > 0) {
        const antData = firstAnt.pt[0];
        if (Array.isArray(antData) && antData.length > 1 && Array.isArray(antData[1])) {
          return antData[1];
        }
      }
    }
  } catch (error) {
    console.error('Error extracting antonyms:', error);
  }
  
  return [];
};

/**
 * Get the appropriate audio subdirectory based on the Merriam-Webster rules
 * @param {string} audioName - Audio file name
 * @returns {string} - Subdirectory name
 */
const getAudioSubdirectory = (audioName) => {
  if (!audioName) return '';
  
  // Special cases for files starting with certain characters
  if (audioName.startsWith('bix')) return 'bix';
  if (audioName.startsWith('gg')) return 'gg';
  if (/^\d/.test(audioName)) return 'number';
  if (/^[.,;:!?()'"-]/.test(audioName)) return 'punct';
  
  // Standard case: use the first letter
  return audioName.charAt(0);
};

/**
 * Get a random word from various frequency levels for vocabulary practice
 * @param {string} level - Difficulty level: 'easy', 'medium', 'hard', or 'random'
 * @returns {Promise<string>} - A random word
 */
export const getRandomWord = async (level = 'medium') => {
  // Simplified word lists by frequency/difficulty
  const wordLists = {
    easy: [
      'time', 'year', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child',
      'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part'
    ],
    medium: [
      'approach', 'establish', 'observe', 'concept', 'context', 'distribute', 'environment', 
      'factor', 'function', 'identify', 'individual', 'interpret', 'maintain', 'obtain', 
      'participate', 'perceive', 'positive', 'potential', 'previous', 'resource'
    ],
    hard: [
      'aberration', 'benevolent', 'cacophony', 'deleterious', 'ebullient', 'fastidious', 
      'garrulous', 'hegemony', 'iconoclast', 'juxtaposition', 'kleptomaniac', 'loquacious', 
      'magnanimous', 'nomenclature', 'obfuscate', 'peripatetic', 'quintessential', 'recalcitrant', 
      'sycophant', 'tautology'
    ]
  };
  
  // Choose the word list based on level
  let chosenList;
  if (level === 'random') {
    // Get a random level
    const levels = ['easy', 'medium', 'hard'];
    chosenList = wordLists[levels[Math.floor(Math.random() * levels.length)]];
  } else {
    chosenList = wordLists[level] || wordLists.medium;
  }
  
  // Return a random word from the chosen list
  return chosenList[Math.floor(Math.random() * chosenList.length)];
};

export default {
  getEnglishDefinition,
  getSpanishDefinition,
  getMultiLanguageDefinition,
  getRandomWord
};