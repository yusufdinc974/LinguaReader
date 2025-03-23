import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../contexts/QuizContext';
import { useVocabulary } from '../contexts/VocabularyContext';
import useSpacedRepetition from '../hooks/useSpacedRepetition';
import ProgressChart from '../components/stats/ProgressChart';
import RetentionGraph from '../components/stats/RetentionGraph';
import StudyCalendar from '../components/stats/StudyCalendar';

/**
 * QuizStats - Page for detailed quiz and learning statistics
 */
const QuizStats = () => {
  // Get the context values including the persisted stats page settings
  const { 
    sessionHistory, 
    selectedListIds, 
    setSelectedListIds,
    statsPageSettings,
    updateStatsPageSettings
  } = useQuiz();
  
  const { vocabularyLists, getWordsInList } = useVocabulary();
  const spacedRepetition = useSpacedRepetition();
  
  // Local state that starts with values from the persisted settings
  const [activeTab, setActiveTab] = useState(statsPageSettings.activeTab || 'overview');
  const [timeRange, setTimeRange] = useState(statsPageSettings.timeRange || 30); // days
  const [selectedList, setSelectedList] = useState(statsPageSettings.selectedListId || null);
  const [listWords, setListWords] = useState([]);

  // Simplified stat state
  const [overallStats, setOverallStats] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [streakInfo, setStreakInfo] = useState(null);
  const [accuracyStats, setAccuracyStats] = useState(null);
  const [qualityDistribution, setQualityDistribution] = useState(null);
  const [studyTimeStats, setStudyTimeStats] = useState(null);
  
  // Track which tabs have had data loaded - initialize from persisted settings
  const [dataLoaded, setDataLoaded] = useState(
    statsPageSettings.dataLoaded || {
      overview: false,
      progress: false,
      forecast: false,
      history: false
    }
  );
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Update persisted settings whenever these states change
  useEffect(() => {
    updateStatsPageSettings({
      activeTab,
      timeRange,
      selectedListId: selectedList,
      dataLoaded
    });
  }, [activeTab, timeRange, selectedList, dataLoaded, updateStatsPageSettings]);
  
  // Manual stat calculation function - this will be called explicitly
  const calculateStats = useCallback(() => {
    // Don't recalculate if already loading
    if (isLoading) return;
    
    setIsLoading(true);
    
    // Use setTimeout to break the render cycle and prevent infinite loops
    setTimeout(() => {
      try {
        // Always calculate the overview stats for consistency
        setStreakInfo(spacedRepetition.getStreakInfo());
        setAccuracyStats(spacedRepetition.getAccuracyStats(timeRange));
        setQualityDistribution(spacedRepetition.getQualityDistribution(timeRange));
        setStudyTimeStats(spacedRepetition.getStudyTimeStats(timeRange));
        
        // Mark overview as loaded
        setDataLoaded(prev => ({
          ...prev,
          overview: true,
          history: true // History tab shares data with overview
        }));
        
        // If we have a selected list, calculate progress and forecast
        if (selectedList && listWords.length > 0) {
          setOverallStats(spacedRepetition.getOverallStats(listWords));
          setForecastData(spacedRepetition.getReviewForecast(listWords, 30));
          
          // Mark these tabs as loaded
          setDataLoaded(prev => ({
            ...prev,
            progress: true,
            forecast: true
          }));
        }
      } catch (error) {
        console.error("Error calculating stats:", error);
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }, [isLoading, timeRange, selectedList, listWords, spacedRepetition]);
  
  // Load words when list selection changes
  useEffect(() => {
    if (selectedList) {
      try {
        const words = getWordsInList(selectedList) || [];
        setListWords(words);
        
        // Reset progress and forecast loaded state when list changes
        setDataLoaded(prev => ({
          ...prev,
          progress: false,
          forecast: false
        }));
      } catch (error) {
        console.error("Error loading list words:", error);
        setListWords([]);
      }
    } else {
      setListWords([]);
    }
  }, [selectedList, getWordsInList]);
  
  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Auto-load data if the tab needs it and we haven't loaded it yet
    if (!dataLoaded[tab]) {
      calculateStats();
    }
  };
  
  // Calculate stats on first render, using the persisted tab and list
  useEffect(() => {
    // If we have a persisted list selection, we should calculate stats
    if ((activeTab === 'progress' || activeTab === 'forecast') && selectedList) {
      calculateStats();
    } 
    // Always load overview/history stats
    else if (activeTab === 'overview' || activeTab === 'history') {
      calculateStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle list selection
  const handleListChange = (e) => {
    const listId = e.target.value;
    setSelectedList(listId === '' ? null : listId);
    
    // Reset progress and forecast data when list changes
    setOverallStats(null);
    setForecastData([]);
    
    // Mark these tabs as needing refresh
    setDataLoaded(prev => ({
      ...prev,
      progress: false,
      forecast: false
    }));
  };
  
  // Handle time range change
  const handleTimeRangeChange = (e) => {
    const newRange = parseInt(e.target.value, 10);
    setTimeRange(newRange);
    
    // Reset time-dependent stats
    setAccuracyStats(null);
    setQualityDistribution(null);
    setStudyTimeStats(null);
    
    // Mark overview as needing refresh
    setDataLoaded(prev => ({
      ...prev,
      overview: false,
      history: false
    }));
    
    // If we're currently in overview or history tab, auto-refresh
    if (activeTab === 'overview' || activeTab === 'history') {
      calculateStats();
    }
  };
  
  // Get list name for display
  const getListName = (listId) => {
    const list = vocabularyLists.find(l => l.id === listId);
    return list ? list.name : 'Unknown list';
  };
  
  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">
          Quiz Statistics
        </h1>
        
        {/* Filters and controls */}
        <div className="stats-controls">
          <div className="stats-filter">
            <label htmlFor="list-select" className="stats-filter-label">
              List:
            </label>
            <select 
              id="list-select"
              value={selectedList || ''}
              onChange={handleListChange}
              className="stats-filter-select stats-list-select"
            >
              <option value="">All Vocabulary</option>
              {vocabularyLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="stats-filter">
            <label htmlFor="time-range" className="stats-filter-label">
              Time:
            </label>
            <select 
              id="time-range"
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="stats-filter-select"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 3 months</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          
          {/* Manual refresh button */}
          <button
            onClick={calculateStats}
            disabled={isLoading}
            className="refresh-btn"
          >
            {isLoading ? 'Calculating...' : 'Refresh Stats'}
            <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>⟳</span>
          </button>
        </div>
      </div>
      
      {/* Stats tabs */}
      <div className="stats-tabs">
        <button 
          onClick={() => handleTabChange('overview')}
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Overview
          {activeTab === 'overview' && (
            <motion.div 
              layoutId="tab-indicator"
              className="tab-indicator"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
        
        <button 
          onClick={() => handleTabChange('progress')}
          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
        >
          Progress
          {activeTab === 'progress' && (
            <motion.div 
              layoutId="tab-indicator"
              className="tab-indicator"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
        
        <button 
          onClick={() => handleTabChange('forecast')}
          className={`tab-button ${activeTab === 'forecast' ? 'active' : ''}`}
        >
          Forecast
          {activeTab === 'forecast' && (
            <motion.div 
              layoutId="tab-indicator"
              className="tab-indicator"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
        
        <button 
          onClick={() => handleTabChange('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          History
          {activeTab === 'history' && (
            <motion.div 
              layoutId="tab-indicator"
              className="tab-indicator"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </button>
      </div>
      
      {/* Loading indicator for the entire page */}
      {isLoading && (
        <div className="stats-loading-overlay">
          <div className="loading-icon">⟳</div>
          <div>Calculating stats...</div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="stats-content">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Quick stats */}
            <div className="quick-stats">
              {/* Current streak */}
              <div className="quick-stat quick-stat-streak">
                <div className="quick-stat-label">Current Streak</div>
                <div className="quick-stat-value">
                  {streakInfo?.currentStreak || 0} days
                </div>
              </div>
              
              {/* Accuracy */}
              <div className="quick-stat quick-stat-accuracy">
                <div className="quick-stat-label">Accuracy</div>
                <div className="quick-stat-value">
                  {accuracyStats?.averageAccuracy 
                    ? Math.round(accuracyStats.averageAccuracy) + '%' 
                    : '0%'}
                </div>
              </div>
              
              {/* Total cards studied */}
              <div className="quick-stat quick-stat-studied">
                <div className="quick-stat-label">Cards Studied</div>
                <div className="quick-stat-value">
                  {accuracyStats?.totalAnswers || 0}
                </div>
              </div>
              
              {/* Study time */}
              <div className="quick-stat quick-stat-time">
                <div className="quick-stat-label">Study Time</div>
                <div className="quick-stat-value">
                  {studyTimeStats?.totalTime 
                    ? spacedRepetition.formatDuration(studyTimeStats.totalTime)
                    : '0m'}
                </div>
              </div>
            </div>
            
            {/* Charts section */}
            <div className="charts-grid">
              {/* Accuracy Chart */}
              <div className="chart-container">
                <h3 className="chart-title">
                  Accuracy Over Time
                </h3>
                <div style={{ height: '220px' }}>
                  {accuracyStats ? (
                    <RetentionGraph 
                      data={accuracyStats.timeSeriesData || []} 
                      timeRange={timeRange}
                    />
                  ) : (
                    <div className="chart-placeholder">
                      Click "Refresh Stats" to see data
                    </div>
                  )}
                </div>
              </div>
              
              {/* Answer Distribution Chart */}
              <div className="chart-container">
                <h3 className="chart-title">
                  Answer Distribution
                </h3>
                <div style={{ height: '220px' }}>
                  {qualityDistribution ? (
                    <ProgressChart 
                      data={qualityDistribution.distribution || { 1: 0, 2: 0, 3: 0, 4: 0 }}
                      total={qualityDistribution.total || 0}
                    />
                  ) : (
                    <div className="chart-placeholder">
                      Click "Refresh Stats" to see data
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Study Calendar */}
            <div className="chart-container">
              <h3 className="chart-title">
                Study Activity
              </h3>
              <StudyCalendar 
                sessionHistory={sessionHistory || []}
                timeRange={timeRange}
              />
            </div>
          </div>
        )}
        
        {/* Progress tab */}
        {activeTab === 'progress' && (
          <div>
            {selectedList ? (
              <div>
                <h2 className="quiz-panel-title">
                  Learning Progress: {getListName(selectedList)}
                </h2>
                
                {!overallStats && !dataLoaded.progress ? (
                  <div className="empty-state">
                    <button
                      onClick={calculateStats}
                      disabled={isLoading}
                      className="action-btn"
                    >
                      {isLoading ? 'Loading...' : 'Load Progress Stats'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Progress stats */}
                    <div className="learning-stats">
                      {/* Total words */}
                      <div className="learning-stat learning-stat-total">
                        <div className="stat-card-label">
                          Total Words
                        </div>
                        <div className="stat-card-value">
                          {overallStats?.totalCards || 0}
                        </div>
                      </div>
                      
                      {/* New cards */}
                      <div className="learning-stat learning-stat-new">
                        <div className="stat-card-label">
                          New
                        </div>
                        <div className="stat-card-value">
                          {overallStats?.newCards || 0}
                        </div>
                      </div>
                      
                      {/* Learning cards */}
                      <div className="learning-stat learning-stat-learning">
                        <div className="stat-card-label">
                          Learning
                        </div>
                        <div className="stat-card-value">
                          {overallStats?.learningCards || 0}
                        </div>
                      </div>
                      
                      {/* Young cards */}
                      <div className="learning-stat learning-stat-young">
                        <div className="stat-card-label">
                          Young
                        </div>
                        <div className="stat-card-value">
                          {overallStats?.youngCards || 0}
                        </div>
                      </div>
                      
                      {/* Mature cards */}
                      <div className="learning-stat learning-stat-mature">
                        <div className="stat-card-label">
                          Mature
                        </div>
                        <div className="stat-card-value">
                          {(overallStats?.matureCards || 0) + (overallStats?.retiredCards || 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Word list with progress */}
                    <div className="word-progress-container">
                      <h3 className="word-progress-title">
                        Words Progress
                      </h3>
                      
                      {listWords.length > 0 ? (
                        <div className="word-progress-grid">
                          {listWords.map(word => {
                            const stats = spacedRepetition.getWordStats(word);
                            const maturity = stats?.maturityLevel || 'New';
                            const maturityInfo = spacedRepetition.getMaturityDescription(maturity);
                            
                            return (
                              <div key={word.id} className="word-progress-card">
                                <div className="word-progress-header">
                                  <div>
                                    <div className="word-term">
                                      {word.word}
                                    </div>
                                    <div className="word-translation">
                                      {word.translation || 'No translation'}
                                    </div>
                                  </div>
                                  
                                  <div className="maturity-badge" style={{
                                    backgroundColor: maturityInfo.color,
                                    color: ['New', 'Learning'].includes(maturity) ? 'var(--text-primary)' : 'white'
                                  }}>
                                    {maturity}
                                  </div>
                                </div>
                                
                                <div className="word-progress-stats">
                                  <div>Reviews: {stats?.totalReviews || 0}</div>
                                  <div>Success: {stats?.correctRate ? Math.round(stats.correctRate) + '%' : '0%'}</div>
                                  <div>Interval: {spacedRepetition.formatInterval(stats?.averageInterval || 0)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="empty-state">
                          No words in this list yet.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h2 className="empty-state-title">
                  Select a List to View Progress
                </h2>
                <p className="empty-state-message">
                  Choose a vocabulary list from the dropdown menu above to see detailed progress statistics for those words.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Forecast tab */}
        {activeTab === 'forecast' && (
          <div>
            {selectedList ? (
              <div>
                <h2 className="quiz-panel-title">
                  Review Forecast: {getListName(selectedList)}
                </h2>
                
                {!forecastData || forecastData.length === 0 || !dataLoaded.forecast ? (
                  <div className="empty-state">
                    <button
                      onClick={calculateStats}
                      disabled={isLoading}
                      className="action-btn"
                    >
                      {isLoading ? 'Loading...' : 'Load Forecast Data'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Calendar view of upcoming reviews */}
                    <div className="forecast-container">
                      <h3 className="forecast-title">
                        Upcoming Reviews (30 days)
                      </h3>
                      
                      <div className="forecast-grid">
                        {forecastData.map((count, index) => {
                          const date = new Date();
                          date.setDate(date.getDate() + index);
                          const isToday = index === 0;
                          
                          // Determine color based on count
                          let bgColor = 'white';
                          let textColor = 'var(--text-primary)';
                          let borderStyle = isToday ? '2px solid var(--primary-color)' : '1px solid var(--border)';
                          
                          if (count > 0) {
                            if (count < 5) {
                              bgColor = 'var(--highlight-level-1-light)';
                              textColor = 'var(--highlight-level-1)';
                            } else if (count < 10) {
                              bgColor = 'var(--highlight-level-2-light)';
                              textColor = 'var(--highlight-level-2)';
                            } else if (count < 20) {
                              bgColor = 'var(--highlight-level-3-light)';
                              textColor = 'var(--highlight-level-3)';
                            } else {
                              bgColor = 'var(--highlight-level-4-light)';
                              textColor = 'var(--highlight-level-4)';
                            }
                          }
                          
                          if (isToday) {
                            bgColor = 'var(--primary-light)';
                            textColor = 'var(--primary-color)';
                          }
                          
                          return (
                            <div key={index} className="forecast-day" style={{
                              backgroundColor: bgColor,
                              color: textColor,
                              border: borderStyle
                            }}>
                              <div className="forecast-day-date">
                                {date.getDate()}
                              </div>
                              <div className="forecast-day-count">
                                {count}
                              </div>
                              {isToday && (
                                <div className="forecast-day-today">
                                  Today
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Start quiz button */}
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                      <button 
                        onClick={() => {
                          setSelectedListIds([selectedList]);
                          window.location.href = '/#/quiz';
                        }}
                        className="action-btn"
                      >
                        Start Quiz with This List
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h2 className="empty-state-title">
                  Select a List to View Forecast
                </h2>
                <p className="empty-state-message">
                  Choose a vocabulary list from the dropdown menu above to see a forecast of upcoming reviews.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* History tab */}
        {activeTab === 'history' && (
          <div>
            <h2 className="quiz-panel-title">
              Quiz Session History
            </h2>
            
            {sessionHistory && sessionHistory.length > 0 ? (
              <div className="history-container">
                {sessionHistory.map(session => {
                  const startDate = new Date(session.date);
                  const endDate = session.endTime ? new Date(session.endTime) : null;
                  const duration = session.duration || 0;
                  
                  // Calculate stats
                  const totalAnswers = session.answers ? session.answers.length : 0;
                  const correctAnswers = session.answers 
                    ? session.answers.filter(a => a.correct).length 
                    : 0;
                  const accuracy = totalAnswers > 0 
                    ? Math.round((correctAnswers / totalAnswers) * 100) 
                    : 0;
                  
                  // Get class based on accuracy
                  let accuracyClass = '';
                  if (accuracy >= 80) {
                    accuracyClass = 'quick-stat-accuracy';
                  } else if (accuracy >= 60) {
                    accuracyClass = 'quick-stat-studied';
                  } else {
                    accuracyClass = 'learning-stat-new';
                  }
                  
                  // Get list names
                  const listNames = session.listIds
                    ? session.listIds.map(id => getListName(id)).join(', ')
                    : 'Unknown lists';
                  
                  return (
                    <div key={session.id} className="history-session">
                      <div className="session-header">
                        <div>
                          <div className="session-title">
                            Session on {spacedRepetition.formatDate(startDate, 'long')}
                          </div>
                          <div className="session-lists">
                            {listNames}
                          </div>
                        </div>
                        
                        <div className="session-duration">
                          {spacedRepetition.formatDuration(duration)}
                        </div>
                      </div>
                      
                      <div className="session-stats">
                        <div className="session-stat">
                          <div className="session-stat-label">
                            Cards
                          </div>
                          <div className="session-stat-value">
                            {totalAnswers}
                          </div>
                        </div>
                        
                        <div className="session-stat">
                          <div className="session-stat-label">
                            Correct
                          </div>
                          <div className="session-stat-value">
                            {correctAnswers}
                          </div>
                        </div>
                        
                        <div className={`session-stat ${accuracyClass}`}>
                          <div className="session-stat-label">
                            Accuracy
                          </div>
                          <div className="session-stat-value">
                            {accuracy}%
                          </div>
                        </div>
                        
                        <div className="session-stat">
                          <div className="session-stat-label">
                            Mode
                          </div>
                          <div className="session-stat-value" style={{ fontSize: '0.9rem' }}>
                            {session.mode === 'wordToTranslation' 
                              ? 'Word → Translation' 
                              : 'Translation → Word'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h2 className="empty-state-title">
                  No Quiz Sessions Yet
                </h2>
                <p className="empty-state-message">
                  Start a quiz to begin tracking your progress and building your learning history.
                </p>
                
                <button 
                  onClick={() => window.location.href = '/#/quiz'}
                  className="action-btn"
                >
                  Go to Quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizStats;