import React from 'react';
import { motion } from 'framer-motion';
import ankiAlgorithm from '../../utils/ankiAlgorithm';

const DifficultyRating = ({ onRating, disabled = false }) => {
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };
  
  const ratings = [
    { 
      value: ankiAlgorithm.QUALITY_RATINGS.AGAIN, 
      label: 'Again',
      className: 'difficulty-btn-again',
      description: 'Completely forgot'
    },
    { 
      value: ankiAlgorithm.QUALITY_RATINGS.HARD, 
      label: 'Hard',
      className: 'difficulty-btn-hard',
      description: 'Difficult to remember'
    },
    { 
      value: ankiAlgorithm.QUALITY_RATINGS.GOOD, 
      label: 'Good',
      className: 'difficulty-btn-good',
      description: 'Correct with effort'
    },
    { 
      value: ankiAlgorithm.QUALITY_RATINGS.EASY, 
      label: 'Easy',
      className: 'difficulty-btn-easy',
      description: 'Perfect recall'
    }
  ];
  
  return (
    <div className="difficulty-rating-container">
      <h3 className="difficulty-rating-title">
        How well did you know this word?
      </h3>
      
      <div className="difficulty-rating-grid">
        {ratings.map(rating => (
          <motion.button
            key={rating.value}
            onClick={() => onRating(rating.value)}
            disabled={disabled}
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            className={`difficulty-btn ${rating.className}`}
          >
            <span className="difficulty-btn-label">{rating.label}</span>
            <span className="difficulty-btn-description">{rating.description}</span>
          </motion.button>
        ))}
      </div>
      
      <div className="difficulty-rating-help">
        Select how difficult this card was for you
      </div>
    </div>
  );
};

export default DifficultyRating;