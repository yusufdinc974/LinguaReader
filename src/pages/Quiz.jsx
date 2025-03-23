import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuiz } from '../contexts/QuizContext';
import { useVocabulary } from '../contexts/VocabularyContext';
import useQuizSession from '../hooks/useQuizSession';
import QuizListSelector from '../components/quiz/QuizListSelector';
import QuizModeSelector from '../components/quiz/QuizModeSelector';
import QuizSession from '../components/quiz/QuizSession';
import ProgressStats from '../components/quiz/ProgressStats';

const Quiz = () => {
  const { 
    selectedListIds, 
    isQuizActive, 
    dueWords, 
    sessionStats,
    isFinished 
  } = useQuiz();
  
  const { vocabularyLists } = useVocabulary();
  const quizSession = useQuizSession();
  
  // Local state
  const [showSetup, setShowSetup] = useState(true);
  const [showStats, setShowStats] = useState(false);
  
  // Effect to determine what to show based on quiz state
  useEffect(() => {
    if (isQuizActive) {
      setShowSetup(false);
      setShowStats(false);
    } else if (isFinished) {
      setShowSetup(false);
      setShowStats(true);
    } else {
      setShowSetup(true);
      setShowStats(false);
    }
  }, [isQuizActive, isFinished]);
  
  // Function to get selected list names
  const getSelectedListNames = () => {
    if (!selectedListIds || selectedListIds.length === 0) {
      return 'No lists selected';
    }
    
    const names = selectedListIds.map(id => {
      const list = vocabularyLists.find(l => l.id === id);
      return list ? list.name : 'Unknown list';
    });
    
    return names.join(', ');
  };
  
  return (
    <div className="page-container">
      {/* Page title */}
      <div className="page-header">
        <h1 className="page-title">
          Vocabulary Quiz
        </h1>
        
        {/* Status indicators */}
        {isQuizActive && (
          <div className="quiz-status">
            <span>Quizzing: <strong>{getSelectedListNames()}</strong></span>
            <span className="quiz-status-divider">•</span>
            <span>Time: <strong>{quizSession.formattedTime()}</strong></span>
          </div>
        )}
      </div>
      
      {/* Main content container */}
      <div className="page-content">
        <AnimatePresence mode="wait">
          {/* Quiz setup */}
          {showSetup && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="quiz-setup-container"
            >
              <div className="quiz-setup-grid">
                {/* List selection */}
                <div className="quiz-setup-panel">
                  <h2 className="quiz-panel-title">
                    Select Vocabulary Lists
                  </h2>
                  <QuizListSelector />
                </div>
                
                {/* Quiz mode selection and stats */}
                <div className="quiz-mode-panel">
                  {/* Quiz mode selection */}
                  <div className="quiz-setup-panel">
                    <h2 className="quiz-panel-title">
                      Quiz Mode
                    </h2>
                    <QuizModeSelector />
                  </div>
                  
                  {/* Overview stats */}
                  <div className="quiz-setup-panel">
                    <h2 className="quiz-panel-title">
                      Overview
                    </h2>
                    
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-card-label">
                          Due for Review
                        </div>
                        <div className="stat-card-value">
                          {dueWords.length}
                        </div>
                      </div>
                      
                      <div className="stat-card">
                        <div className="stat-card-label">
                          Selected Lists
                        </div>
                        <div className="stat-card-value">
                          {selectedListIds.length}
                        </div>
                      </div>
                    </div>
                    
                    {/* Start quiz button */}
                    <button 
                      onClick={quizSession.startQuiz}
                      disabled={dueWords.length === 0 || selectedListIds.length === 0}
                      className="start-quiz-btn"
                    >
                      {dueWords.length === 0 
                        ? 'No Words Due' 
                        : selectedListIds.length === 0
                          ? 'Select at least one list'
                          : `Start Quiz (${dueWords.length} words)`}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Active quiz session */}
          {isQuizActive && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <QuizSession />
            </motion.div>
          )}
          
          {/* Completion stats */}
          {showStats && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <ProgressStats 
                stats={sessionStats}
                onContinue={() => setShowSetup(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quiz;