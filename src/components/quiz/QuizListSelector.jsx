import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../../contexts/QuizContext';
import { useVocabulary } from '../../contexts/VocabularyContext';
import useSpacedRepetition from '../../hooks/useSpacedRepetition';

const QuizListSelector = () => {
  const { selectedListIds, setSelectedListIds, getOverdueCount } = useQuiz();
  const { vocabularyLists, getWordsInList } = useVocabulary();
  const spacedRepetition = useSpacedRepetition();
  
  const toggleListSelection = (listId) => {
    setSelectedListIds(prev => {
      if (prev.includes(listId)) {
        return prev.filter(id => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };
  
  const selectAllLists = () => {
    setSelectedListIds(vocabularyLists.map(list => list.id));
  };
  
  const clearSelection = () => {
    setSelectedListIds([]);
  };
  
  return (
    <div className="quiz-list-selector">
      {/* Selection controls */}
      <div className="quiz-selection-controls">
        <button
          onClick={selectAllLists}
          className="quiz-select-all-btn"
        >
          Select All
        </button>
        
        <button
          onClick={clearSelection}
          disabled={selectedListIds.length === 0}
          className={`quiz-clear-btn ${selectedListIds.length === 0 ? 'disabled' : ''}`}
        >
          Clear
        </button>
      </div>
      
      {/* Lists container */}
      <div className="quiz-lists-container">
        {vocabularyLists.length > 0 ? (
          <div className="quiz-lists-wrapper">
            {vocabularyLists.map(list => {
              const isSelected = selectedListIds.includes(list.id);
              const words = getWordsInList(list.id);
              const overdueStats = getOverdueCount([list.id]);
              const learningStats = spacedRepetition.getOverallStats(words);
              
              return (
                <motion.div
                  key={list.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => toggleListSelection(list.id)}
                  className={`quiz-list-item ${isSelected ? 'selected' : ''}`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="quiz-list-check">✓</div>
                  )}
                  
                  {/* List details */}
                  <div className="quiz-list-details">
                    <div className="quiz-list-name">{list.name}</div>
                    
                    {list.description && (
                      <div className="quiz-list-description">{list.description}</div>
                    )}
                  </div>
                  
                  {/* Stats */}
                  <div className="quiz-list-stats">
                    <div className="quiz-list-stat">
                      <div className="quiz-list-stat-label">Words</div>
                      <div className="quiz-list-stat-value">{words.length}</div>
                    </div>
                    
                    <div className={`quiz-list-stat ${overdueStats.total > 0 ? 'overdue' : ''}`}>
                      <div className="quiz-list-stat-label">Due</div>
                      <div className="quiz-list-stat-value">{overdueStats.total}</div>
                    </div>
                    
                    <div className="quiz-list-stat">
                      <div className="quiz-list-stat-label">New</div>
                      <div className="quiz-list-stat-value">{learningStats?.newCards || 0}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="quiz-empty-lists">
            <div className="quiz-empty-icon">📚</div>
            <div className="quiz-empty-title">No vocabulary lists found</div>
            <div className="quiz-empty-message">Create lists in the Vocabulary Manager to get started</div>
          </div>
        )}
      </div>
      
      {/* Selection summary */}
      <div className="quiz-selection-summary">
        <div className="quiz-selection-count">
          Selected: <strong>{selectedListIds.length}</strong> of <strong>{vocabularyLists.length}</strong> lists
        </div>
        
        {selectedListIds.length > 0 && (
          <div className="quiz-selection-tags">
            {selectedListIds.map(id => {
              const list = vocabularyLists.find(l => l.id === id);
              return list ? (
                <div key={id} className="quiz-selection-tag">
                  {list.name}
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizListSelector;