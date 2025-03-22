import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import {
  getAllVocabulary,
  getVocabularyBySourceLanguage,
  getVocabularyByFamiliarity,
  getSupportedLanguages
} from '../services/storageService';

/**
 * VocabularyManager Page Component
 * Enhanced interface for managing saved vocabulary words with translations
 */
const VocabularyManager = ({ onNavigate }) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);
  const [vocabularyList, setVocabularyList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  
  // Generate language filters based on supported languages
  const generateLanguageFilters = () => {
    // Start with default filters
    const baseFilters = [
      { id: 'all', label: 'All Words', icon: '🔤', color: 'var(--primary-color)' },
      { id: 'familiar', label: 'Familiar', icon: '✓', color: 'var(--secondary-color)' },
      { id: 'learning', label: 'Learning', icon: '📝', color: 'var(--accent-yellow)' },
    ];
    
    // Add language-specific filters
    const languageFilters = supportedLanguages.slice(0, 6).map(lang => {
      let icon = '🌐';
      let color = 'var(--accent-purple)';
      
      // Set icons for common languages
      switch(lang.code) {
        case 'en': 
          icon = '🇬🇧'; 
          color = 'var(--accent-purple)';
          break;
        case 'es': 
          icon = '🇪🇸'; 
          color = 'var(--accent-coral)';
          break;
        case 'fr': 
          icon = '🇫🇷'; 
          color = 'var(--accent-blue)';
          break;
        case 'de': 
          icon = '🇩🇪'; 
          color = 'var(--accent-red)';
          break;
        case 'it': 
          icon = '🇮🇹'; 
          color = 'var(--accent-green)';
          break;
        case 'ja': 
          icon = '🇯🇵'; 
          color = 'var(--highlight-level-1)';
          break;
        case 'zh': 
          icon = '🇨🇳'; 
          color = 'var(--highlight-level-2)';
          break;
        default: 
          icon = '🌐'; 
          break;
      }
      
      return { 
        id: lang.code, 
        label: lang.name, 
        icon, 
        color 
      };
    });
    
    return [...baseFilters, ...languageFilters];
  };
  
  const [filters, setFilters] = useState([]);
  
  // Load vocabulary and languages from storage
  useEffect(() => {
    setIsLoading(true);
    try {
      // Get supported languages
      const languages = getSupportedLanguages();
      setSupportedLanguages(languages);
      
      // Get all vocabulary words
      const vocabWords = getAllVocabulary();
      setVocabularyList(vocabWords);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Update filters when languages are loaded
  useEffect(() => {
    if (supportedLanguages.length > 0) {
      setFilters(generateLanguageFilters());
    }
  }, [supportedLanguages]);

  // Delete a word
  const handleDeleteWord = (wordId) => {
    const updatedVocabulary = vocabularyList.filter(item => item.id !== wordId);
    setVocabularyList(updatedVocabulary);
    
    // Here you would call your storage service to delete the word
    // removeVocabularyWord(wordId);
  };

  // Update word familiarity
  const handleUpdateFamiliarity = (wordId, newLevel) => {
    const updatedVocabulary = vocabularyList.map(item => {
      if (item.id === wordId) {
        return { ...item, familiarityRating: newLevel };
      }
      return item;
    });
    
    setVocabularyList(updatedVocabulary);
    
    // Here you would call your storage service to update the word
    // updateVocabularyWord(wordId, { familiarityRating: newLevel });
  };

  // Toggle a filter
  const toggleFilter = (filterId) => {
    if (filterId === 'all') {
      // Clear all filters if 'all' is selected
      setActiveFilters([]);
      return;
    }
    
    // Check if the filter is already active
    if (activeFilters.includes(filterId)) {
      // Remove the filter if already active
      setActiveFilters(activeFilters.filter(id => id !== filterId));
    } else {
      // Add the filter if not active
      setActiveFilters([...activeFilters, filterId]);
    }
  };

  // Apply filters and search to vocabulary
  const filteredVocabulary = vocabularyList.filter(word => {
    // If no filters are active, show all words
    if (activeFilters.length === 0) {
      // Only apply search if present
      if (searchTerm && !word.word.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    }
    
    // Check if the word matches any of the active filters
    let matchesLanguageFilter = false;
    let matchesFamiliarityFilter = false;
    let hasLanguageFilter = false;
    let hasFamiliarityFilter = false;
    
    // Check language filters
    const languageFilters = activeFilters.filter(
      filterId => filterId !== 'familiar' && filterId !== 'learning'
    );
    
    if (languageFilters.length > 0) {
      hasLanguageFilter = true;
      if (languageFilters.includes(word.sourceLang) || languageFilters.includes(word.targetLang)) {
        matchesLanguageFilter = true;
      }
    }
    
    // Check familiarity filters
    if (activeFilters.includes('familiar') || activeFilters.includes('learning')) {
      hasFamiliarityFilter = true;
      if ((activeFilters.includes('familiar') && word.familiarityRating >= 4) ||
          (activeFilters.includes('learning') && word.familiarityRating < 4)) {
        matchesFamiliarityFilter = true;
      }
    }
    
    // Word must match all applied filter types
    const matchesFilters = 
      (!hasLanguageFilter || matchesLanguageFilter) && 
      (!hasFamiliarityFilter || matchesFamiliarityFilter);
    
    // Apply search filter
    if (searchTerm && !word.word.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return matchesFilters;
  });

  // Get color for familiarity level
  const getFamiliarityColor = (level) => {
    switch (level) {
      case 1: return 'var(--highlight-level-1)';
      case 2: return 'var(--highlight-level-2)';
      case 3: return 'var(--highlight-level-3)';
      case 4: return 'var(--highlight-level-4)';
      case 5: return 'var(--highlight-level-5)';
      default: return 'transparent';
    }
  };

  // Get label for familiarity level
  const getFamiliarityLabel = (level) => {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Elementary';
      case 3: return 'Intermediate';
      case 4: return 'Advanced';
      case 5: return 'Mastered';
      default: return '';
    }
  };
  
  // Get language name from code
  const getLanguageName = (code) => {
    const language = supportedLanguages.find(lang => lang.code === code);
    return language ? language.name : code.toUpperCase();
  };
  
  // Get language icon based on code
  const getLanguageIcon = (code) => {
    switch(code) {
      case 'en': return '🇬🇧';
      case 'es': return '🇪🇸';
      case 'fr': return '🇫🇷';
      case 'de': return '🇩🇪';
      case 'it': return '🇮🇹';
      case 'ja': return '🇯🇵';
      case 'zh': return '🇨🇳';
      case 'ru': return '🇷🇺';
      case 'pt': return '🇵🇹';
      case 'ko': return '🇰🇷';
      case 'ar': return '🇸🇦';
      case 'hi': return '🇮🇳';
      case 'tr': return '🇹🇷';
      case 'nl': return '🇳🇱';
      case 'sv': return '🇸🇪';
      default: return '🌐';
    }
  };
  
  // Get language color based on code
  const getLanguageColor = (code) => {
    switch(code) {
      case 'en': return 'var(--accent-purple)';
      case 'es': return 'var(--accent-coral)';
      case 'fr': return 'var(--accent-blue)';
      case 'de': return 'var(--accent-red)';
      case 'it': return 'var(--accent-green)';
      default: return 'var(--primary-color)';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.05,
      }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <div className="animate-spin" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(74, 105, 189, 0.2)',
          borderTopColor: 'var(--primary-color)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        padding: 'var(--space-lg)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, rgba(74, 105, 189, 0.05) 0%, rgba(29, 209, 161, 0.05) 100%)',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%234a69bd' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      }}
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        style={{
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h1 style={{ 
          marginBottom: 'var(--space-xs)',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}>
          Vocabulary Manager
        </h1>
        <p style={{
          color: 'var(--text-secondary)',
          maxWidth: '800px',
          marginBottom: 'var(--space-lg)',
        }}>
          Manage your saved vocabulary words. Rate your familiarity with each word to customize highlighting in your documents.
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Button
            onClick={() => onNavigate('vocabulary-mode')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <span>📚</span>
            <span>Return to Vocabulary Mode</span>
          </Button>
        </div>
      </motion.div>

      {/* Search and Filter Controls */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
          background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(74,105,189,0.05) 100%)',
        }}
      >
        {/* Search input */}
        <div style={{
          flex: '1 1 300px',
          position: 'relative',
        }}>
          <div 
            style={{
              position: 'relative',
              transition: 'all 0.3s ease',
              transform: focusedInput ? 'scale(1.02)' : 'scale(1)',
              transformOrigin: 'left center'
            }}
          >
            <input
              type="text"
              placeholder="Search words..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setFocusedInput(true)}
              onBlur={() => setFocusedInput(false)}
              style={{
                width: '100%',
                padding: 'var(--space-md) var(--space-md)',
                paddingLeft: 'var(--space-xl)',
                borderRadius: 'var(--radius-md)',
                border: focusedInput 
                  ? '2px solid var(--primary-color)' 
                  : '2px solid var(--border)',
                fontSize: 'var(--font-size-md)',
                outline: 'none',
                transition: 'all 0.2s ease',
                backgroundColor: 'var(--surface)',
                boxShadow: focusedInput 
                  ? '0 0 0 4px rgba(74, 105, 189, 0.15)' 
                  : 'var(--shadow-inner)',
              }}
            />
            <span style={{
              position: 'absolute',
              left: 'var(--space-sm)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: focusedInput ? 'var(--primary-color)' : 'var(--text-muted)',
              transition: 'color 0.2s ease',
              fontSize: '1.1rem',
            }}>
              🔍
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 'var(--space-sm)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '1.1rem',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          background: 'white',
          padding: 'var(--space-sm)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
        }}>
          {filters.map(filter => {
            const isActive = filter.id === 'all' 
              ? activeFilters.length === 0 
              : activeFilters.includes(filter.id);
            
            return (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleFilter(filter.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  padding: 'var(--space-sm) var(--space-md)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 'var(--font-weight-medium)',
                  fontSize: 'var(--font-size-sm)',
                  background: isActive 
                    ? filter.color
                    : 'rgba(0,0,0,0.03)',
                  color: isActive 
                    ? 'white' 
                    : 'var(--text-secondary)',
                  boxShadow: isActive 
                    ? '0 2px 5px rgba(0,0,0,0.1)' 
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{filter.icon}</span>
                <span>{filter.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Active filters summary */}
        {activeFilters.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            backgroundColor: 'rgba(255,255,255,0.7)',
          }}>
            <span>Active filters:</span>
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              {activeFilters.map(filterId => {
                const filter = filters.find(f => f.id === filterId);
                if (!filter) return null;
                
                return (
                  <span 
                    key={filterId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: filter.color,
                      color: 'white',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {filter.icon} {filter.label}
                  </span>
                );
              })}
            </div>
            <button
              onClick={() => setActiveFilters([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px 6px',
                fontSize: 'var(--font-size-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </motion.div>

      {/* Vocabulary List */}
      {filteredVocabulary.length > 0 ? (
        <motion.div
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--space-md)',
            overflowY: 'auto',
            padding: 'var(--space-xs)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {filteredVocabulary.map(word => (
            <motion.div
              key={word.id}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                padding: 'var(--space-md)',
                borderLeft: `4px solid ${getFamiliarityColor(word.familiarityRating)}`,
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background decoration */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: `linear-gradient(135deg, transparent 50%, ${getFamiliarityColor(word.familiarityRating).replace(')', ', 0.1)')} 50%)`,
                zIndex: 0,
              }} />
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-xs)',
                position: 'relative',
                zIndex: 1,
              }}>
                <h3 style={{ 
                  margin: 0,
                  fontSize: 'var(--font-size-lg)',
                }}>
                  {word.word}
                </h3>
                
                {/* Language translation badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}>
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    textTransform: 'uppercase',
                    color: 'white',
                    backgroundColor: getLanguageColor(word.sourceLang),
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}>
                    {getLanguageIcon(word.sourceLang)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    textTransform: 'uppercase',
                    color: 'white',
                    backgroundColor: getLanguageColor(word.targetLang),
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}>
                    {getLanguageIcon(word.targetLang)}
                  </span>
                </div>
              </div>
              
              {/* Translation */}
              <p style={{
                margin: 0,
                marginBottom: 'var(--space-md)',
                color: 'var(--text-secondary)',
                position: 'relative',
                zIndex: 1,
              }}>
                {word.translation || 'No translation available'}
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}>
                <div style={{
                  display: 'flex',
                  gap: '2px',
                }}>
                  {[1, 2, 3, 4, 5].map(level => (
                    <motion.div
                      key={level}
                      whileHover={{ scale: 1.2 }}
                      onClick={() => handleUpdateFamiliarity(word.id, level)}
                      style={{
                        width: '20px',
                        height: '8px',
                        backgroundColor: level <= word.familiarityRating 
                          ? getFamiliarityColor(level) 
                          : 'var(--border)',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'white',
                  backgroundColor: getFamiliarityColor(word.familiarityRating),
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-medium)',
                }}>
                  {getFamiliarityLabel(word.familiarityRating)}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteWord(word.id)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    zIndex: 5,
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xl)',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
            📚
          </div>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>
            No vocabulary words found
          </h3>
          <p style={{ 
            color: 'var(--text-secondary)',
            maxWidth: '400px',
            margin: '0 auto',
            marginBottom: 'var(--space-md)'
          }}>
            {searchTerm 
              ? `No words match your search "${searchTerm}"`
              : 'Start by opening a PDF and clicking on words to add them to your vocabulary list'}
          </p>

          <Button
            onClick={() => onNavigate('vocabulary-mode')}
          >
            Go to Vocabulary Mode
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VocabularyManager;