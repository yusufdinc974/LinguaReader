import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * WindowControls - Custom window control buttons for Electron application
 * Includes minimize, maximize/restore, and close buttons
 */
const WindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check window state when it changes
  useEffect(() => {
    console.log('WindowControls component initialized');
    
    const checkMaximized = async () => {
      if (window.electron?.isWindowMaximized) {
        try {
          const maximized = await window.electron.isWindowMaximized();
          setIsMaximized(maximized);
        } catch (error) {
          console.error('Error checking window state:', error);
        }
      }
    };

    // Check initial state
    checkMaximized();

    // Add event listener for resize to detect maximize/restore
    window.addEventListener('resize', checkMaximized);
    
    return () => {
      window.removeEventListener('resize', checkMaximized);
    };
  }, []);

  // Handle window controls
  const handleMinimize = () => {
    if (window.electron?.minimizeWindow) {
      console.log('Calling minimize window');
      window.electron.minimizeWindow();
    } else {
      console.error('Minimize window function not available');
    }
  };

  const handleMaximize = () => {
    if (window.electron?.maximizeWindow) {
      console.log('Calling maximize/restore window');
      window.electron.maximizeWindow();
      // State will be updated by the resize listener
    } else {
      console.error('Maximize window function not available');
    }
  };

  const handleClose = () => {
    if (window.electron?.closeWindow) {
      console.log('Calling close window');
      window.electron.closeWindow();
    } else {
      console.error('Close window function not available');
    }
  };

  return (
    <div className="window-controls">
      <motion.button 
        className="window-control minimize"
        onClick={handleMinimize}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
        whileTap={{ scale: 0.95 }}
        aria-label="Minimize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect width="10" height="1" x="1" y="5.5" fill="currentColor" />
        </svg>
      </motion.button>
      
      <motion.button 
        className="window-control maximize"
        onClick={handleMaximize}
        whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
        whileTap={{ scale: 0.95 }}
        aria-label={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3,1v2H1v8h8V9h2V1H3z M8,10H2V4h6V10z M10,8H9V3H4V2h6V8z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1,1v10h10V1H1z M10,10H2V2h8V10z" fill="currentColor" />
          </svg>
        )}
      </motion.button>
      
      <motion.button 
        className="window-control close"
        onClick={handleClose}
        whileHover={{ backgroundColor: '#e81123' }}
        whileTap={{ scale: 0.95 }}
        aria-label="Close"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M6.71 6l4.15-4.15a.5.5 0 1 0-.71-.7L6 5.29 1.85 1.15a.5.5 0 1 0-.7.7L5.29 6 1.15 10.15a.5.5 0 0 0 .7.7L6 6.71l4.15 4.14a.5.5 0 0 0 .7-.7L6.71 6z" fill="currentColor" />
        </svg>
      </motion.button>
    </div>
  );
};

export default WindowControls; 