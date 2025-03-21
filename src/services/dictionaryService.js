/**
 * Dictionary Service
 * Provides access to Free Dictionary API for word definitions and related data.
 * Enhanced with cross-language support for Spanish-English lookups.
 */

import { translateText, detectLanguage } from './translationService';

const API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/';

/**
 * Get definitions of a word from the Free Dictionary API
 * @param {string} word - The word to look up
 * @param {string} language - Language code ('en' or 'es')
 * @returns {Promise<Object>} - Definition data
 */
export const getWordDefinition = async (word, language = 'en') => {
  try {
    // Trim and validate the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      throw new Error('No word provided');
    }

    // Make API request
    const response = await fetch(`${API_BASE_URL}${language}/${encodeURIComponent(trimmedWord)}`);
    
    // Check if successful
    if (!response.ok) {
      if (response.status === 404) {
        return {
          error: true,
          message: 'Word not found',
          status: 404,
          word: trimmedWord
        };
      }
      
      throw new Error(`Dictionary API error: ${response.statusText}`);
    }

    // Parse response
    const data = await response.json();
    
    // Process data into a more usable format
    return processDefinitionData(data, trimmedWord);
  } catch (error) {
    console.error('Error fetching word definition:', error);
    
    return {
      error: true,
      message: error.message,
      word
    };
  }
};

/**
 * Get cross-language definition - for Spanish words, provides English definitions
 * @param {string} word - The word to look up
 * @returns {Promise<Object>} - Definition data with translation information
 */
export const getCrossLanguageDefinition = async (word) => {
  try {
    // Trim and validate the word
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      throw new Error('No word provided');
    }

    // First, detect the language of the word
    const languageResult = await detectLanguage(trimmedWord);
    const detectedLanguage = languageResult.detected || 'en';
    
    // Try to get definition in the detected language first
    let definition = await getWordDefinition(trimmedWord, detectedLanguage);
    
    // If we found a definition in the detected language, return it
    if (!definition.error) {
      // Add detected language information
      definition.detectedLanguage = detectedLanguage;
      return definition;
    }
    
    // If word is Spanish and Spanish definition failed, get English definition for translated word
    if (detectedLanguage === 'es') {
      // Translate the word to English
      const translationResult = await translateText(trimmedWord, 'es', 'en');
      
      if (!translationResult.error) {
        const translatedWord = translationResult.translated;
        
        // Look up the English translation
        const englishDefinition = await getWordDefinition(translatedWord, 'en');
        
        if (!englishDefinition.error) {
          // Add translation information to the definition
          englishDefinition.isTranslated = true;
          englishDefinition.originalWord = trimmedWord;
          englishDefinition.originalLanguage = 'es';
          englishDefinition.translatedFrom = trimmedWord;
          englishDefinition.detectedLanguage = 'es';
          return englishDefinition;
        }
      }
    }
    
    // If nothing worked, return the original error
    return {
      error: true,
      message: `No definition found for '${trimmedWord}' in any language`,
      word: trimmedWord,
      detectedLanguage
    };
  } catch (error) {
    console.error('Error in cross-language definition lookup:', error);
    
    return {
      error: true,
      message: error.message,
      word
    };
  }
};

/**
 * Process raw dictionary API data into a more usable format
 * @param {Array} data - Raw data from dictionary API
 * @param {string} originalWord - The requested word
 * @returns {Object} - Processed definition data
 */
const processDefinitionData = (data, originalWord) => {
  // Check if we have valid data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      error: true,
      message: 'Invalid response format',
      word: originalWord
    };
  }

  // Extract the main word data
  const wordData = data[0];
  
  // Extract phonetics (pronunciation)
  const phonetics = wordData.phonetics
    ? wordData.phonetics
        .filter(p => p.text) // Only include entries with text
        .map(p => ({
          text: p.text,
          audio: p.audio || null
        }))
    : [];
  
  // Get the first audio file if available
  const audioFile = wordData.phonetics?.find(p => p.audio)?.audio || null;
  
  // Extract meanings by part of speech
  const meanings = wordData.meanings?.map(meaning => ({
    partOfSpeech: meaning.partOfSpeech,
    definitions: meaning.definitions.map(def => ({
      definition: def.definition,
      example: def.example || null,
      synonyms: def.synonyms || [],
      antonyms: def.antonyms || []
    })),
    synonyms: meaning.synonyms || [],
    antonyms: meaning.antonyms || []
  })) || [];

  // Return processed data
  return {
    word: wordData.word || originalWord,
    phonetic: wordData.phonetic || (phonetics.length > 0 ? phonetics[0].text : null),
    phonetics,
    audioFile,
    meanings,
    sourceUrls: wordData.sourceUrls || [],
    error: false
  };
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
  getWordDefinition,
  getCrossLanguageDefinition,
  getRandomWord
};