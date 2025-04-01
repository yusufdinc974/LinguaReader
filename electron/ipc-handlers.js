/**
 * IPC Handlers for Electron Main Process
 * This file contains all the custom IPC handlers for communication
 * between the main process and renderer process
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { autoUpdater } = require('electron');

/**
 * Register all IPC handlers
 * @param {Object} ipcMain - The Electron ipcMain module
 * @param {BrowserWindow} mainWindow - The main application window
 */
module.exports = function registerIpcHandlers(ipcMain, mainWindow) {
  // Get application version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Window control handlers
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  // Check if window is maximized
  ipcMain.handle('is-window-maximized', () => {
    if (mainWindow) {
      return mainWindow.isMaximized();
    }
    return false;
  });

  // Handle update checking
  ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
      return { success: false, message: 'Updates are only available in production builds' };
    }
    
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('Manual update check failed:', error);
      return { success: false, message: error.toString() };
    }
  });

  // Create user data directory if it doesn't exist
  const userDataPath = app.getPath('userData');
  const vocabStoragePath = path.join(userDataPath, 'vocabulary');
  
  try {
    if (!fs.existsSync(vocabStoragePath)) {
      fs.mkdirSync(vocabStoragePath, { recursive: true });
      console.log('Created vocabulary storage directory');
    }
  } catch (error) {
    console.error('Error creating vocabulary storage directory:', error);
  }

  // Handle PDF file reading (basic implementation)
  ipcMain.handle('read-pdf-info', async (event, filePath) => {
    try {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error('Error reading PDF info:', error);
      return { error: error.message };
    }
  });

  // ADDED: Enhanced PDF reading with detailed logging and error handling
  ipcMain.handle('read-pdf-data', async (event, filePath) => {
    try {
      console.log('IPC Handler: Reading PDF file data:', filePath);
      
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        console.error('IPC Handler: PDF file does not exist:', filePath);
        return { error: 'File does not exist', path: filePath };
      }
      
      // Get file stats for metadata
      const stats = fs.statSync(filePath);
      
      // Read the actual file data
      const data = await fs.promises.readFile(filePath);
      console.log('IPC Handler: Successfully read PDF file, size:', data.length);
      
      return {
        data: data,
        name: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error('IPC Handler: Error reading PDF data:', error);
      return { error: error.message };
    }
  });

  console.log('IPC handlers registered successfully');
};