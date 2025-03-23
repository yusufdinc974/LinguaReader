import React from 'react';
import { motion } from 'framer-motion';

const ProgressStats = ({ stats, onContinue }) => {
  // Calculate completion time
  const calculateCompletionTime = () => {
    if (!stats.startTime || !stats.endTime) return '00:00';
    
    const durationMs = new Date(stats.endTime) - new Date(stats.startTime);
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate accuracy percentage
  const calculateAccuracy = () => {
    if (stats.correct === 0 && stats.incorrect === 0) return 0;
    return Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100);
  };
  
  const accuracy = calculateAccuracy();
  
  // Get accuracy label and color
  const getAccuracyInfo = () => {
    if (accuracy >= 90) {
      return { label: 'Excellent', color: 'var(--success)' };
    } else if (accuracy >= 75) {
      return { label: 'Great', color: 'var(--highlight-level-3)' };
    } else if (accuracy >= 60) {
      return { label: 'Good', color: 'var(--highlight-level-2)' };
    } else {
      return { label: 'Needs Practice', color: 'var(--highlight-level-1)' };
    }
  };
  
  const accuracyInfo = getAccuracyInfo();
  
  return (
    <div className="progress-stats">
      {/* Header */}
      <div className="progress-stats-header">
        <h2 className="progress-stats-title">
          Session Complete!
        </h2>
        <p className="progress-stats-subtitle">
          You've completed your vocabulary quiz session
        </p>
      </div>
      
      {/* Stats summary */}
      <div className="progress-stats-content">
        {/* Accuracy circle */}
        <div className="accuracy-circle">
          <svg width="150" height="150" viewBox="0 0 150 150">
            {/* Background circle */}
            <circle
              cx="75"
              cy="75"
              r="65"
              fill="none"
              stroke="var(--background)"
              strokeWidth="12"
            />
            
            {/* Progress circle */}
            <motion.circle
              cx="75"
              cy="75"
              r="65"
              fill="none"
              stroke={accuracyInfo.color}
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDasharray: 408, strokeDashoffset: 408 }}
              animate={{ 
                strokeDashoffset: 408 - (408 * accuracy / 100) 
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
          </svg>
          
          {/* Percentage text */}
          <div className="accuracy-text">
            <div className="accuracy-percentage">
              {accuracy}%
            </div>
            <div className="accuracy-label">
              {accuracyInfo.label}
            </div>
          </div>
        </div>
        
        {/* Detailed stats */}
        <div className="stats-grid">
          {/* Total cards */}
          <div className="stat-box stat-box-total">
            <div className="stat-box-label">
              Total Cards
            </div>
            <div className="stat-box-value">
              {stats.total}
            </div>
          </div>
          
          {/* Correct */}
          <div className="stat-box stat-box-correct">
            <div className="stat-box-label">
              Correct
            </div>
            <div className="stat-box-value">
              {stats.correct}
            </div>
          </div>
          
          {/* Incorrect */}
          <div className="stat-box stat-box-incorrect">
            <div className="stat-box-label">
              Incorrect
            </div>
            <div className="stat-box-value">
              {stats.incorrect}
            </div>
          </div>
          
          {/* Time */}
          <div className="stat-box stat-box-time">
            <div className="stat-box-label">
              Time
            </div>
            <div className="stat-box-value">
              {calculateCompletionTime()}
            </div>
          </div>
        </div>
        
        {/* Motivation message */}
        <div className="motivation-message">
          {accuracy >= 90 ? (
            "Amazing work! Your vocabulary mastery is outstanding. Keep it up!"
          ) : accuracy >= 75 ? (
            "Great job! You're making excellent progress with your vocabulary."
          ) : accuracy >= 60 ? (
            "Good effort! Continue practicing these words to improve your recall."
          ) : (
            "Keep practicing! Consistent review will help these words stick in your memory."
          )}
        </div>
        
        {/* Continue button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onContinue}
          className="continue-btn"
        >
          Continue
        </motion.button>
      </div>
    </div>
  );
};

export default ProgressStats;