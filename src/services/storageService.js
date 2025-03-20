/**
 * Storage Service
 * Handles local storage of application data using Electron Store or localStorage
 */

// Namespace for all stored data to avoid conflicts with other applications
const STORAGE_NAMESPACE = 'vocabulary-pdf-reader';

// Keys for different data types
const STORAGE_KEYS = {
  PDF_LIST: `${STORAGE_NAMESPACE}.pdf-list`,
  VOCABULARY: `${STORAGE_NAMESPACE}.vocabulary`,
  SETTINGS: `${STORAGE_NAMESPACE}.settings`,
  NOTES: `${STORAGE_NAMESPACE}.notes`,
};

// Check if we're in Electron environment
const isElectron = window && window.electron;

/**
 * Initialize the storage with default values if they don't exist
 */
export const initializeStorage = () => {
  if (!getItem(STORAGE_KEYS.PDF_LIST)) {
    setItem(STORAGE_KEYS.PDF_LIST, []);
  }
  
  if (!getItem(STORAGE_KEYS.VOCABULARY)) {
    setItem(STORAGE_KEYS.VOCABULARY, { global: [], byPdf: {} });
  }
  
  if (!getItem(STORAGE_KEYS.SETTINGS)) {
    setItem(STORAGE_KEYS.SETTINGS, {
      highlightColors: [
        { level: 1, color: '#ff6b6b' }, // Red
        { level: 2, color: '#feca57' }, // Yellow
        { level: 3, color: '#48dbfb' }, // Light Blue
        { level: 4, color: '#1dd1a1' }, // Green
        { level: 5, color: '#c8d6e5' }  // Light Gray (well known)
      ],
      dictionary: 'en',
      highlightEnabled: true
    });
  }
  
  if (!getItem(STORAGE_KEYS.NOTES)) {
    setItem(STORAGE_KEYS.NOTES, []);
  }
};

/**
 * Get an item from storage
 * @param {string} key - The storage key
 * @returns {any} - The stored value, or null if not found
 */
export const getItem = (key) => {
  try {
    // In Electron, use IPC to get data from the main process
    if (isElectron && window.electron.getStorageItem) {
      // This would normally be an async call, but we're simplifying for now
      // In a real app, this would be handled with async/await
      const storedData = window.localStorage.getItem(key);
      return storedData ? JSON.parse(storedData) : null;
    }
    
    // Fallback to localStorage
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting item from storage [${key}]:`, error);
    return null;
  }
};

/**
 * Set an item in storage
 * @param {string} key - The storage key
 * @param {any} value - The value to store
 */
export const setItem = (key, value) => {
  try {
    // Stringify the value
    const stringValue = JSON.stringify(value);
    
    // In Electron, use IPC to save data in the main process
    if (isElectron && window.electron.setStorageItem) {
      // This would normally be an async call, but we're simplifying for now
      window.localStorage.setItem(key, stringValue);
      return;
    }
    
    // Fallback to localStorage
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error(`Error setting item in storage [${key}]:`, error);
  }
};

/**
 * Remove an item from storage
 * @param {string} key - The storage key
 */
export const removeItem = (key) => {
  try {
    // In Electron, use IPC to remove data in the main process
    if (isElectron && window.electron.removeStorageItem) {
      window.localStorage.removeItem(key);
      return;
    }
    
    // Fallback to localStorage
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item from storage [${key}]:`, error);
  }
};

// PDF List Management

/**
 * Get the list of saved PDFs
 * @returns {Array} - The list of PDF metadata
 */
export const getPDFList = () => {
  return getItem(STORAGE_KEYS.PDF_LIST) || [];
};

/**
 * Add a PDF to the list
 * @param {Object} pdfMetadata - Metadata for the PDF
 */
export const addPDFToList = (pdfMetadata) => {
  const pdfList = getPDFList();
  const existingIndex = pdfList.findIndex(pdf => pdf.path === pdfMetadata.path);
  
  if (existingIndex >= 0) {
    // Update existing entry
    pdfList[existingIndex] = {
      ...pdfList[existingIndex],
      ...pdfMetadata,
      lastOpened: new Date().toISOString()
    };
  } else {
    // Add new entry
    pdfList.push({
      ...pdfMetadata,
      id: generateId(),
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString()
    });
  }
  
  setItem(STORAGE_KEYS.PDF_LIST, pdfList);
  return pdfList;
};

/**
 * Remove a PDF from the list
 * @param {string} pdfId - ID of the PDF to remove
 */
export const removePDFFromList = (pdfId) => {
  const pdfList = getPDFList();
  const newList = pdfList.filter(pdf => pdf.id !== pdfId);
  setItem(STORAGE_KEYS.PDF_LIST, newList);
  return newList;
};

/**
 * Update a PDF's metadata in the list
 * @param {string} pdfId - ID of the PDF to update
 * @param {Object} newMetadata - New metadata to apply
 */
export const updatePDFMetadata = (pdfId, newMetadata) => {
  const pdfList = getPDFList();
  const updatedList = pdfList.map(pdf => {
    if (pdf.id === pdfId) {
      return { ...pdf, ...newMetadata };
    }
    return pdf;
  });
  
  setItem(STORAGE_KEYS.PDF_LIST, updatedList);
  return updatedList;
};

/**
 * Update the last opened timestamp for a PDF
 * @param {string} pdfId - ID of the PDF
 */
export const updatePDFLastOpened = (pdfId) => {
  return updatePDFMetadata(pdfId, { lastOpened: new Date().toISOString() });
};

// Helper Functions

/**
 * Generate a unique ID
 * @returns {string} - A unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Initialize storage on module load
initializeStorage();

export default {
  getPDFList,
  addPDFToList,
  removePDFFromList,
  updatePDFMetadata,
  updatePDFLastOpened,
  getItem,
  setItem,
  removeItem,
  STORAGE_KEYS
};