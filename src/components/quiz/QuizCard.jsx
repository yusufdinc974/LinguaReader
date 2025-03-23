import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QuizCard = ({ 
  card, 
  prompt, 
  answer, 
  showAnswer, 
  onShowAnswer,
  learningStatus = {}
}) => {
  if (!card) return null;
  
  const { isNew, interval, reviews } = learningStatus || {};
  
  return (
    <div className="quiz-card-wrapper">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="quiz-card"
      >
        {/* Card metadata */}
        <div className="quiz-card-meta">
          <div>
            {isNew ? (
              <span className="quiz-new-badge">New Card</span>
            ) : (
              <span className="quiz-interval">
                <span className="quiz-interval-icon">🔄</span>
                Interval: {interval} {interval === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
          <div className="quiz-reviews">
            <span className="quiz-reviews-icon">📚</span>
            Reviews: {reviews}
          </div>
        </div>
        
        {/* Card source language */}
        <div className="quiz-language-bar">
          {card.sourceLanguageName} → {card.targetLanguageName}
        </div>
        
        {/* Prompt section */}
        <div className="quiz-prompt-section">
          <h2 className="quiz-prompt">
            {prompt}
          </h2>
          
          {!showAnswer && (
            <button
              onClick={onShowAnswer}
              className="quiz-show-answer-btn"
            >
              Show Answer
            </button>
          )}
        </div>
        
        {/* Answer section */}
        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="quiz-answer-section"
            >
              <h3 className="quiz-answer">
                {answer}
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default QuizCard;