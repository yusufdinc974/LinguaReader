/**
 * ankiAlgorithm.js
 * Implementation of the SuperMemo SM-2 algorithm for spaced repetition
 * Adapted for vocabulary learning with quality ratings: Again(1), Hard(2), Good(3), Easy(4)
 */

// Default initial ease factor (2.5 is standard in SM-2)
const INITIAL_EASE_FACTOR = 2.5;

// Default intervals for new cards (in days)
const INITIAL_INTERVALS = {
  AGAIN: 0, // Same day
  HARD: 1,  // Next day
  GOOD: 3,  // 3 days later
  EASY: 7   // 7 days later
};

// Minimum ease factor to prevent cards from getting too difficult
const MINIMUM_EASE_FACTOR = 1.3;

// Ease factor adjustments based on answer quality
const EASE_ADJUSTMENTS = {
  AGAIN: -0.20, // Significant decrease
  HARD: -0.15,  // Moderate decrease
  GOOD: 0,      // No change
  EASY: 0.15    // Moderate increase
};

// Maps quality rating labels to their numeric values
const QUALITY_RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
};

/**
 * Calculate the next review interval for a card based on SM-2 algorithm
 * 
 * @param {Object} card - The vocabulary card with learning data
 * @param {number} qualityRating - The quality rating from 1-4 (Again, Hard, Good, Easy)
 * @returns {Object} - Updated learning data with new interval, ease factor, etc.
 */
export const calculateNextReviewInterval = (card, qualityRating) => {
  // Initialize learning data if this is the first review
  const learningData = card.learningData || {
    interval: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    consecutiveCorrect: 0,
    lapses: 0,
    reviewHistory: []
  };

  // Clone the learning data to avoid modifying the original
  const updatedLearningData = { ...learningData };
  
  // Record the review in history
  const reviewRecord = {
    date: new Date().toISOString(),
    qualityRating,
    interval: learningData.interval
  };
  
  // Add to review history
  updatedLearningData.reviewHistory = [
    ...(updatedLearningData.reviewHistory || []), 
    reviewRecord
  ];

  // If the card was rated "Again" (1), reset progress and count as a lapse
  if (qualityRating === QUALITY_RATINGS.AGAIN) {
    updatedLearningData.interval = INITIAL_INTERVALS.AGAIN;
    updatedLearningData.consecutiveCorrect = 0;
    updatedLearningData.lapses += 1;
  }
  // Otherwise, calculate the next interval based on quality rating
  else {
    // For a new card or a card after lapse
    if (updatedLearningData.interval === 0) {
      switch (qualityRating) {
        case QUALITY_RATINGS.HARD:
          updatedLearningData.interval = INITIAL_INTERVALS.HARD;
          break;
        case QUALITY_RATINGS.GOOD:
          updatedLearningData.interval = INITIAL_INTERVALS.GOOD;
          break;
        case QUALITY_RATINGS.EASY:
          updatedLearningData.interval = INITIAL_INTERVALS.EASY;
          break;
      }
      updatedLearningData.consecutiveCorrect = 1;
    }
    // For cards with an existing interval
    else {
      let intervalMultiplier;
      
      switch (qualityRating) {
        case QUALITY_RATINGS.HARD:
          // Hard: Use 1.2 as the multiplier (slower growth)
          intervalMultiplier = 1.2;
          break;
        case QUALITY_RATINGS.GOOD:
          // Good: Use the current ease factor
          intervalMultiplier = updatedLearningData.easeFactor;
          break;
        case QUALITY_RATINGS.EASY:
          // Easy: Use ease factor plus a bonus
          intervalMultiplier = updatedLearningData.easeFactor * 1.3;
          break;
      }
      
      // Calculate the new interval
      updatedLearningData.interval = Math.round(updatedLearningData.interval * intervalMultiplier);
      updatedLearningData.consecutiveCorrect += 1;
    }
  }

  // Update the ease factor based on the quality rating
  let easeAdjustment = 0;
  
  switch (qualityRating) {
    case QUALITY_RATINGS.AGAIN:
      easeAdjustment = EASE_ADJUSTMENTS.AGAIN;
      break;
    case QUALITY_RATINGS.HARD:
      easeAdjustment = EASE_ADJUSTMENTS.HARD;
      break;
    case QUALITY_RATINGS.GOOD:
      easeAdjustment = EASE_ADJUSTMENTS.GOOD;
      break;
    case QUALITY_RATINGS.EASY:
      easeAdjustment = EASE_ADJUSTMENTS.EASY;
      break;
  }
  
  // Apply the ease adjustment
  updatedLearningData.easeFactor += easeAdjustment;
  
  // Ensure ease factor doesn't go below minimum
  if (updatedLearningData.easeFactor < MINIMUM_EASE_FACTOR) {
    updatedLearningData.easeFactor = MINIMUM_EASE_FACTOR;
  }

  // Calculate the next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + updatedLearningData.interval);
  updatedLearningData.nextReviewDate = nextReviewDate.toISOString();

  return updatedLearningData;
};

/**
 * Determine if a card is due for review based on its next review date
 * 
 * @param {Object} card - The vocabulary card with learning data
 * @returns {boolean} - True if the card is due for review
 */
export const isCardDue = (card) => {
  if (!card.learningData || !card.learningData.nextReviewDate) {
    // Cards without learning data are always due (new cards)
    return true;
  }
  
  const nextReviewDate = new Date(card.learningData.nextReviewDate);
  const currentDate = new Date();
  
  // Card is due if next review date is today or earlier
  return nextReviewDate <= currentDate;
};

/**
 * Get all due cards from a list of vocabulary words
 * 
 * @param {Array} words - Array of vocabulary words with learning data
 * @param {number} limit - Maximum number of cards to return
 * @returns {Array} - Array of due cards, sorted by priority
 */
export const getDueCards = (words, limit = Infinity) => {
  // Filter to only include due cards
  const dueCards = words.filter(isCardDue);
  
  // Sort cards by priority:
  // 1. New cards (no learning data)
  // 2. Cards that were previously rated "Again" (lapsed cards)
  // 3. Cards with earliest due date
  const sortedCards = dueCards.sort((a, b) => {
    // New cards come first
    const aIsNew = !a.learningData || !a.learningData.nextReviewDate;
    const bIsNew = !b.learningData || !b.learningData.nextReviewDate;
    
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    if (aIsNew && bIsNew) return 0;
    
    // Lapsed cards come next
    const aIsLapsed = a.learningData.lapses > 0 && a.learningData.consecutiveCorrect === 0;
    const bIsLapsed = b.learningData.lapses > 0 && b.learningData.consecutiveCorrect === 0;
    
    if (aIsLapsed && !bIsLapsed) return -1;
    if (!aIsLapsed && bIsLapsed) return 1;
    
    // Sort by next review date
    return new Date(a.learningData.nextReviewDate) - new Date(b.learningData.nextReviewDate);
  });
  
  // Return up to the limit
  return sortedCards.slice(0, limit);
};

/**
 * Calculate statistics about a card's learning progress
 * 
 * @param {Object} card - The vocabulary card with learning data
 * @returns {Object} - Statistics about the card's learning progress
 */
export const calculateCardStats = (card) => {
  if (!card.learningData || !card.learningData.reviewHistory) {
    return {
      totalReviews: 0,
      correctRate: 0,
      averageInterval: 0,
      maturityLevel: 'New'
    };
  }
  
  const { reviewHistory, interval, lapses } = card.learningData;
  
  // Calculate total reviews
  const totalReviews = reviewHistory.length;
  
  // Calculate percentage of correct responses (not "Again")
  const correctResponses = reviewHistory.filter(
    review => review.qualityRating !== QUALITY_RATINGS.AGAIN
  ).length;
  const correctRate = totalReviews > 0 ? (correctResponses / totalReviews) * 100 : 0;
  
  // Calculate average interval
  const totalInterval = reviewHistory.reduce((sum, review) => sum + review.interval, 0);
  const averageInterval = totalReviews > 0 ? totalInterval / totalReviews : 0;
  
  // Determine maturity level based on current interval
  let maturityLevel;
  if (!interval || interval === 0) {
    maturityLevel = 'New';
  } else if (interval < 7) {
    maturityLevel = 'Learning';
  } else if (interval < 30) {
    maturityLevel = 'Young';
  } else if (interval < 90) {
    maturityLevel = 'Mature';
  } else {
    maturityLevel = 'Retired';
  }
  
  return {
    totalReviews,
    correctRate,
    averageInterval,
    maturityLevel,
    lapses: lapses || 0
  };
};

/**
 * Get overall statistics for a collection of cards
 * 
 * @param {Array} words - Array of vocabulary words with learning data
 * @returns {Object} - Aggregate statistics
 */
export const calculateOverallStats = (words) => {
  if (!words || words.length === 0) {
    return {
      totalCards: 0,
      newCards: 0,
      learningCards: 0,
      matureCards: 0,
      averageCorrectRate: 0,
      totalReviews: 0,
      reviewsLast7Days: 0,
      reviewsLast30Days: 0
    };
  }
  
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  let totalReviews = 0;
  let totalCorrect = 0;
  let reviewsLast7Days = 0;
  let reviewsLast30Days = 0;
  
  let newCards = 0;
  let learningCards = 0;
  let youngCards = 0;
  let matureCards = 0;
  let retiredCards = 0;
  
  // Process each card
  words.forEach(word => {
    const cardStats = calculateCardStats(word);
    
    // Count card by maturity level
    switch (cardStats.maturityLevel) {
      case 'New':
        newCards++;
        break;
      case 'Learning':
        learningCards++;
        break;
      case 'Young':
        youngCards++;
        break;
      case 'Mature':
        matureCards++;
        break;
      case 'Retired':
        retiredCards++;
        break;
    }
    
    // Count reviews
    if (word.learningData && word.learningData.reviewHistory) {
      const { reviewHistory } = word.learningData;
      
      totalReviews += reviewHistory.length;
      
      // Count correct reviews
      totalCorrect += reviewHistory.filter(
        review => review.qualityRating !== QUALITY_RATINGS.AGAIN
      ).length;
      
      // Count recent reviews
      reviewsLast7Days += reviewHistory.filter(review => {
        const reviewDate = new Date(review.date);
        return reviewDate >= sevenDaysAgo;
      }).length;
      
      reviewsLast30Days += reviewHistory.filter(review => {
        const reviewDate = new Date(review.date);
        return reviewDate >= thirtyDaysAgo;
      }).length;
    }
  });
  
  // Calculate average correct rate
  const averageCorrectRate = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;
  
  return {
    totalCards: words.length,
    newCards,
    learningCards,
    youngCards,
    matureCards,
    retiredCards,
    averageCorrectRate,
    totalReviews,
    reviewsLast7Days,
    reviewsLast30Days
  };
};

/**
 * Generate a forecast of upcoming reviews
 * 
 * @param {Array} words - Array of vocabulary words with learning data
 * @param {number} days - Number of days to forecast
 * @returns {Array} - Array of daily review counts
 */
export const generateReviewForecast = (words, days = 30) => {
  const forecast = Array(days).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  words.forEach(word => {
    if (!word.learningData || !word.learningData.nextReviewDate) {
      // New cards count as due today
      forecast[0]++;
      return;
    }
    
    const nextReviewDate = new Date(word.learningData.nextReviewDate);
    nextReviewDate.setHours(0, 0, 0, 0);
    
    const daysDifference = Math.floor((nextReviewDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < 0) {
      // Overdue cards count as due today
      forecast[0]++;
    } else if (daysDifference < days) {
      forecast[daysDifference]++;
    }
  });
  
  return forecast;
};

export default {
  calculateNextReviewInterval,
  isCardDue,
  getDueCards,
  calculateCardStats,
  calculateOverallStats,
  generateReviewForecast,
  QUALITY_RATINGS
};