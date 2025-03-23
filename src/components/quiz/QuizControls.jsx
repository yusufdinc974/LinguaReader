import React from 'react';
import { motion } from 'framer-motion';

const QuizControls = ({ 
  currentIndex, 
  totalCards, 
  onSkip, 
  onFinish, 
  showAnswer,
  showSkip = true 
}) => {
  // Calculate progress percentage
  const progressPercentage = totalCards > 0 
    ? Math.round((currentIndex / totalCards) * 100) 
    : 0;
  
  return (
    <div className="quiz-controls">
      {/* Progress information */}
      <div className="quiz-progress">
        <span>Progress: {progressPercentage}%</span>
        <div className="quiz-progress-bar">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            className="quiz-progress-value"
          />
        </div>
        <span>Card {currentIndex + 1} of {totalCards}</span>
      </div>
      
      {/* Control buttons */}
      <div>
        {/* Skip button - only show if enabled and answer isn't showing */}
        {showSkip && !showAnswer && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSkip}
            className="quiz-control-btn quiz-skip-btn"
          >
            Skip
          </motion.button>
        )}
        
        {/* Finish button - shown when answer is displayed */}
        {showAnswer && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFinish}
            className="quiz-control-btn quiz-finish-btn"
          >
            Finish Session
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default QuizControls;