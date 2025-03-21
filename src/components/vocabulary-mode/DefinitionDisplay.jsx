import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useDictionary from '../../hooks/useDictionary';
import useTranslation from '../../hooks/useTranslation';

/**
 * DefinitionDisplay - Component to display word definitions and translations
 * Enhanced with cross-language support
 * 
 * @param {Object} props - Component props
 * @param {string} props.word - The word to display definition for
 * @param {boolean} props.isVisible - Whether the definition is visible
 * @param {Function} props.onClose - Function to call when definition is closed
 * @param {Function} props.onSaveWord - Function to save word to vocabulary list
 */
const DefinitionDisplay = ({
  word = '',
  isVisible = false,
  onClose,
  onSaveWord
}) => {
  const [familiarityRating, setFamiliarityRating] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeTab, setActiveTab] = useState('definition');
  
  // Use the enhanced dictionary hook with auto-detection
  const {
    loading: definitionLoading,
    error: definitionError,
    definition,
    wordLanguage,
    isTranslated,
    originalWord,
    lookupWordAuto,
  } = useDictionary();
  
  // Use the translation hook
  const {
    loading: translationLoading,
    error: translationError,
    translatedText,
    translate,
    translateWithDetection,
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    swapLanguages
  } = useTranslation();
  
  // Lookup the word when it changes
  useEffect(() => {
    if (word && isVisible) {
      // Use auto-detection to lookup word in any language
      lookupWordAuto(word);
      
      // Reset state
      setFamiliarityRating(0);
      setShowTranslation(false);
      setActiveTab('definition');
    }
  }, [word, isVisible, lookupWordAuto]);
  
  // Handle showing translation
  const handleShowTranslation = () => {
    setShowTranslation(true);
    translateWithDetection(word);
  };
  
  // Handle manual translation after language change
  const handleManualTranslate = () => {
    if (word) {
      translate(word, sourceLang, targetLang);
    }
  };
  
  // Handle saving word
  const handleSaveWord = () => {
    if (onSaveWord && word && familiarityRating > 0) {
      onSaveWord({
        word,
        familiarityRating,
        definition: definition || null,
        translation: translatedText || null,
        date: new Date().toISOString(),
        language: wordLanguage || 'en'
      });
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 100, transition: { duration: 0.2 } }
  };
  
  // Panel content variants for tabs
  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };
  
  // If not visible, don't render anything
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key="definition-panel"
        className="definition-panel"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '350px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000
        }}
      >
        {/* Header with language indicator */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontWeight: '600', fontSize: '1.2rem' }}>
              {word}
            </h3>
            {wordLanguage && (
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                {wordLanguage === 'en' ? 'English' : wordLanguage === 'es' ? 'Spanish' : wordLanguage}
                {isTranslated && originalWord && ` (from "${originalWord}")`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              transition: 'all 0.2s',
              padding: 0
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <button
            onClick={() => setActiveTab('definition')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              backgroundColor: activeTab === 'definition' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'definition' ? 'white' : 'var(--text-secondary)',
              fontWeight: activeTab === 'definition' ? '500' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Definition
          </button>
          
          <button
            onClick={() => {
              setActiveTab('translation');
              if (!translatedText) handleShowTranslation();
            }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              backgroundColor: activeTab === 'translation' ? 'var(--secondary-color)' : 'transparent',
              color: activeTab === 'translation' ? 'white' : 'var(--text-secondary)',
              fontWeight: activeTab === 'translation' ? '500' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Translation
          </button>
        </div>
        
        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '15px 20px'
          }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'definition' && (
              <motion.div
                key="definition-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                {/* Cross-language information */}
                {isTranslated && originalWord && (
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    backgroundColor: 'var(--secondary-light)', 
                    color: 'white',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem'
                  }}>
                    Showing English definition for "{word}"
                    <br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                      Original Spanish word: "{originalWord}"
                    </span>
                  </div>
                )}
                
                {definitionLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ marginBottom: '10px' }}>Loading definition...</div>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '2px solid var(--primary-light)',
                        borderTopColor: 'var(--primary-color)',
                        borderRadius: '50%',
                        margin: '0 auto',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                  </div>
                ) : definitionError ? (
                  <div style={{ padding: '20px', color: 'var(--error)' }}>
                    <p>Error loading definition:</p>
                    <p>{definitionError.message}</p>
                  </div>
                ) : definition ? (
                  <div>
                    {/* Phonetics */}
                    {definition.phonetic && (
                      <div style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
                        {definition.phonetic}
                        
                        {/* Audio pronunciation if available */}
                        {definition.audioFile && (
                          <button
                            onClick={() => {
                              const audio = new Audio(definition.audioFile);
                              audio.play();
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary-color)',
                              cursor: 'pointer',
                              marginLeft: '10px',
                              fontSize: '1.2rem'
                            }}
                          >
                            🔊
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Meanings */}
                    {definition.meanings?.map((meaning, index) => (
                      <div key={index} style={{ marginBottom: '20px' }}>
                        {/* Part of speech */}
                        <h4
                          style={{
                            margin: '0 0 10px 0',
                            color: 'var(--primary-color)',
                            fontSize: '1rem',
                            fontStyle: 'italic'
                          }}
                        >
                          {meaning.partOfSpeech}
                        </h4>
                        
                        {/* Definitions */}
                        <ol style={{ margin: 0, paddingLeft: '20px' }}>
                          {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                            <li key={defIndex} style={{ marginBottom: '12px' }}>
                              <div>{def.definition}</div>
                              
                              {/* Example */}
                              {def.example && (
                                <div
                                  style={{
                                    marginTop: '5px',
                                    color: 'var(--text-secondary)',
                                    fontStyle: 'italic',
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  "{def.example}"
                                </div>
                              )}
                            </li>
                          ))}
                        </ol>
                        
                        {/* Synonyms */}
                        {meaning.synonyms && meaning.synonyms.length > 0 && (
                          <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Synonyms: </span>
                            <span>{meaning.synonyms.slice(0, 5).join(", ")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No definition available
                  </div>
                )}
              </motion.div>
            )}
            
            {activeTab === 'translation' && (
              <motion.div
                key="translation-content"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                {/* Language controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: 'var(--background)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                  
                  <button
                    onClick={swapLanguages}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: 'none',
                      margin: '0 10px',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}
                  >
                    ⇄
                  </button>
                  
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                
                {/* Translate button - only appears after manual language change */}
                {showTranslation && (
                  <button
                    onClick={handleManualTranslate}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginBottom: '15px',
                      padding: '8px',
                      border: 'none',
                      backgroundColor: 'var(--secondary-light)',
                      color: 'white',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Translate with Selected Languages
                  </button>
                )}
                
                {/* Original word */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Original ({sourceLang === 'en' ? 'English' : sourceLang === 'es' ? 'Spanish' : sourceLang}):
                  </div>
                  <div
                    style={{
                      padding: '10px',
                      backgroundColor: 'var(--background)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  >
                    {word}
                  </div>
                </div>
                
                {/* Translation */}
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Translation ({targetLang === 'en' ? 'English' : targetLang === 'es' ? 'Spanish' : targetLang}):
                  </div>
                  
                  {translationLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div style={{ marginBottom: '10px' }}>Translating...</div>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          border: '2px solid var(--secondary-light)',
                          borderTopColor: 'var(--secondary-color)',
                          borderRadius: '50%',
                          margin: '0 auto',
                          animation: 'spin 1s linear infinite'
                        }}
                      />
                    </div>
                  ) : translationError ? (
                    <div style={{ padding: '20px', color: 'var(--error)' }}>
                      <p>Error translating:</p>
                      <p>{translationError.message}</p>
                    </div>
                  ) : translatedText ? (
                    <div
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--background)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem'
                      }}
                    >
                      {translatedText}
                    </div>
                  ) : !showTranslation ? (
                    <button
                      onClick={handleShowTranslation}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        border: 'none',
                        backgroundColor: 'var(--secondary-color)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      Show Translation
                    </button>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No translation available
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer with familiarity rating and save button */}
        <div
          style={{
            padding: '15px 20px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Familiarity rating */}
          <div>
            <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              How familiar are you with this word?
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px'
              }}
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFamiliarityRating(rating)}
                  style={{
                    width: '36px',
                    height: '36px',
                    border: `2px solid ${
                      familiarityRating >= rating
                        ? `var(--highlight-level-${rating})`
                        : 'var(--border)'
                    }`,
                    borderRadius: 'var(--radius-circle)',
                    backgroundColor: familiarityRating >= rating
                      ? `var(--highlight-level-${rating})`
                      : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: familiarityRating >= rating ? '600' : 'normal',
                    color: familiarityRating >= rating && rating > 2 ? 'white' : 'inherit',
                    transition: 'all 0.2s'
                  }}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
          
          {/* Save button */}
          <button
            onClick={handleSaveWord}
            disabled={familiarityRating === 0}
            style={{
              padding: '10px',
              border: 'none',
              backgroundColor: familiarityRating > 0 ? 'var(--primary-color)' : 'var(--border)',
              color: familiarityRating > 0 ? 'white' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              cursor: familiarityRating > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Save to Vocabulary List
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DefinitionDisplay;