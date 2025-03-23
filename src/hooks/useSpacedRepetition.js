import { useCallback } from 'react';
import ankiAlgorithm from '../utils/ankiAlgorithm';
import * as quizService from '../services/quizService';
import * as statsCalculation from '../utils/statsCalculation';

/**
 * Custom hook for accessing spaced repetition functionality
 * @returns {Object} - Spaced repetition functions and utilities
 */
const useSpacedRepetition = () => {
  /**
   * Calculate statistics for a word's learning progress
   * @param {Object} word - Vocabulary word
   * @returns {Object} - Statistics for the word
   */
  const getWordStats = useCallback((word) => {
    if (!word) return null;
    
    // Get learning data for word
    const learningData = quizService.getWordLearningData(word.id);
    
    // Merge word with learning data
    const wordWithLearningData = {
      ...word,
      learningData
    };
    
    // Calculate statistics
    return ankiAlgorithm.calculateCardStats(wordWithLearningData);
  }, []);
  
  /**
   * Format the interval for display
   * @param {number} interval - Interval in days
   * @returns {string} - Formatted interval
   */
  const formatInterval = useCallback((interval) => {
    if (!interval || interval === 0) return 'New';
    
    if (interval === 1) return '1 day';
    if (interval < 30) return `${interval} days`;
    if (interval < 60) return '1 month';
    
    const months = Math.floor(interval / 30);
    return `${months} months`;
  }, []);
  
  /**
   * Get the maturity level description
   * @param {string} maturityLevel - Maturity level from algorithm
   * @returns {Object} - Description and color for the maturity level
   */
  const getMaturityDescription = useCallback((maturityLevel) => {
    const levels = {
      New: {
        description: 'Just started learning this word',
        color: 'var(--highlight-level-1)'
      },
      Learning: {
        description: 'Currently learning this word',
        color: 'var(--highlight-level-2)'
      },
      Young: {
        description: 'Familiar with this word',
        color: 'var(--highlight-level-3)'
      },
      Mature: {
        description: 'Well-known word',
        color: 'var(--highlight-level-4)'
      },
      Retired: {
        description: 'Mastered this word',
        color: 'var(--highlight-level-5)'
      }
    };
    
    return levels[maturityLevel] || levels.New;
  }, []);
  
  /**
   * Calculate overall learning statistics for a list of words
   * @param {Array} words - List of vocabulary words
   * @returns {Object} - Overall statistics
   */
  const getOverallStats = useCallback((words) => {
    if (!words || words.length === 0) return null;
    
    // Get learning data for all words
    const allLearningData = quizService.getAllLearningData();
    
    // Merge words with learning data
    const wordsWithLearningData = words.map(word => ({
      ...word,
      learningData: allLearningData[word.id] || null
    }));
    
    // Calculate overall statistics
    return ankiAlgorithm.calculateOverallStats(wordsWithLearningData);
  }, []);
  
  /**
   * Calculate streak information from session history
   * @returns {Object} - Streak information
   */
  const getStreakInfo = useCallback(() => {
    const sessionHistory = quizService.getQuizSessionHistory();
    return statsCalculation.calculateStreaks(sessionHistory);
  }, []);
  
  /**
   * Generate review forecast for words
   * @param {Array} words - List of vocabulary words
   * @param {number} days - Number of days to forecast
   * @returns {Array} - Forecast data
   */
  const getReviewForecast = useCallback((words, days = 30) => {
    if (!words || words.length === 0) return Array(days).fill(0);
    
    // Get learning data for all words
    const allLearningData = quizService.getAllLearningData();
    
    // Merge words with learning data
    const wordsWithLearningData = words.map(word => ({
      ...word,
      learningData: allLearningData[word.id] || null
    }));
    
    // Generate forecast
    return ankiAlgorithm.generateReviewForecast(wordsWithLearningData, days);
  }, []);
  
  /**
   * Reset learning progress for a word
   * @param {string} wordId - ID of word to reset
   * @returns {boolean} - Success indicator
   */
  const resetWordProgress = useCallback((wordId) => {
    return quizService.resetLearningData([wordId]);
  }, []);
  
  /**
   * Get accuracy statistics from quiz sessions
   * @param {number} timeSpan - Number of days to include
   * @returns {Object} - Accuracy statistics
   */
  const getAccuracyStats = useCallback((timeSpan = 30) => {
    const sessionHistory = quizService.getQuizSessionHistory();
    return statsCalculation.calculateAccuracyStats(sessionHistory, timeSpan);
  }, []);
  
  /**
   * Get distribution of answer qualities
   * @param {number} timeSpan - Number of days to include
   * @returns {Object} - Quality distribution
   */
  const getQualityDistribution = useCallback((timeSpan = 30) => {
    const sessionHistory = quizService.getQuizSessionHistory();
    return statsCalculation.calculateQualityDistribution(sessionHistory, timeSpan);
  }, []);
  
  /**
   * Calculate time spent studying
   * @param {number} timeSpan - Number of days to include
   * @returns {Object} - Study time statistics
   */
  const getStudyTimeStats = useCallback((timeSpan = 30) => {
    const sessionHistory = quizService.getQuizSessionHistory();
    return statsCalculation.calculateStudyTime(sessionHistory, timeSpan);
  }, []);
  
  return {
    // Core ANKI functionality
    processAnswer: quizService.processQuizAnswer,
    getDueCards: quizService.getDueWords,
    
    // Statistics and utilities
    getWordStats,
    getOverallStats,
    getStreakInfo,
    getReviewForecast,
    getAccuracyStats,
    getQualityDistribution,
    getStudyTimeStats,
    
    // Formatting helpers
    formatInterval,
    getMaturityDescription,
    formatDate: statsCalculation.formatDate,
    formatDuration: statsCalculation.formatDuration,
    
    // Reset progress
    resetWordProgress,
    
    // Constants
    qualityRatings: ankiAlgorithm.QUALITY_RATINGS
  };
};

export default useSpacedRepetition;