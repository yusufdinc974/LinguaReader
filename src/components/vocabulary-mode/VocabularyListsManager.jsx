import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabulary } from '../../contexts/VocabularyContext';

/**
 * VocabularyListsManager - Component for managing vocabulary lists
 * Allows creating, editing, and deleting lists, and moving words between lists
 */
const VocabularyListsManager = () => {
  const {
    vocabularyLists,
    createList,
    updateList,
    deleteList,
    getWordsInList,
    removeWordFromList,
    addWordToList,
    selectedListId,
    selectList,
    setDefaultList,
    vocabularyWords
  } = useVocabulary();
  
  // State for list management
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [editingList, setEditingList] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [listToDelete, setListToDelete] = useState(null);
  const [wordSearch, setWordSearch] = useState('');
  
  // State for word removal confirmation
  const [wordToRemove, setWordToRemove] = useState(null);
  const [isConfirmingWordRemoval, setIsConfirmingWordRemoval] = useState(false);
  
  // Start word removal confirmation
  const startWordRemoval = (wordId) => {
    setWordToRemove(wordId);
    setIsConfirmingWordRemoval(true);
  };
  
  // Cancel word removal
  const cancelWordRemoval = () => {
    setWordToRemove(null);
    setIsConfirmingWordRemoval(false);
  };
  
  // Confirm and handle removing a word from the current list
  const handleRemoveWord = () => {
    if (!selectedListId || !wordToRemove) return;
    
    // Perform the removal
    const success = removeWordFromList(wordToRemove, selectedListId);
    
    if (success) {
      // Update the words in the current list
      setWordsInCurrentList(prev => prev.filter(word => word.id !== wordToRemove));
    }
    
    // Reset confirmation state
    setWordToRemove(null);
    setIsConfirmingWordRemoval(false);
  };
  
  // Words in the selected list
  const [wordsInCurrentList, setWordsInCurrentList] = useState([]);
  
  // Load words in the selected list
  useEffect(() => {
    if (selectedListId) {
      const words = getWordsInList(selectedListId);
      setWordsInCurrentList(words);
    } else {
      setWordsInCurrentList([]);
    }
  }, [selectedListId, getWordsInList, vocabularyWords, vocabularyLists]);
  
  // Handle creating a new list
  const handleCreateList = () => {
    if (!newListName.trim()) return;
    
    createList({
      name: newListName.trim(),
      description: newListDescription.trim()
    });
    
    // Reset form
    setNewListName('');
    setNewListDescription('');
  };
  
  // Start editing a list
  const handleStartEditing = (list) => {
    setEditingList(list.id);
    setEditName(list.name);
    setEditDescription(list.description || '');
  };
  
  // Save list edits
  const handleSaveEdits = () => {
    if (!editName.trim() || !editingList) return;
    
    updateList(editingList, {
      name: editName.trim(),
      description: editDescription.trim()
    });
    
    // Reset editing state
    setEditingList(null);
    setEditName('');
    setEditDescription('');
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingList(null);
    setEditName('');
    setEditDescription('');
  };
  
  // Start the delete confirmation process
  const handleConfirmDelete = (listId) => {
    setListToDelete(listId);
    setIsConfirmingDelete(true);
  };
  
  // Delete a list
  const handleDeleteList = () => {
    if (!listToDelete) return;
    
    deleteList(listToDelete);
    
    // Reset confirmation state
    setIsConfirmingDelete(false);
    setListToDelete(null);
  };
  
  // Cancel delete confirmation
  const handleCancelDelete = () => {
    setIsConfirmingDelete(false);
    setListToDelete(null);
  };
  
  // Set a list as default
  const handleSetDefaultList = (listId) => {
    setDefaultList(listId);
  };
  
  // Filter words based on search input
  const filteredWords = wordsInCurrentList.filter(word => {
    if (!wordSearch.trim()) return true;
    
    const searchLower = wordSearch.toLowerCase();
    return (
      word.word.toLowerCase().includes(searchLower) ||
      (word.translation && word.translation.toLowerCase().includes(searchLower))
    );
  });
  
  // Get filtered words not in the current list (for adding)
  const wordsNotInList = vocabularyWords.filter(word => {
    // Skip words already in the list
    if (wordsInCurrentList.some(w => w.id === word.id)) return false;
    
    // Filter by search if there is one
    if (!wordSearch.trim()) return true;
    
    const searchLower = wordSearch.toLowerCase();
    return (
      word.word.toLowerCase().includes(searchLower) ||
      (word.translation && word.translation.toLowerCase().includes(searchLower))
    );
  });
  
  return (
    <div className="vocabulary-lists-manager">
      {/* List management section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '20px',
          height: 'calc(100vh - 240px)',
          overflow: 'hidden'
        }}
      >
        {/* Lists sidebar */}
        <div
          style={{
            borderRight: '1px solid var(--border)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto'
          }}
        >
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.5rem' }}>Vocabulary Lists</h2>
          
          {/* Create new list form */}
          <div
            style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: 'var(--background)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Create New List</h3>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '8px'
                }}
              />
              <input
                type="text"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
            </div>
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim()}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: newListName.trim() ? 'var(--primary-color)' : 'var(--border)',
                color: newListName.trim() ? 'white' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: newListName.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Create List
            </button>
          </div>
          
          {/* List of vocabulary lists */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {vocabularyLists.length > 0 ? (
              vocabularyLists.map(list => (
                <div
                  key={list.id}
                  style={{
                    marginBottom: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selectedListId === list.id ? 'var(--primary-color)' : 'var(--border)'}`,
                    backgroundColor: selectedListId === list.id ? 'var(--primary-light)' : 'white'
                  }}
                >
                  {/* List item - view mode */}
                  {editingList !== list.id ? (
                    <div style={{ padding: '12px 15px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            fontWeight: '600',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {list.name}
                          {/* Default list indicator */}
                          {list.id === vocabularyLists.find(l => l.id === setDefaultList())?.id && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                backgroundColor: 'var(--success)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              Default
                            </span>
                          )}
                        </h4>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => handleStartEditing(list)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '3px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.9rem'
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(list.id)}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--error)',
                              cursor: 'pointer',
                              padding: '3px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.9rem'
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {list.description && (
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {list.description}
                        </p>
                      )}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {list.words ? list.words.length : 0} words
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => selectList(list.id)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            backgroundColor: selectedListId === list.id ? 'var(--primary-color)' : 'var(--primary-light)',
                            color: selectedListId === list.id ? 'white' : 'var(--primary-color)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          {selectedListId === list.id ? 'Selected' : 'Select'}
                        </button>
                        {list.id !== vocabularyLists.find(l => l.id === setDefaultList())?.id && (
                          <button
                            onClick={() => handleSetDefaultList(list.id)}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              backgroundColor: 'var(--background)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* List item - edit mode */
                    <div style={{ padding: '12px 15px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="List name"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '8px'
                          }}
                        />
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleSaveEdits}
                          disabled={!editName.trim()}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            backgroundColor: editName.trim() ? 'var(--success)' : 'var(--border)',
                            color: editName.trim() ? 'white' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            cursor: editName.trim() ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            backgroundColor: 'var(--background)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--background)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                No vocabulary lists created yet.
              </div>
            )}
          </div>
        </div>
        
        {/* List words management */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {selectedListId ? (
            <>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '1.5rem' }}>
                {vocabularyLists.find(l => l.id === selectedListId)?.name || 'List Words'}
              </h2>
              
              {/* Search input */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  placeholder="Search words..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
              
              {/* Words in list and not in list tabs */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: '15px'
                  }}
                >
                  <div
                    style={{
                      padding: '10px 15px',
                      fontWeight: '500',
                      borderBottom: '2px solid var(--primary-color)',
                      color: 'var(--primary-color)'
                    }}
                  >
                    Words in List ({wordsInCurrentList.length})
                  </div>
                </div>
                
                {/* Words display */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredWords.length > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '12px'
                      }}
                    >
                      {filteredWords.map(word => (
                        <div
                          key={word.id}
                          style={{
                            padding: '12px 15px',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            position: 'relative'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '8px'
                            }}
                          >
                            <div>
                              <h4 style={{ margin: '0 0 5px 0', fontWeight: '600' }}>{word.word}</h4>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {word.sourceLanguageName} → {word.targetLanguageName}
                              </div>
                            </div>
                            
                            {/* Familiarity badge */}
                            <div
                              style={{
                                backgroundColor: `var(--highlight-level-${word.familiarityRating})`,
                                color: word.familiarityRating > 2 ? 'white' : 'var(--text-primary)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem'
                              }}
                            >
                              Level {word.familiarityRating}
                            </div>
                          </div>
                          
                          {/* Translation */}
                          {word.translation && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Translation:
                              </div>
                              <div style={{ fontSize: '0.95rem' }}>{word.translation}</div>
                            </div>
                          )}
                          
                          {/* Remove from list button */}
                          <button
                            onClick={() => startWordRemoval(word.id)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '6px 10px',
                              backgroundColor: 'var(--error-light)',
                              color: 'var(--error)',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              marginTop: '8px'
                            }}
                          >
                            Remove from List
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '30px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--background)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      {wordSearch.trim() 
                        ? 'No matching words found in this list.' 
                        : 'No words in this list yet.'}
                    </div>
                  )}
                  
                  {/* Section for words not in list */}
                  {wordSearch && wordsNotInList.length > 0 && (
                    <div style={{ marginTop: '30px' }}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>
                        Add words matching "{wordSearch}" ({wordsNotInList.length})
                      </h3>
                      
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '12px'
                        }}
                      >
                        {wordsNotInList.slice(0, 10).map(word => (
                          <div
                            key={word.id}
                            style={{
                              padding: '12px 15px',
                              backgroundColor: 'var(--background)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '8px'
                              }}
                            >
                              <div>
                                <h4 style={{ margin: '0 0 5px 0', fontWeight: '600' }}>{word.word}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {word.sourceLanguageName} → {word.targetLanguageName}
                                </div>
                              </div>
                              
                              {/* Familiarity badge */}
                              <div
                                style={{
                                  backgroundColor: `var(--highlight-level-${word.familiarityRating})`,
                                  color: word.familiarityRating > 2 ? 'white' : 'var(--text-primary)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.85rem'
                                }}
                              >
                                Level {word.familiarityRating}
                              </div>
                            </div>
                            
                            {/* Translation */}
                            {word.translation && (
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  Translation:
                                </div>
                                <div style={{ fontSize: '0.95rem' }}>{word.translation}</div>
                              </div>
                            )}
                            
                            {/* Add to list button */}
                            <button
                              onClick={() => addWordToList(word.id, selectedListId)}
                              style={{
                                display: 'block',
                                width: '100%',
                                padding: '6px 10px',
                                backgroundColor: 'var(--success-light)',
                                color: 'var(--success)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                marginTop: '8px'
                              }}
                            >
                              Add to List
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {wordsNotInList.length > 10 && (
                        <div style={{ textAlign: 'center', marginTop: '15px', color: 'var(--text-secondary)' }}>
                          Showing 10 of {wordsNotInList.length} matching words. Refine your search to see more.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--background)',
                borderRadius: 'var(--radius-md)',
                padding: '40px'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📚</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>No List Selected</h2>
              <p style={{ textAlign: 'center', maxWidth: '400px', margin: '0' }}>
                Select a vocabulary list from the sidebar to manage its words, or create a new list to get started.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete list confirmation modal */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: '350px',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>Confirm Delete</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>
                Are you sure you want to delete this vocabulary list? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCancelDelete}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteList}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Remove word confirmation modal */}
      <AnimatePresence>
        {isConfirmingWordRemoval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: '350px',
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem' }}>Confirm Removal</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.95rem' }}>
                Are you sure you want to remove this word from the current list?
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={cancelWordRemoval}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveWord}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--error)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VocabularyListsManager;