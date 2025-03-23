/**
 * quizService.js
 * Handles data operations related to quizzes and spaced repetition
 */

import * as storageService from './storageService';
import ankiAlgorithm from '../utils/ankiAlgorithm';

// Define the storage namespace directly instead of importing from storageService
const QUIZ_STORAGE_NAMESPACE = 'vocabulary-pdf-reader';

// Storage keys for quiz data
const QUIZ_STORAGE_KEYS = {
  LEARNING_DATA: `${QUIZ_STORAGE_NAMESPACE}.learning-data`,
  SESSION_HISTORY: `${QUIZ_STORAGE_NAMESPACE}.quiz-sessions`,
  QUIZ_SETTINGS: `${QUIZ_STORAGE_NAMESPACE}.quiz-settings`
};

/**
 * Initialize quiz data storage
 */
export const initQuizStorage = () => {
  if (!storageService.getItem(QUIZ_STORAGE_KEYS.LEARNING_DATA)) {
    storageService.setItem(QUIZ_STORAGE_KEYS.LEARNING_DATA, {});
  }
  
  if (!storageService.getItem(QUIZ_STORAGE_KEYS.SESSION_HISTORY)) {
    storageService.setItem(QUIZ_STORAGE_KEYS.SESSION_HISTORY, []);
  }
  
  if (!storageService.getItem(QUIZ_STORAGE_KEYS.QUIZ_SETTINGS)) {
    storageService.setItem(QUIZ_STORAGE_KEYS.QUIZ_SETTINGS, {
      newCardsPerDay: 20,
      reviewsPerDay: 100,
      learnAhead: false,
      quizBidirectional: true
    });
  }
};

/**
 * Get learning data for a specific word
 * @param {string} wordId - ID of the word
 * @returns {Object|null} - Learning data for the word, or null if not found
 */
export const getWordLearningData = (wordId) => {
  const learningData = storageService.getItem(QUIZ_STORAGE_KEYS.LEARNING_DATA) || {};
  return learningData[wordId] || null;
};

/**
 * Get learning data for all words
 * @returns {Object} - Map of word IDs to learning data
 */
export const getAllLearningData = () => {
  return storageService.getItem(QUIZ_STORAGE_KEYS.LEARNING_DATA) || {};
};

/**
 * Update learning data for a word
 * @param {string} wordId - ID of the word
 * @param {Object} learningData - New learning data
 * @returns {Object} - Updated learning data
 */
export const updateWordLearningData = (wordId, learningData) => {
  const allLearningData = storageService.getItem(QUIZ_STORAGE_KEYS.LEARNING_DATA) || {};
  allLearningData[wordId] = learningData;
  storageService.setItem(QUIZ_STORAGE_KEYS.LEARNING_DATA, allLearningData);
  return learningData;
};

/**
 * Process a quiz answer and update learning data
 * @param {string} wordId - ID of the word
 * @param {number} qualityRating - Quality rating (1-4)
 * @returns {Object} - Updated learning data
 */
export const processQuizAnswer = (wordId, qualityRating) => {
  // Get word data from vocabulary storage
  const allWords = storageService.getAllVocabulary();
  const word = allWords.find(w => w.id === wordId);
  
  if (!word) {
    console.error(`Word with ID ${wordId} not found.`);
    return null;
  }
  
  // Get existing learning data
  const existingLearningData = getWordLearningData(wordId);
  
  // Prepare card data for algorithm
  const card = {
    ...word,
    learningData: existingLearningData
  };
  
  // Calculate next interval using ANKI algorithm
  const updatedLearningData = ankiAlgorithm.calculateNextReviewInterval(card, qualityRating);
  
  // Update learning data in storage
  return updateWordLearningData(wordId, updatedLearningData);
};

/**
 * Get words due for review
 * @param {Array} wordIds - IDs of words to check (from specific list)
 * @param {Object} options - Options for filtering due cards
 * @returns {Array} - Words due for review
 */
export const getDueWords = (wordIds, options = {}) => {
  const {
    limit = 20,
    includeLearning = true,
    includeNew = true
  } = options;
  
  // If no word IDs provided, return empty array
  if (!wordIds || wordIds.length === 0) {
    return [];
  }
  
  // Get all vocabulary words
  const allWords = storageService.getAllVocabulary();
  
  // Filter to specified words
  const filteredWords = allWords.filter(word => wordIds.includes(word.id));
  
  // Get learning data for all words
  const allLearningData = getAllLearningData();
  
  // Attach learning data to words
  const wordsWithLearningData = filteredWords.map(word => ({
    ...word,
    learningData: allLearningData[word.id] || null
  }));
  
  // Separate new and review cards
  const newCards = includeNew 
    ? wordsWithLearningData.filter(word => !word.learningData || !word.learningData.interval)
    : [];
    
  const reviewCards = includeLearning
    ? wordsWithLearningData.filter(word => word.learningData && word.learningData.interval)
    : [];
  
  // Get due review cards
  const dueReviewCards = ankiAlgorithm.getDueCards(reviewCards);
  
  // Combine new and review cards, with review cards first
  const combinedCards = [...dueReviewCards, ...newCards];
  
  // Return up to the limit
  return combinedCards.slice(0, limit);
};

/**
 * Save a quiz session
 * @param {Object} sessionData - Data about the quiz session
 * @returns {Object} - Saved session data with ID
 */
export const saveQuizSession = (sessionData) => {
  const sessionHistory = storageService.getItem(QUIZ_STORAGE_KEYS.SESSION_HISTORY) || [];
  
  const newSession = {
    id: generateSessionId(),
    date: new Date().toISOString(),
    ...sessionData
  };
  
  sessionHistory.push(newSession);
  storageService.setItem(QUIZ_STORAGE_KEYS.SESSION_HISTORY, sessionHistory);
  
  return newSession;
};

/**
 * Get quiz session history
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Array} - Quiz session history
 */
export const getQuizSessionHistory = (limit = undefined) => {
  const sessionHistory = storageService.getItem(QUIZ_STORAGE_KEYS.SESSION_HISTORY) || [];
  
  // Sort by date (newest first)
  const sortedHistory = [...sessionHistory].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  
  if (limit) {
    return sortedHistory.slice(0, limit);
  }
  
  return sortedHistory;
};

/**
 * Get quiz settings
 * @returns {Object} - Quiz settings
 */
export const getQuizSettings = () => {
  return storageService.getItem(QUIZ_STORAGE_KEYS.QUIZ_SETTINGS) || {
    newCardsPerDay: 20,
    reviewsPerDay: 100,
    learnAhead: false,
    quizBidirectional: true
  };
};

/**
 * Update quiz settings
 * @param {Object} newSettings - New settings to apply
 * @returns {Object} - Updated settings
 */
export const updateQuizSettings = (newSettings) => {
  const currentSettings = getQuizSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  storageService.setItem(QUIZ_STORAGE_KEYS.QUIZ_SETTINGS, updatedSettings);
  return updatedSettings;
};

/**
 * Get cards with overdue reviews
 * @param {Array} wordIds - IDs of words to check
 * @returns {Object} - Counts of overdue cards by days
 */
export const getOverdueCards = (wordIds) => {
  // If no word IDs provided, return empty counts
  if (!wordIds || wordIds.length === 0) {
    return {
      total: 0,
      byDays: {
        today: 0,
        yesterday: 0,
        older: 0,
        veryOld: 0
      }
    };
  }
  
  // Get all vocabulary words
  const allWords = storageService.getAllVocabulary();
  
  // Filter to specified words
  const filteredWords = allWords.filter(word => wordIds.includes(word.id));
  
  // Get learning data for all words
  const allLearningData = getAllLearningData();
  
  // Attach learning data to words
  const wordsWithLearningData = filteredWords.map(word => ({
    ...word,
    learningData: allLearningData[word.id] || null
  }));
  
  // Filter to only include words with learning data
  const wordsWithReviews = wordsWithLearningData.filter(
    word => word.learningData && word.learningData.nextReviewDate
  );
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Initialize counts
  const counts = {
    total: 0,
    byDays: {
      today: 0,
      yesterday: 0,
      older: 0,
      veryOld: 0
    }
  };
  
  // Count overdue cards
  wordsWithReviews.forEach(word => {
    const nextReviewDate = new Date(word.learningData.nextReviewDate);
    nextReviewDate.setHours(0, 0, 0, 0);
    
    if (nextReviewDate <= now) {
      counts.total++;
      
      if (nextReviewDate.getTime() === now.getTime()) {
        counts.byDays.today++;
      } else if (nextReviewDate.getTime() === yesterday.getTime()) {
        counts.byDays.yesterday++;
      } else if (nextReviewDate >= oneWeekAgo) {
        counts.byDays.older++;
      } else {
        counts.byDays.veryOld++;
      }
    }
  });
  
  return counts;
};

/**
 * Reset learning data for words
 * @param {Array} wordIds - IDs of words to reset
 * @returns {boolean} - Success indicator
 */
export const resetLearningData = (wordIds) => {
  if (!wordIds || wordIds.length === 0) {
    return false;
  }
  
  const allLearningData = getAllLearningData();
  
  // Remove learning data for specified words
  wordIds.forEach(wordId => {
    delete allLearningData[wordId];
  });
  
  storageService.setItem(QUIZ_STORAGE_KEYS.LEARNING_DATA, allLearningData);
  return true;
};

/**
 * Generate a unique session ID
 * @returns {string} - Unique ID
 */
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initialize storage on module load
initQuizStorage();

export default {
  getWordLearningData,
  getAllLearningData,
  updateWordLearningData,
  processQuizAnswer,
  getDueWords,
  saveQuizSession,
  getQuizSessionHistory,
  getQuizSettings,
  updateQuizSettings,
  getOverdueCards,
  resetLearningData
};