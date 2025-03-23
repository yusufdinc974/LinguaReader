import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as quizService from '../services/quizService';
import { useVocabulary } from './VocabularyContext';
import ankiAlgorithm from '../utils/ankiAlgorithm';

// Create context
const QuizContext = createContext();

/**
 * Provider component for quiz functionality
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const QuizProvider = ({ children }) => {
  // Get vocabulary context
  const { vocabularyLists, getWordsInList } = useVocabulary();
  
  // Quiz state
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [quizMode, setQuizMode] = useState('wordToTranslation'); // or 'translationToWord'
  const [quizStyle, setQuizStyle] = useState('flashcard'); // or 'multipleChoice', 'typing'
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [dueWords, setDueWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    total: 0,
    startTime: null,
    endTime: null
  });
  const [quizSettings, setQuizSettings] = useState({
    newCardsPerDay: 20,
    reviewsPerDay: 100,
    learnAhead: false,
    quizBidirectional: true
  });
  
  // Added state for persistent stats page settings
  const [statsPageSettings, setStatsPageSettings] = useState({
    selectedListId: null,
    timeRange: 30,
    activeTab: 'overview',
    dataLoaded: {
      overview: false,
      progress: false,
      forecast: false,
      history: false
    }
  });
  
  // Load quiz settings and session history on mount
  useEffect(() => {
    const settings = quizService.getQuizSettings();
    setQuizSettings(settings);
    
    const history = quizService.getQuizSessionHistory();
    setSessionHistory(history);
  }, []);
  
  // Load due words when selected lists change
  useEffect(() => {
    if (selectedListIds.length > 0) {
      loadDueWordsForLists(selectedListIds);
    } else {
      setDueWords([]);
    }
  }, [selectedListIds]);
  
  // Update current card when current word index or due words change
  useEffect(() => {
    if (dueWords.length > 0 && currentWordIndex < dueWords.length) {
      setCurrentCard(dueWords[currentWordIndex]);
      setShowAnswer(false);
    } else if (isQuizActive && dueWords.length > 0 && currentWordIndex >= dueWords.length) {
      // End of quiz
      finishQuizSession();
    } else {
      setCurrentCard(null);
    }
  }, [currentWordIndex, dueWords, isQuizActive]);
  
  /**
   * Load due words for selected lists
   * @param {Array} listIds - IDs of selected vocabulary lists
   */
  const loadDueWordsForLists = useCallback((listIds) => {
    if (!listIds || listIds.length === 0) {
      setDueWords([]);
      return;
    }
    
    // Get all word IDs from selected lists
    const allWordIds = listIds.flatMap(listId => {
      const list = vocabularyLists.find(l => l.id === listId);
      return list ? list.words : [];
    });
    
    // Remove duplicates
    const uniqueWordIds = [...new Set(allWordIds)];
    
    // Get words due for review
    const dueWordsForQuiz = quizService.getDueWords(uniqueWordIds, {
      limit: quizSettings.newCardsPerDay + quizSettings.reviewsPerDay,
      includeLearning: true,
      includeNew: true
    });
    
    // Shuffle the words
    const shuffledWords = shuffleArray(dueWordsForQuiz);
    
    setDueWords(shuffledWords);
  }, [vocabularyLists, quizSettings]);
  
  /**
   * Start a new quiz session
   */
  const startQuiz = useCallback(() => {
    if (dueWords.length === 0) {
      console.error('No due words available to start quiz');
      return;
    }
    
    const newSession = {
      listIds: selectedListIds,
      mode: quizMode,
      style: quizStyle,
      words: dueWords.map(word => word.id),
      answers: [],
      startTime: new Date().toISOString()
    };
    
    setCurrentSession(newSession);
    setCurrentWordIndex(0);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      skipped: 0,
      total: dueWords.length,
      startTime: new Date(),
      endTime: null
    });
    setIsQuizActive(true);
    setShowAnswer(false);
  }, [dueWords, selectedListIds, quizMode, quizStyle]);
  
  /**
   * Finish the current quiz session
   */
  const finishQuizSession = useCallback(() => {
    if (!currentSession) return;
    
    // Update session with end time
    const completedSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      duration: sessionStats.startTime 
        ? Math.round((new Date() - sessionStats.startTime) / 1000) 
        : 0
    };
    
    // Save session to history
    const savedSession = quizService.saveQuizSession(completedSession);
    
    // Update session history
    setSessionHistory(prev => [savedSession, ...prev]);
    
    // Reset quiz state
    setIsQuizActive(false);
    setCurrentSession(null);
    setCurrentWordIndex(0);
    setSessionStats(prev => ({
      ...prev,
      endTime: new Date()
    }));
    
    // Reload due words after a short delay
    setTimeout(() => {
      if (selectedListIds.length > 0) {
        loadDueWordsForLists(selectedListIds);
      }
    }, 500);
  }, [currentSession, sessionStats, selectedListIds, loadDueWordsForLists]);
  
  /**
   * Cancel the current quiz session
   */
  const cancelQuiz = useCallback(() => {
    setIsQuizActive(false);
    setCurrentSession(null);
    setCurrentWordIndex(0);
    setShowAnswer(false);
  }, []);
  
  /**
   * Handle a quiz answer
   * @param {number} qualityRating - Quality rating (1-4)
   */
  const answerCard = useCallback((qualityRating) => {
    if (!currentCard || !isQuizActive) return;
    
    // Process the answer with the ANKI algorithm
    const updatedLearningData = quizService.processQuizAnswer(currentCard.id, qualityRating);
    
    // Record the answer in the session
    if (currentSession) {
      const answerData = {
        wordId: currentCard.id,
        qualityRating,
        correct: qualityRating >= 3, // Good or Easy is considered correct
        timestamp: new Date().toISOString()
      };
      
      setCurrentSession(prev => ({
        ...prev,
        answers: [...prev.answers, answerData]
      }));
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        correct: prev.correct + (qualityRating >= 3 ? 1 : 0),
        incorrect: prev.incorrect + (qualityRating < 3 ? 1 : 0)
      }));
    }
    
    // Move to the next card
    setCurrentWordIndex(prev => prev + 1);
    setShowAnswer(false);
  }, [currentCard, isQuizActive, currentSession]);
  
  /**
   * Skip the current card
   */
  const skipCard = useCallback(() => {
    if (!currentCard || !isQuizActive) return;
    
    // Record the skip in the session
    if (currentSession) {
      const skipData = {
        wordId: currentCard.id,
        skipped: true,
        timestamp: new Date().toISOString()
      };
      
      setCurrentSession(prev => ({
        ...prev,
        answers: [...prev.answers, skipData]
      }));
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        skipped: prev.skipped + 1
      }));
    }
    
    // Move to the next card
    setCurrentWordIndex(prev => prev + 1);
    setShowAnswer(false);
  }, [currentCard, isQuizActive, currentSession]);
  
  /**
   * Toggle showing the answer for the current card
   */
  const toggleShowAnswer = useCallback(() => {
    setShowAnswer(prev => !prev);
  }, []);
  
  /**
   * Update quiz settings
   * @param {Object} newSettings - New settings to apply
   */
  const updateSettings = useCallback((newSettings) => {
    const updatedSettings = quizService.updateQuizSettings(newSettings);
    setQuizSettings(updatedSettings);
  }, []);
  
  /**
   * Reset learning data for specified words
   * @param {Array} wordIds - IDs of words to reset
   */
  const resetProgress = useCallback((wordIds) => {
    if (!wordIds || wordIds.length === 0) return;
    
    const success = quizService.resetLearningData(wordIds);
    if (success && selectedListIds.length > 0) {
      loadDueWordsForLists(selectedListIds);
    }
    
    return success;
  }, [selectedListIds, loadDueWordsForLists]);
  
  /**
   * Get overdue cards count for specified lists
   * @param {Array} listIds - IDs of vocabulary lists
   * @returns {Object} - Counts of overdue cards
   */
  const getOverdueCount = useCallback((listIds) => {
    if (!listIds || listIds.length === 0) return { total: 0 };
    
    // Get all word IDs from selected lists
    const allWordIds = listIds.flatMap(listId => {
      const list = vocabularyLists.find(l => l.id === listId);
      return list ? list.words : [];
    });
    
    // Remove duplicates
    const uniqueWordIds = [...new Set(allWordIds)];
    
    return quizService.getOverdueCards(uniqueWordIds);
  }, [vocabularyLists]);
  
  /**
   * Get learning statistics for a specific list
   * @param {string} listId - ID of vocabulary list
   * @returns {Object} - Learning statistics
   */
  const getListLearningStats = useCallback((listId) => {
    if (!listId) return null;
    
    // Get words in the list
    const words = getWordsInList(listId);
    if (!words || words.length === 0) return null;
    
    // Get learning data for all words
    const allLearningData = quizService.getAllLearningData();
    
    // Attach learning data to words
    const wordsWithLearningData = words.map(word => ({
      ...word,
      learningData: allLearningData[word.id] || null
    }));
    
    // Calculate stats using ANKI algorithm
    return ankiAlgorithm.calculateOverallStats(wordsWithLearningData);
  }, [getWordsInList]);
  
  /**
   * Get review forecast for specified lists
   * @param {Array} listIds - IDs of vocabulary lists
   * @param {number} days - Number of days to forecast
   * @returns {Array} - Forecast of upcoming reviews
   */
  const getReviewForecast = useCallback((listIds, days = 30) => {
    if (!listIds || listIds.length === 0) return Array(days).fill(0);
    
    // Get all word IDs from selected lists
    const allWordIds = listIds.flatMap(listId => {
      const list = vocabularyLists.find(l => l.id === listId);
      return list ? list.words : [];
    });
    
    // Remove duplicates
    const uniqueWordIds = [...new Set(allWordIds)];
    
    // Get all vocabulary words
    const allWords = getWordsInList(listIds[0]); // This is not ideal, should get words from all lists
    
    // Filter to specified words
    const filteredWords = allWords.filter(word => uniqueWordIds.includes(word.id));
    
    // Get learning data for all words
    const allLearningData = quizService.getAllLearningData();
    
    // Attach learning data to words
    const wordsWithLearningData = filteredWords.map(word => ({
      ...word,
      learningData: allLearningData[word.id] || null
    }));
    
    // Generate forecast using ANKI algorithm
    return ankiAlgorithm.generateReviewForecast(wordsWithLearningData, days);
  }, [vocabularyLists, getWordsInList]);
  
  /**
   * Update stats page settings for persistence across page navigation
   * @param {Object} newSettings - New stats page settings
   */
  const updateStatsPageSettings = useCallback((newSettings) => {
    setStatsPageSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);
  
  // Context value
  const contextValue = {
    // State
    selectedListIds,
    quizMode,
    quizStyle,
    isQuizActive,
    currentSession,
    sessionHistory,
    dueWords,
    currentWordIndex,
    currentCard,
    showAnswer,
    sessionStats,
    quizSettings,
    statsPageSettings,
    
    // Setters
    setSelectedListIds,
    setQuizMode,
    setQuizStyle,
    updateStatsPageSettings,
    
    // Actions
    startQuiz,
    finishQuizSession,
    cancelQuiz,
    answerCard,
    skipCard,
    toggleShowAnswer,
    updateSettings,
    resetProgress,
    
    // Getters
    getOverdueCount,
    getListLearningStats,
    getReviewForecast
  };
  
  return (
    <QuizContext.Provider value={contextValue}>
      {children}
    </QuizContext.Provider>
  );
};

/**
 * Custom hook for using quiz context
 * @returns {Object} - Quiz context
 */
export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default QuizContext;