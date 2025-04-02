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
    
    // Enhanced file system operations with better error handling
    readFile: async (filePath) => {
      try {
        console.log('Attempting to read file:', filePath);
        
        // Check if file exists first
        if (!fs.existsSync(filePath)) {
          console.error('File does not exist:', filePath);
          throw new Error(`File doesn't exist: ${filePath}`);
        }
        
        const data = await fs.promises.readFile(filePath);
        console.log('Successfully read file:', filePath, 'Size:', data.length);
        return data;
      } catch (error) {
        console.error('Error reading file:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
      }
    },
    
    // NEW: Specific PDF file reading method using IPC
    readPdfFile: (filePath) => {
      console.log('Requesting PDF file read via IPC:', filePath);
      return ipcRenderer.invoke('read-pdf-file', filePath);
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
    closeWindow: () => ipcRenderer.send('close-window'),
    isWindowMaximized: () => ipcRenderer.invoke('is-window-maximized'),
    
    // Auto-update functionality
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    
    // IPC Renderer access
    ipcRenderer: {
      // Expose a limited set of ipcRenderer functionality
      send: (channel, ...args) => {
        // Whitelist channels that are allowed
        const validChannels = [
          'splash-screen-complete',
          'minimize-window',
          'maximize-window',
          'close-window'
        ];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
        }
      }
    }
  }
);

// Log when preload script has completed
console.log('Preload script completed - Electron APIs exposed');