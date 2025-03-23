import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../contexts/QuizContext';

const QuizModeSelector = () => {
  const { quizMode, setQuizMode, quizStyle, setQuizStyle } = useQuiz();
  
  const directionOptions = [
    {
      id: 'wordToTranslation',
      title: 'Word → Translation',
      description: 'See the word and recall its translation',
      icon: '🔤'
    },
    {
      id: 'translationToWord',
      title: 'Translation → Word',
      description: 'See the translation and recall the word',
      icon: '🌍'
    }
  ];
  
  const styleOptions = [
    {
      id: 'flashcard',
      title: 'Flashcards',
      description: 'Simple flashcard style quiz',
      icon: '📇'
    },
    {
      id: 'multipleChoice',
      title: 'Multiple Choice',
      description: 'Select from multiple options',
      icon: '🔘',
      disabled: true,
      comingSoon: true
    },
    {
      id: 'typing',
      title: 'Typing',
      description: 'Type in your answer',
      icon: '⌨️',
      disabled: true,
      comingSoon: true
    }
  ];
  
  return (
    <div className="quiz-mode-selector">
      {/* Direction selection */}
      <div className="quiz-selector-section">
        <h3 className="quiz-selector-title">
          Quiz Direction
        </h3>
        
        <div className="quiz-direction-grid">
          {directionOptions.map(option => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setQuizMode(option.id)}
              className={`quiz-direction-option ${quizMode === option.id ? 'selected' : ''}`}
            >
              {/* Selection indicator */}
              {quizMode === option.id && (
                <div className="quiz-option-check">✓</div>
              )}
              
              <div className="quiz-option-content">
                <div className="quiz-option-icon">
                  {option.icon}
                </div>
                
                <div className="quiz-option-text">
                  <div className="quiz-option-title">
                    {option.title}
                  </div>
                  
                  <div className="quiz-option-description">
                    {option.description}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Quiz style selection */}
      <div className="quiz-selector-section">
        <h3 className="quiz-selector-title">
          Quiz Style
        </h3>
        
        <div className="quiz-style-grid">
          {styleOptions.map(option => (
            <motion.div
              key={option.id}
              whileHover={{ scale: option.disabled ? 1 : 1.02 }}
              whileTap={{ scale: option.disabled ? 1 : 0.98 }}
              onClick={() => !option.disabled && setQuizStyle(option.id)}
              className={`quiz-style-option ${quizStyle === option.id ? 'selected' : ''} ${option.disabled ? 'disabled' : ''}`}
            >
              {/* Selection indicator */}
              {quizStyle === option.id && (
                <div className="quiz-option-check">✓</div>
              )}
              
              {/* Coming soon badge */}
              {option.comingSoon && (
                <div className="quiz-coming-soon">
                  Soon
                </div>
              )}
              
              <div className="quiz-style-icon">
                {option.icon}
              </div>
              
              <div className="quiz-option-title">
                {option.title}
              </div>
              
              <div className="quiz-option-description">
                {option.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizModeSelector;