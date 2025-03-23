/**
 * statsCalculation.js
 * Utilities for calculating and formatting quiz and learning statistics
 */

import ankiAlgorithm from './ankiAlgorithm';

/**
 * Calculate streak information for quiz sessions
 * 
 * @param {Array} sessionHistory - Array of quiz session records
 * @returns {Object} - Streak information
 */
export const calculateStreaks = (sessionHistory) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null
    };
  }
  
  // Sort sessions by date
  const sortedSessions = [...sessionHistory].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  
  // Get the most recent study date
  const lastStudyDate = new Date(sortedSessions[0].date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Initialize streak counters
  let currentStreak = 0;
  let longestStreak = 0;
  let currentStreakCount = 0;
  let dateToCheck = today;
  
  // Check if the user studied today
  const studiedToday = sortedSessions.some(session => {
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === today.getTime();
  });
  
  if (studiedToday) {
    currentStreakCount = 1;
    dateToCheck = yesterday;
  }
  
  // Create a map of study dates for faster lookups
  const studyDates = new Map();
  sortedSessions.forEach(session => {
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    studyDates.set(date.getTime(), true);
  });
  
  // Calculate the current streak
  while (studyDates.has(dateToCheck.getTime())) {
    currentStreakCount++;
    dateToCheck.setDate(dateToCheck.getDate() - 1);
  }
  
  currentStreak = currentStreakCount;
  
  // Calculate the longest streak
  let tempStreak = 0;
  let previousDate = null;
  
  // Sort all sessions by date (ascending)
  const chronologicalSessions = [...sessionHistory].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  
  // Group by date (only count one session per day)
  const uniqueDates = new Set();
  chronologicalSessions.forEach(session => {
    const date = new Date(session.date);
    date.setHours(0, 0, 0, 0);
    uniqueDates.add(date.getTime());
  });
  
  // Convert to array and sort
  const sortedDates = Array.from(uniqueDates).sort();
  
  // Calculate longest streak
  sortedDates.forEach(timestamp => {
    const date = new Date(timestamp);
    
    if (!previousDate) {
      tempStreak = 1;
    } else {
      const expectedPrevious = new Date(date);
      expectedPrevious.setDate(expectedPrevious.getDate() - 1);
      
      if (expectedPrevious.getTime() === previousDate.getTime()) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    
    previousDate = date;
  });
  
  return {
    currentStreak,
    longestStreak,
    lastStudyDate
  };
};

/**
 * Calculate accuracy statistics from quiz sessions
 * 
 * @param {Array} sessionHistory - Array of quiz session records
 * @param {number} timeSpan - Number of days to include
 * @returns {Object} - Accuracy statistics
 */
export const calculateAccuracyStats = (sessionHistory, timeSpan = 30) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return {
      averageAccuracy: 0,
      totalCorrect: 0,
      totalAnswers: 0,
      timeSeriesData: []
    };
  }
  
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeSpan);
  
  // Filter sessions within the time span
  const recentSessions = sessionHistory.filter(session => 
    new Date(session.date) >= cutoffDate
  );
  
  // If no recent sessions, return zeros
  if (recentSessions.length === 0) {
    return {
      averageAccuracy: 0,
      totalCorrect: 0,
      totalAnswers: 0,
      timeSeriesData: []
    };
  }
  
  // Initialize counters
  let totalCorrect = 0;
  let totalAnswers = 0;
  
  // Group sessions by date for time series data
  const sessionsByDate = {};
  
  recentSessions.forEach(session => {
    // Count correct answers (quality 3 or 4)
    session.answers.forEach(answer => {
      totalAnswers++;
      if (answer.qualityRating >= 3) {
        totalCorrect++;
      }
    });
    
    // Add to date grouping for time series
    const dateStr = new Date(session.date).toISOString().split('T')[0];
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = {
        correct: 0,
        total: 0
      };
    }
    
    session.answers.forEach(answer => {
      sessionsByDate[dateStr].total++;
      if (answer.qualityRating >= 3) {
        sessionsByDate[dateStr].correct++;
      }
    });
  });
  
  // Calculate average accuracy
  const averageAccuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;
  
  // Create time series data
  const timeSeriesData = Object.keys(sessionsByDate).map(date => ({
    date,
    accuracy: sessionsByDate[date].total > 0 
      ? (sessionsByDate[date].correct / sessionsByDate[date].total) * 100 
      : 0,
    correct: sessionsByDate[date].correct,
    total: sessionsByDate[date].total
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    averageAccuracy,
    totalCorrect,
    totalAnswers,
    timeSeriesData
  };
};

/**
 * Calculate distribution of answer qualities
 * 
 * @param {Array} sessionHistory - Array of quiz session records
 * @param {number} timeSpan - Number of days to include
 * @returns {Object} - Distribution by answer quality
 */
export const calculateQualityDistribution = (sessionHistory, timeSpan = 30) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return {
      distribution: {
        1: 0, // Again
        2: 0, // Hard
        3: 0, // Good
        4: 0  // Easy
      },
      total: 0
    };
  }
  
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeSpan);
  
  // Filter sessions within the time span
  const recentSessions = sessionHistory.filter(session => 
    new Date(session.date) >= cutoffDate
  );
  
  // Initialize distribution
  const distribution = {
    1: 0, // Again
    2: 0, // Hard
    3: 0, // Good
    4: 0  // Easy
  };
  
  let total = 0;
  
  // Count answers by quality
  recentSessions.forEach(session => {
    session.answers.forEach(answer => {
      distribution[answer.qualityRating] = (distribution[answer.qualityRating] || 0) + 1;
      total++;
    });
  });
  
  return {
    distribution,
    total
  };
};

/**
 * Calculate learning progress metrics
 * 
 * @param {Array} words - Array of vocabulary words with learning data
 * @returns {Object} - Learning progress statistics
 */
export const calculateLearningProgress = (words) => {
  return ankiAlgorithm.calculateOverallStats(words);
};

/**
 * Calculate time spent studying
 * 
 * @param {Array} sessionHistory - Array of quiz session records
 * @param {number} timeSpan - Number of days to include
 * @returns {Object} - Study time statistics
 */
export const calculateStudyTime = (sessionHistory, timeSpan = 30) => {
  if (!sessionHistory || sessionHistory.length === 0) {
    return {
      totalTime: 0,
      averageSessionTime: 0,
      sessionsCount: 0,
      timeByDate: []
    };
  }
  
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeSpan);
  
  // Filter sessions within the time span
  const recentSessions = sessionHistory.filter(session => 
    new Date(session.date) >= cutoffDate
  );
  
  if (recentSessions.length === 0) {
    return {
      totalTime: 0,
      averageSessionTime: 0,
      sessionsCount: 0,
      timeByDate: []
    };
  }
  
  // Group sessions by date
  const sessionsByDate = {};
  
  let totalTime = 0;
  
  recentSessions.forEach(session => {
    const sessionTime = session.duration || 0;
    totalTime += sessionTime;
    
    // Add to date grouping
    const dateStr = new Date(session.date).toISOString().split('T')[0];
    if (!sessionsByDate[dateStr]) {
      sessionsByDate[dateStr] = 0;
    }
    
    sessionsByDate[dateStr] += sessionTime;
  });
  
  // Calculate average session time
  const averageSessionTime = recentSessions.length > 0 
    ? totalTime / recentSessions.length 
    : 0;
  
  // Create time by date series
  const timeByDate = Object.keys(sessionsByDate).map(date => ({
    date,
    minutes: sessionsByDate[date] / 60 // Convert seconds to minutes
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalTime,
    averageSessionTime,
    sessionsCount: recentSessions.length,
    timeByDate
  };
};

/**
 * Format a duration in seconds to a human-readable string
 * 
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (e.g. "1h 30m" or "45m")
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format a date for display
 * 
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style ('short', 'long', or 'relative')
 * @returns {string} - Formatted date
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'relative') {
    const now = new Date();
    const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  }
  
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // Default to short format
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default {
  calculateStreaks,
  calculateAccuracyStats,
  calculateQualityDistribution,
  calculateLearningProgress,
  calculateStudyTime,
  formatDuration,
  formatDate
};