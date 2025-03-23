import { useState, useEffect, useCallback } from 'react';
import { useQuiz } from '../contexts/QuizContext';
import ankiAlgorithm from '../utils/ankiAlgorithm';

/**
 * Custom hook for managing a quiz session
 * @returns {Object} - Session management functions and state
 */
const useQuizSession = () => {
  const {
    selectedListIds,
    quizMode,
    isQuizActive,
    dueWords,
    currentCard,
    currentWordIndex,
    showAnswer,
    sessionStats,
    startQuiz,
    finishQuizSession,
    cancelQuiz,
    answerCard,
    skipCard,
    toggleShowAnswer
  } = useQuiz();
  
  // Local state for progress tracking
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Effect to update progress
  useEffect(() => {
    if (isQuizActive && dueWords.length > 0) {
      setProgress((currentWordIndex / dueWords.length) * 100);
    } else {
      setProgress(0);
    }
  }, [isQuizActive, currentWordIndex, dueWords]);
  
  // Effect to update time elapsed
  useEffect(() => {
    let intervalId;
    
    if (isQuizActive && sessionStats.startTime) {
      intervalId = setInterval(() => {
        const elapsed = Math.floor((new Date() - sessionStats.startTime) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isQuizActive, sessionStats.startTime]);
  
  // Effect to check if session is finished
  useEffect(() => {
    if (isQuizActive && dueWords.length > 0 && currentWordIndex >= dueWords.length) {
      setIsFinished(true);
    } else {
      setIsFinished(false);
    }
  }, [isQuizActive, currentWordIndex, dueWords]);
  
  /**
   * Format the elapsed time
   * @returns {string} - Formatted time (mm:ss)
   */
  const formattedTime = useCallback(() => {
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeElapsed]);
  
  /**
   * Get the prompt based on quiz mode
   * @returns {string} - The prompt to display
   */
  const getPrompt = useCallback(() => {
    if (!currentCard) return '';
    
    if (quizMode === 'wordToTranslation') {
      return currentCard.word;
    } else {
      return currentCard.translation || '';
    }
  }, [currentCard, quizMode]);
  
  /**
   * Get the answer based on quiz mode
   * @returns {string} - The answer to display
   */
  const getAnswer = useCallback(() => {
    if (!currentCard) return '';
    
    if (quizMode === 'wordToTranslation') {
      return currentCard.translation || '';
    } else {
      return currentCard.word;
    }
  }, [currentCard, quizMode]);
  
  /**
   * Handle answering with a specific quality rating
   * @param {number} qualityRating - Quality rating (1-4)
   */
  const handleAnswer = useCallback((qualityRating) => {
    answerCard(qualityRating);
  }, [answerCard]);
  
  /**
   * Get the card's learning status details
   * @returns {Object} - Learning status information
   */
  const getLearningStatus = useCallback(() => {
    if (!currentCard || !currentCard.learningData) {
      return {
        isNew: true,
        interval: 0,
        reviews: 0,
        nextReview: null,
        easeFactor: ankiAlgorithm.INITIAL_EASE_FACTOR
      };
    }
    
    const { interval, reviewHistory, nextReviewDate, easeFactor } = currentCard.learningData;
    
    return {
      isNew: !interval || interval === 0,
      interval: interval || 0,
      reviews: reviewHistory ? reviewHistory.length : 0,
      nextReview: nextReviewDate ? new Date(nextReviewDate) : null,
      easeFactor: easeFactor || ankiAlgorithm.INITIAL_EASE_FACTOR
    };
  }, [currentCard]);
  
  return {
    // State from QuizContext
    isActive: isQuizActive,
    currentCard,
    showAnswer,
    stats: sessionStats,
    
    // Local state
    progress,
    timeElapsed,
    formattedTime,
    isFinished,
    
    // Helpers
    getPrompt,
    getAnswer,
    getLearningStatus,
    
    // Actions
    startQuiz,
    finishQuizSession,
    cancelQuiz,
    answerCard: handleAnswer,
    skipCard,
    toggleShowAnswer,
    
    // ANKI quality ratings
    qualityRatings: ankiAlgorithm.QUALITY_RATINGS
  };
};

export default useQuizSession;