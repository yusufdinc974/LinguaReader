import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';

/**
 * VocabularyManager Page Component
 * Interface for managing saved vocabulary words
 * 
 * Note: This is a placeholder component for Phase 3. It will be fully implemented in Phase 5.
 */
const VocabularyManager = () => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedInput, setFocusedInput] = useState(false);
  
  // Mock vocabulary data for layout purposes
  // Will be replaced with actual vocabulary context in Phase 5
  const mockVocabulary = [
    { id: 1, word: 'perspicacious', definition: 'having keen mental perception and understanding', familiarity: 2, language: 'en' },
    { id: 2, word: 'ephemeral', definition: 'lasting for a very short time', familiarity: 3, language: 'en' },
    { id: 3, word: 'ubiquitous', definition: 'present, appearing, or found everywhere', familiarity: 4, language: 'en' },
    { id: 4, word: 'pernicious', definition: 'having a harmful effect, especially in a gradual or subtle way', familiarity: 1, language: 'en' },
    { id: 5, word: 'audaz', definition: 'brave, bold, daring', familiarity: 2, language: 'es' },
    { id: 6, word: 'sosiego', definition: 'calmness, peacefulness, tranquility', familiarity: 1, language: 'es' },
  ];

  // Filter options with icons and colors
  const filters = [
    { id: 'all', label: 'All Words', icon: '🔤', color: 'var(--primary-color)' },
    { id: 'en', label: 'English', icon: '🇬🇧', color: 'var(--accent-purple)' },
    { id: 'es', label: 'Spanish', icon: '🇪🇸', color: 'var(--accent-coral)' },
    { id: 'familiar', label: 'Familiar', icon: '✓', color: 'var(--secondary-color)' },
    { id: 'learning', label: 'Learning', icon: '📝', color: 'var(--accent-yellow)' },
  ];

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
  const filteredVocabulary = mockVocabulary.filter(word => {
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
    if (activeFilters.includes('en') || activeFilters.includes('es')) {
      hasLanguageFilter = true;
      if ((activeFilters.includes('en') && word.language === 'en') ||
          (activeFilters.includes('es') && word.language === 'es')) {
        matchesLanguageFilter = true;
      }
    }
    
    // Check familiarity filters
    if (activeFilters.includes('familiar') || activeFilters.includes('learning')) {
      hasFamiliarityFilter = true;
      if ((activeFilters.includes('familiar') && word.familiarity >= 4) ||
          (activeFilters.includes('learning') && word.familiarity < 4)) {
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
                borderLeft: `4px solid ${getFamiliarityColor(word.familiarity)}`,
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
                background: `linear-gradient(135deg, transparent 50%, ${getFamiliarityColor(word.familiarity).replace(')', ', 0.1)')} 50%)`,
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
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  textTransform: 'uppercase',
                  color: word.language === 'en' ? 'white' : 'white',
                  backgroundColor: word.language === 'en' 
                    ? 'var(--accent-purple)' 
                    : 'var(--accent-coral)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {word.language === 'en' ? '🇬🇧' : '🇪🇸'} {word.language.toUpperCase()}
                </span>
              </div>
              <p style={{
                margin: 0,
                marginBottom: 'var(--space-md)',
                color: 'var(--text-secondary)',
                position: 'relative',
                zIndex: 1,
              }}>
                {word.definition}
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
                    <div
                      key={level}
                      style={{
                        width: '20px',
                        height: '8px',
                        backgroundColor: level <= word.familiarity 
                          ? getFamiliarityColor(level) 
                          : 'var(--border)',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'white',
                  backgroundColor: getFamiliarityColor(word.familiarity),
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 'var(--font-weight-medium)',
                }}>
                  {getFamiliarityLabel(word.familiarity)}
                </span>
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
          }}>
            {searchTerm 
              ? `No words match your search "${searchTerm}"`
              : 'Start by opening a PDF and clicking on words to add them to your vocabulary list'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VocabularyManager;