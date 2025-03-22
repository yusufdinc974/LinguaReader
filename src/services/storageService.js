/**
 * Storage Service
 * Handles local storage of application data using Electron Store or localStorage
 * Enhanced with better vocabulary management for translations
 */

// Namespace for all stored data to avoid conflicts with other applications
const STORAGE_NAMESPACE = 'vocabulary-pdf-reader';

// Keys for different data types
const STORAGE_KEYS = {
  PDF_LIST: `${STORAGE_NAMESPACE}.pdf-list`,
  VOCABULARY: `${STORAGE_NAMESPACE}.vocabulary`,
  SETTINGS: `${STORAGE_NAMESPACE}.settings`,
  NOTES: `${STORAGE_NAMESPACE}.notes`,
  VOCABULARY_LISTS: `${STORAGE_NAMESPACE}.vocabulary-lists`, // New key for vocabulary lists
};

// Supported languages - must match the list in translationService.js
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

// Check if we're in Electron environment
const isElectron = window && window.electron;

/**
 * Initialize the storage with default values if they don't exist
 */
export const initializeStorage = () => {
  if (!getItem(STORAGE_KEYS.PDF_LIST)) {
    setItem(STORAGE_KEYS.PDF_LIST, []);
  }
  
  if (!getItem(STORAGE_KEYS.VOCABULARY)) {
    setItem(STORAGE_KEYS.VOCABULARY, { global: [], byPdf: {} });
  }
  
  if (!getItem(STORAGE_KEYS.SETTINGS)) {
    setItem(STORAGE_KEYS.SETTINGS, {
      highlightColors: [
        { level: 1, color: '#ff6b6b' }, // Red
        { level: 2, color: '#feca57' }, // Yellow
        { level: 3, color: '#48dbfb' }, // Light Blue
        { level: 4, color: '#1dd1a1' }, // Green
        { level: 5, color: '#c8d6e5' }  // Light Gray (well known)
      ],
      preferredLanguages: ['en', 'es', 'fr', 'de'], // Default preferred languages
      highlightEnabled: true
    });
  }
  
  if (!getItem(STORAGE_KEYS.NOTES)) {
    setItem(STORAGE_KEYS.NOTES, []);
  }
  
  // Initialize vocabulary lists if they don't exist
  if (!getItem(STORAGE_KEYS.VOCABULARY_LISTS)) {
    setItem(STORAGE_KEYS.VOCABULARY_LISTS, {
      lists: [
        {
          id: generateId(),
          name: 'Default List',
          description: 'Default vocabulary list',
          words: [],
          dateCreated: new Date().toISOString()
        }
      ],
      defaultListId: null // Will be set to the ID of the default list
    });
    
    // Set the default list ID
    const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
    if (listsData && listsData.lists && listsData.lists.length > 0) {
      listsData.defaultListId = listsData.lists[0].id;
      setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
    }
  }
};

/**
 * Get an item from storage
 * @param {string} key - The storage key
 * @returns {any} - The stored value, or null if not found
 */
export const getItem = (key) => {
  try {
    // In Electron, use IPC to get data from the main process
    if (isElectron && window.electron.getStorageItem) {
      // This would normally be an async call, but we're simplifying for now
      // In a real app, this would be handled with async/await
      const storedData = window.localStorage.getItem(key);
      return storedData ? JSON.parse(storedData) : null;
    }
    
    // Fallback to localStorage
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting item from storage [${key}]:`, error);
    return null;
  }
};

/**
 * Set an item in storage
 * @param {string} key - The storage key
 * @param {any} value - The value to store
 */
export const setItem = (key, value) => {
  try {
    // Stringify the value
    const stringValue = JSON.stringify(value);
    
    // In Electron, use IPC to save data in the main process
    if (isElectron && window.electron.setStorageItem) {
      // This would normally be an async call, but we're simplifying for now
      window.localStorage.setItem(key, stringValue);
      return;
    }
    
    // Fallback to localStorage
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error setting item in storage [${key}]:`, error);
  }
};

/**
 * Remove an item from storage
 * @param {string} key - The storage key
 */
export const removeItem = (key) => {
  try {
    // In Electron, use IPC to remove data in the main process
    if (isElectron && window.electron.removeStorageItem) {
      window.localStorage.removeItem(key);
      return;
    }
    
    // Fallback to localStorage
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item from storage [${key}]:`, error);
  }
};

// PDF List Management

/**
 * Get the list of saved PDFs
 * @returns {Array} - The list of PDF metadata
 */
export const getPDFList = () => {
  return getItem(STORAGE_KEYS.PDF_LIST) || [];
};

/**
 * Add a PDF to the list
 * @param {Object} pdfMetadata - Metadata for the PDF
 */
export const addPDFToList = (pdfMetadata) => {
  const pdfList = getPDFList();
  const existingIndex = pdfList.findIndex(pdf => pdf.path === pdfMetadata.path);
  
  if (existingIndex >= 0) {
    // Update existing entry
    pdfList[existingIndex] = {
      ...pdfList[existingIndex],
      ...pdfMetadata,
      lastOpened: new Date().toISOString()
    };
  } else {
    // Add new entry
    pdfList.push({
      ...pdfMetadata,
      id: generateId(),
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString()
    });
  }
  
  setItem(STORAGE_KEYS.PDF_LIST, pdfList);
  return pdfList;
};

/**
 * Remove a PDF from the list
 * @param {string} pdfId - ID of the PDF to remove
 */
export const removePDFFromList = (pdfId) => {
  const pdfList = getPDFList();
  const newList = pdfList.filter(pdf => pdf.id !== pdfId);
  setItem(STORAGE_KEYS.PDF_LIST, newList);
  return newList;
};

/**
 * Update a PDF's metadata in the list
 * @param {string} pdfId - ID of the PDF to update
 * @param {Object} newMetadata - New metadata to apply
 */
export const updatePDFMetadata = (pdfId, newMetadata) => {
  const pdfList = getPDFList();
  const updatedList = pdfList.map(pdf => {
    if (pdf.id === pdfId) {
      return { ...pdf, ...newMetadata };
    }
    return pdf;
  });
  
  setItem(STORAGE_KEYS.PDF_LIST, updatedList);
  return updatedList;
};

/**
 * Update the last opened timestamp for a PDF
 * @param {string} pdfId - ID of the PDF
 */
export const updatePDFLastOpened = (pdfId) => {
  return updatePDFMetadata(pdfId, { lastOpened: new Date().toISOString() });
};

// Vocabulary Management

/**
 * Get all vocabulary words
 * @returns {Array} - All vocabulary words
 */
export const getAllVocabulary = () => {
  const vocab = getItem(STORAGE_KEYS.VOCABULARY);
  if (!vocab) return [];
  return vocab.global || [];
};

/**
 * Get vocabulary words for a specific PDF
 * @param {string} pdfId - ID of the PDF
 * @returns {Array} - Vocabulary words for the PDF
 */
export const getPDFVocabulary = (pdfId) => {
  const vocab = getItem(STORAGE_KEYS.VOCABULARY);
  if (!vocab || !vocab.byPdf || !vocab.byPdf[pdfId]) return [];
  return vocab.byPdf[pdfId] || [];
};

/**
 * Add a word to vocabulary
 * @param {Object} wordData - Word data to save
 * @param {string} pdfId - Optional PDF ID if the word is associated with a PDF
 */
export const addVocabularyWord = (wordData, pdfId = null) => {
  const vocab = getItem(STORAGE_KEYS.VOCABULARY) || { global: [], byPdf: {} };
  
  // Ensure the structure is created if it doesn't exist
  if (!vocab.global) vocab.global = [];
  if (!vocab.byPdf) vocab.byPdf = {};
  
  // Create a vocabulary entry with proper structure
  const wordEntry = {
    id: generateId(),
    word: wordData.word,
    // FIXED: Use sourceLang directly from wordData instead of using language field
    sourceLang: wordData.sourceLang || 'en',
    // FIXED: Use targetLang directly instead of getOppositeLanguage
    targetLang: wordData.targetLang || 'en',
    translation: wordData.translation || null,
    familiarityRating: wordData.familiarityRating || 1,
    dateAdded: wordData.date || new Date().toISOString(),
    lastReviewed: new Date().toISOString(),
    // Add sourceLanguageName and targetLanguageName for easier display
    sourceLanguageName: getLanguageName(wordData.sourceLang || 'en'),
    targetLanguageName: getLanguageName(wordData.targetLang || 'en'),
    // Reference to lists it belongs to
    lists: wordData.lists || []
  };
  
  // Add to global list (replace if exists)
  const existingGlobalIndex = vocab.global.findIndex(w => 
    w.word === wordEntry.word && w.sourceLang === wordEntry.sourceLang
  );
  
  if (existingGlobalIndex >= 0) {
    vocab.global[existingGlobalIndex] = wordEntry;
  } else {
    vocab.global.push(wordEntry);
  }
  
  // Add to PDF-specific list if applicable
  if (pdfId) {
    if (!vocab.byPdf[pdfId]) vocab.byPdf[pdfId] = [];
    
    const existingPdfIndex = vocab.byPdf[pdfId].findIndex(w => 
      w.word === wordEntry.word && w.sourceLang === wordEntry.sourceLang
    );
    
    if (existingPdfIndex >= 0) {
      vocab.byPdf[pdfId][existingPdfIndex] = wordEntry;
    } else {
      vocab.byPdf[pdfId].push(wordEntry);
    }
  }
  
  setItem(STORAGE_KEYS.VOCABULARY, vocab);
  return wordEntry;
};

/**
 * Remove a word from vocabulary
 * @param {string} wordId - ID of the word to remove
 * @param {string} pdfId - Optional PDF ID if removing from a specific PDF
 */
export const removeVocabularyWord = (wordId, pdfId = null) => {
  const vocab = getItem(STORAGE_KEYS.VOCABULARY);
  if (!vocab) return;
  
  // Remove from global list
  if (vocab.global) {
    vocab.global = vocab.global.filter(w => w.id !== wordId);
  }
  
  // Remove from PDF-specific list if applicable
  if (pdfId && vocab.byPdf && vocab.byPdf[pdfId]) {
    vocab.byPdf[pdfId] = vocab.byPdf[pdfId].filter(w => w.id !== wordId);
  }
  
  // Also remove from all vocabulary lists
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (listsData && listsData.lists) {
    listsData.lists = listsData.lists.map(list => ({
      ...list,
      words: list.words.filter(id => id !== wordId)
    }));
    setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  }
  
  setItem(STORAGE_KEYS.VOCABULARY, vocab);
};

/**
 * Update a vocabulary word
 * @param {string} wordId - ID of the word to update
 * @param {Object} newData - New data to apply
 */
export const updateVocabularyWord = (wordId, newData) => {
  const vocab = getItem(STORAGE_KEYS.VOCABULARY);
  if (!vocab) return null;
  
  // Update in global list
  if (vocab.global) {
    vocab.global = vocab.global.map(w => {
      if (w.id === wordId) {
        const updated = { ...w, ...newData, lastReviewed: new Date().toISOString() };
        
        // If sourceLang or targetLang was updated, also update their names
        if (newData.sourceLang) {
          updated.sourceLanguageName = getLanguageName(newData.sourceLang);
        }
        if (newData.targetLang) {
          updated.targetLanguageName = getLanguageName(newData.targetLang);
        }
        
        return updated;
      }
      return w;
    });
  }
  
  // Update in all PDF-specific lists
  if (vocab.byPdf) {
    Object.keys(vocab.byPdf).forEach(pdfId => {
      if (Array.isArray(vocab.byPdf[pdfId])) {
        vocab.byPdf[pdfId] = vocab.byPdf[pdfId].map(w => {
          if (w.id === wordId) {
            const updated = { ...w, ...newData, lastReviewed: new Date().toISOString() };
            
            // If sourceLang or targetLang was updated, also update their names
            if (newData.sourceLang) {
              updated.sourceLanguageName = getLanguageName(newData.sourceLang);
            }
            if (newData.targetLang) {
              updated.targetLanguageName = getLanguageName(newData.targetLang);
            }
            
            return updated;
          }
          return w;
        });
      }
    });
  }
  
  setItem(STORAGE_KEYS.VOCABULARY, vocab);
  const updatedWord = vocab.global.find(w => w.id === wordId);
  return updatedWord || null;
};

/**
 * Get vocabulary filtered by language
 * @param {string} language - Language code to filter by (source language)
 * @returns {Array} - Filtered vocabulary words
 */
export const getVocabularyBySourceLanguage = (language) => {
  const vocab = getAllVocabulary();
  if (!language) return vocab;
  return vocab.filter(w => w.sourceLang === language);
};

/**
 * Get vocabulary filtered by target language
 * @param {string} language - Language code to filter by (target language)
 * @returns {Array} - Filtered vocabulary words
 */
export const getVocabularyByTargetLanguage = (language) => {
  const vocab = getAllVocabulary();
  if (!language) return vocab;
  return vocab.filter(w => w.targetLang === language);
};

/**
 * Get all unique languages in the vocabulary
 * @returns {Array} - Array of language codes used in the vocabulary
 */
export const getVocabularyLanguages = () => {
  const vocab = getAllVocabulary();
  const languages = new Set();
  
  vocab.forEach(w => {
    if (w.sourceLang) languages.add(w.sourceLang);
    if (w.targetLang) languages.add(w.targetLang);
  });
  
  return Array.from(languages);
};

/**
 * Get vocabulary filtered by familiarity rating
 * @param {number} rating - Familiarity rating to filter by
 * @returns {Array} - Filtered vocabulary words
 */
export const getVocabularyByFamiliarity = (rating) => {
  const vocab = getAllVocabulary();
  if (!rating) return vocab;
  return vocab.filter(w => w.familiarityRating === rating);
};

/**
 * Get language name from language code
 * @param {string} code - Language code
 * @returns {string} - Language name or the code if not found
 */
export const getLanguageName = (code) => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code;
};

// Settings Management

/**
 * Get application settings
 * @returns {Object} - Application settings
 */
export const getSettings = () => {
  return getItem(STORAGE_KEYS.SETTINGS) || {};
};

/**
 * Update application settings
 * @param {Object} newSettings - New settings to apply
 */
export const updateSettings = (newSettings) => {
  const settings = getSettings();
  const updatedSettings = { ...settings, ...newSettings };
  setItem(STORAGE_KEYS.SETTINGS, updatedSettings);
  return updatedSettings;
};

/**
 * Get supported languages for the application
 * @returns {Array} - List of supported languages
 */
export const getSupportedLanguages = () => {
  return SUPPORTED_LANGUAGES;
};

/**
 * Get preferred languages from settings
 * @returns {Array} - List of preferred language codes
 */
export const getPreferredLanguages = () => {
  const settings = getSettings();
  return settings.preferredLanguages || ['en', 'es', 'fr', 'de'];
};

/**
 * Update preferred languages in settings
 * @param {Array} languages - List of language codes
 */
export const updatePreferredLanguages = (languages) => {
  return updateSettings({ preferredLanguages: languages });
};

// Vocabulary Lists Management

/**
 * Get all vocabulary lists
 * @returns {Array} - All vocabulary lists
 */
export const getAllVocabularyLists = () => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  return listsData?.lists || [];
};

/**
 * Get the default list ID
 * @returns {string|null} - Default list ID or null if none
 */
export const getDefaultListId = () => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  return listsData?.defaultListId || null;
};

/**
 * Create a new vocabulary list
 * @param {Object} listData - List data (name, description)
 * @returns {Object} - The created list
 */
export const createVocabularyList = (listData) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS) || { lists: [], defaultListId: null };
  
  const newList = {
    id: generateId(),
    name: listData.name || 'New List',
    description: listData.description || '',
    words: [],
    dateCreated: new Date().toISOString()
  };
  
  listsData.lists.push(newList);
  
  // If this is the first list, set it as default
  if (!listsData.defaultListId && listsData.lists.length === 1) {
    listsData.defaultListId = newList.id;
  }
  
  setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  return newList;
};

/**
 * Update a vocabulary list
 * @param {string} listId - ID of the list to update
 * @param {Object} newData - New data to apply
 * @returns {Object|null} - The updated list or null if not found
 */
export const updateVocabularyList = (listId, newData) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return null;
  
  const updatedLists = listsData.lists.map(list => {
    if (list.id === listId) {
      return { ...list, ...newData };
    }
    return list;
  });
  
  listsData.lists = updatedLists;
  setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  
  return listsData.lists.find(list => list.id === listId) || null;
};

/**
 * Delete a vocabulary list
 * @param {string} listId - ID of the list to delete
 * @returns {boolean} - True if successful
 */
export const deleteVocabularyList = (listId) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return false;
  
  // Don't delete if it's the only list
  if (listsData.lists.length <= 1) return false;
  
  const filteredLists = listsData.lists.filter(list => list.id !== listId);
  
  // If we're deleting the default list, set a new default
  if (listsData.defaultListId === listId) {
    listsData.defaultListId = filteredLists[0]?.id || null;
  }
  
  listsData.lists = filteredLists;
  setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  
  return true;
};

/**
 * Add a word to a vocabulary list
 * @param {string} wordId - ID of the word to add
 * @param {string} listId - ID of the list to add to
 * @returns {boolean} - True if successful
 */
export const addWordToList = (wordId, listId) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return false;
  
  const list = listsData.lists.find(l => l.id === listId);
  if (!list) return false;
  
  // Check if word is already in the list
  if (!list.words.includes(wordId)) {
    list.words.push(wordId);
    setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  }
  
  return true;
};

/**
 * Remove a word from a vocabulary list
 * @param {string} wordId - ID of the word to remove
 * @param {string} listId - ID of the list to remove from
 * @returns {boolean} - True if successful
 */
export const removeWordFromList = (wordId, listId) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return false;
  
  const list = listsData.lists.find(l => l.id === listId);
  if (!list) return false;
  
  list.words = list.words.filter(id => id !== wordId);
  setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  
  return true;
};

/**
 * Get all words in a vocabulary list
 * @param {string} listId - ID of the list
 * @returns {Array} - Words in the list
 */
export const getWordsInList = (listId) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return [];
  
  const list = listsData.lists.find(l => l.id === listId);
  if (!list) return [];
  
  const allWords = getAllVocabulary();
  return allWords.filter(word => list.words.includes(word.id));
};

/**
 * Set the default vocabulary list
 * @param {string} listId - ID of the list to set as default
 * @returns {boolean} - True if successful
 */
export const setDefaultList = (listId) => {
  const listsData = getItem(STORAGE_KEYS.VOCABULARY_LISTS);
  if (!listsData || !listsData.lists) return false;
  
  // Verify the list exists
  const listExists = listsData.lists.some(list => list.id === listId);
  if (!listExists) return false;
  
  listsData.defaultListId = listId;
  setItem(STORAGE_KEYS.VOCABULARY_LISTS, listsData);
  
  return true;
};

// Helper Functions

/**
 * Generate a unique ID
 * @returns {string} - A unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initialize storage on module load
initializeStorage();

export default {
  getPDFList,
  addPDFToList,
  removePDFFromList,
  updatePDFMetadata,
  updatePDFLastOpened,
  getAllVocabulary,
  getPDFVocabulary,
  addVocabularyWord,
  removeVocabularyWord,
  updateVocabularyWord,
  getVocabularyBySourceLanguage,
  getVocabularyByTargetLanguage,
  getVocabularyByFamiliarity,
  getVocabularyLanguages,
  getSettings,
  updateSettings,
  getSupportedLanguages,
  getPreferredLanguages,
  updatePreferredLanguages,
  getLanguageName,
  // New vocabulary list functions
  getAllVocabularyLists,
  getDefaultListId,
  createVocabularyList,
  updateVocabularyList,
  deleteVocabularyList,
  addWordToList,
  removeWordFromList,
  getWordsInList,
  setDefaultList,
  // Base storage functions
  getItem,
  setItem,
  removeItem,
  STORAGE_KEYS
};