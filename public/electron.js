const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging for auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

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
    log.info('Loading from development server at http://localhost:3000');
    
    // Display the path to the preload script for debugging
    log.info('Preload script path:', path.join(__dirname, 'preload.js'));
    
    // Check if preload script exists
    try {
      fs.accessSync(path.join(__dirname, 'preload.js'), fs.constants.R_OK);
      log.info('Preload script exists and is readable');
    } catch (err) {
      log.error('Error accessing preload script:', err);
    }
  } else {
    // In production, load from build directory
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    log.info('Loading from production build');
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
app.whenReady().then(() => {
  createWindow();
  
  // Check for updates after app is ready (only in production)
  if (app.isPackaged) {
    log.info('Checking for updates...');
    // Wait a bit before checking for updates to ensure app is fully loaded
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Recreate window in the app when dock icon is clicked and no windows are open (macOS)
app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// ====== Auto-updater event handlers ======

// When an update is available
autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) of VocabularyPDFReader is available.`,
    detail: 'The update will be downloaded in the background.',
    buttons: ['OK']
  });
});

// When an update has been downloaded
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `Version ${info.version} has been downloaded and is ready to install.`,
    detail: 'The application will restart to install the update.',
    buttons: ['Restart Now', 'Later']
  }).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

// When there's an error with the update
autoUpdater.on('error', (err) => {
  log.error('Update error:', err);
  dialog.showMessageBox({
    type: 'error',
    title: 'Update Error',
    message: 'An error occurred while checking for updates.',
    detail: err.toString()
  });
});

// When checking for updates
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});

// When no update is available
autoUpdater.on('update-not-available', (info) => {
  log.info('No update available:', info);
});

// ====== IPC Handlers ======

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
      log.error('Error reading file:', error);
      return { error: 'Could not read file information' };
    }
  }
  return { canceled: true };
});

// Add IPC handler for manual update check
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    return { success: false, message: 'Updates are only available in production builds' };
  }
  
  try {
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    log.error('Manual update check failed:', error);
    return { success: false, message: error.toString() };
  }
});

// Make app global for IPC handlers
global.mainWindow = mainWindow;

// Load additional IPC handlers from separate file
try {
  require(path.join(__dirname, '../electron/ipc-handlers'))(ipcMain, mainWindow);
} catch (e) {
  log.warn('No additional IPC handlers loaded:', e.message);
}