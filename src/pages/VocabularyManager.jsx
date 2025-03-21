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
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Filter options
  const filters = [
    { id: 'all', label: 'All Words' },
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Spanish' },
    { id: 'familiar', label: 'Familiar' },
    { id: 'learning', label: 'Learning' },
  ];

  // Apply filters and search to vocabulary
  const filteredVocabulary = mockVocabulary.filter(word => {
    // Apply language filter
    if (activeFilter === 'en' && word.language !== 'en') return false;
    if (activeFilter === 'es' && word.language !== 'es') return false;
    
    // Apply familiarity filter
    if (activeFilter === 'familiar' && word.familiarity < 4) return false;
    if (activeFilter === 'learning' && word.familiarity >= 4) return false;
    
    // Apply search filter
    if (searchTerm && !word.word.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
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
      }}
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        style={{
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h1 style={{ marginBottom: 'var(--space-xs)' }}>
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
        }}
      >
        {/* Search input */}
        <div style={{
          flex: '1 1 300px',
          position: 'relative',
        }}>
          <input
            type="text"
            placeholder="Search words..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-sm) var(--space-md)',
              paddingLeft: 'var(--space-xl)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: 'var(--font-size-md)',
              outline: 'none',
              transition: 'border-color 0.2s',
              backgroundColor: 'var(--surface)',
            }}
          />
          <span style={{
            position: 'absolute',
            left: 'var(--space-sm)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}>
            🔍
          </span>
        </div>

        {/* Filter buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-xs)',
          flexWrap: 'wrap',
        }}>
          {filters.map(filter => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
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
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-xs)',
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
                  color: word.language === 'en' ? 'var(--primary-color)' : 'var(--secondary-color)',
                }}>
                  {word.language === 'en' ? 'EN' : 'ES'}
                </span>
              </div>
              <p style={{
                margin: 0,
                marginBottom: 'var(--space-md)',
                color: 'var(--text-secondary)',
              }}>
                {word.definition}
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
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
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-muted)',
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