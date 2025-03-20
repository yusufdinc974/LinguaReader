// The preload script runs in a Node.js context with access to the electron and node APIs
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Log preload script execution
console.log('Preload script executed');

// Expose protected methods that allow the renderer process to use
// specific electron APIs without exposing the entire API
contextBridge.exposeInMainWorld(
  'electron', 
  {
    // File operations
    selectPdf: () => ipcRenderer.invoke('select-pdf'),
    
    // File system operations (limited for security)
    readFile: async (filePath) => {
      try {
        return await fs.promises.readFile(filePath);
      } catch (error) {
        console.error('Error reading file:', error);
        throw error;
      }
    },
    
    // Storage operations
    getStorageItem: (key) => {
      try {
        // This is a synchronous operation for simplicity
        // In a real app, you might want to make this async via IPC
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error getting storage item:', error);
        return null;
      }
    },
    
    setStorageItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error('Error setting storage item:', error);
        return false;
      }
    },
    
    removeStorageItem: (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing storage item:', error);
        return false;
      }
    },
    
    // File information
    getFileName: (filePath) => path.basename(filePath),
    
    // App information
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // Window control
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window')
  }
);

// Log when preload script has completed
console.log('Preload script completed - Electron APIs exposed');