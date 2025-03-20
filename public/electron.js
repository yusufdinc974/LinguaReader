const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Keep a global reference of the window object to avoid
// the window being closed automatically when the JavaScript object is garbage collected
let mainWindow;

function createWindow() {
  // Create the browser window with specific configurations
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Fix: Use absolute path for preload script
      preload: path.join(__dirname, 'preload.js'),
      // Enable sandbox for security but allow preload script to use Node.js modules
      sandbox: false
    },
    show: false, // Don't show until ready-to-show
    backgroundColor: '#ffffff' // Set background color to prevent white flash on load
  });

  // Determine the URL to load
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    // In development, load from development server
    mainWindow.loadURL('http://localhost:3000');
    console.log('Loading from development server at http://localhost:3000');
    
    // Display the path to the preload script for debugging
    console.log('Preload script path:', path.join(__dirname, 'preload.js'));
    
    // Check if preload script exists
    try {
      fs.accessSync(path.join(__dirname, 'preload.js'), fs.constants.R_OK);
      console.log('Preload script exists and is readable');
    } catch (err) {
      console.error('Error accessing preload script:', err);
    }
  } else {
    // In production, load from build directory
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    console.log('Loading from production build');
  }

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window being closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Create window when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Recreate window in the app when dock icon is clicked and no windows are open (macOS)
app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Handle PDF file selection dialog
ipcMain.handle('select-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      // Read file stats (for size, etc.)
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return { error: 'Could not read file information' };
    }
  }
  return { canceled: true };
});

// Make app global for IPC handlers
global.mainWindow = mainWindow;

// Load additional IPC handlers from separate file
try {
  require(path.join(__dirname, '../electron/ipc-handlers'))(ipcMain, mainWindow);
} catch (e) {
  console.log('No additional IPC handlers loaded:', e.message);
}