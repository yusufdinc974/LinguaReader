import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useQuizSession from '../../hooks/useQuizSession';
import QuizCard from './QuizCard';
import DifficultyRating from './DifficultyRating';
import QuizControls from './QuizControls';

const QuizSession = () => {
  const quizSession = useQuizSession();
  
  const {
    isActive,
    currentCard,
    showAnswer,
    stats,
    progress,
    timeElapsed,
    formattedTime,
    getPrompt,
    getAnswer,
    getLearningStatus,
    answerCard,
    skipCard,
    toggleShowAnswer,
    finishQuizSession
  } = quizSession;
  
  if (!isActive || !currentCard) {
    return (
      <div className="quiz-empty-state">
        <div className="quiz-empty-icon">🔄</div>
        <h2 className="quiz-empty-title">
          No active quiz session
        </h2>
        <p className="quiz-empty-message">
          Select vocabulary lists and start a quiz to begin learning.
        </p>
      </div>
    );
  }
  
  return (
    <div className="quiz-session">
      {/* Quiz stats bar */}
      <div className="quiz-stats-bar">
        <div className="quiz-stats-group">
          <div className="quiz-stat quiz-stat-correct">
            <span>✓</span>
            Correct: {stats.correct}
          </div>
          
          <div className="quiz-stat quiz-stat-incorrect">
            <span>✗</span>
            Incorrect: {stats.incorrect}
          </div>
          
          <div className="quiz-stat quiz-stat-remaining">
            <span>◯</span>
            Remaining: {stats.total - stats.correct - stats.incorrect - stats.skipped}
          </div>
        </div>
        
        <div className="quiz-time">
          <span className="quiz-time-icon">⏱️</span>
          Time: {formattedTime()}
        </div>
      </div>
      
      {/* Card and controls wrapper - animates when cards change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="quiz-card-container"
        >
          {/* Card */}
          <QuizCard
            card={currentCard}
            prompt={getPrompt()}
            answer={getAnswer()}
            showAnswer={showAnswer}
            onShowAnswer={toggleShowAnswer}
            learningStatus={getLearningStatus()}
          />
          
          {/* Difficulty rating - show only when answer is displayed */}
          {showAnswer && (
            <DifficultyRating
              onRating={answerCard}
              disabled={!showAnswer}
            />
          )}
          
          {/* Navigation controls */}
          <QuizControls
            currentIndex={stats.correct + stats.incorrect + stats.skipped}
            totalCards={stats.total}
            onSkip={skipCard}
            onFinish={finishQuizSession}
            showAnswer={showAnswer}
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Cancel button */}
      <button
        onClick={finishQuizSession}
        className="quiz-cancel-button"
      >
        <span className="quiz-cancel-icon">✕</span>
        End Session
      </button>
    </div>
  );
};

export default QuizSession;