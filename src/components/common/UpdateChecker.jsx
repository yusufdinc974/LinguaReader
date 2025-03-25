import React, { useState, useEffect } from 'react';

/**
 * UpdateChecker component provides a UI for checking for application updates
 * 
 * This component can be placed in your settings page or as a dropdown in your app header
 */
const UpdateChecker = () => {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [appVersion, setAppVersion] = useState(null);

  // Get app version on component mount
  useEffect(() => {
    const getVersion = async () => {
      if (window.electron?.getAppVersion) {
        try {
          const version = await window.electron.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.error('Failed to get app version:', error);
        }
      }
    };
    
    getVersion();
  }, []);

  const checkForUpdates = async () => {
    // Only proceed if the electron API is available
    if (!window.electron?.checkForUpdates) {
      setMessage({ 
        type: 'error', 
        text: 'Update checking is not available in this environment.' 
      });
      return;
    }
    
    setChecking(true);
    setMessage(null);
    
    try {
      const result = await window.electron.checkForUpdates();
      if (result.success) {
        setMessage({ 
          type: 'info', 
          text: 'Checking for updates. You will be notified if an update is available.' 
        });
      } else {
        setMessage({ 
          type: 'warning', 
          text: `Update check failed: ${result.message || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to check for updates: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setChecking(false);
    }
  };

  const styles = {
    container: {
      position: 'relative',
      zIndex: 1000, // Ensure it appears above other components
    },
    updateChecker: {
      padding: '1.25rem',
      margin: '1rem 0',
      borderRadius: '0.75rem',
      backgroundColor: '#f8f9fa',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
      maxWidth: '420px',
      border: '1px solid #e9ecef',
      position: 'relative',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    },
    versionInfo: {
      marginBottom: '0.75rem',
      fontSize: '0.95rem',
      color: '#495057',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center'
    },
    versionLabel: {
      backgroundColor: '#e9ecef',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      marginRight: '0.5rem',
      fontSize: '0.8rem',
      color: '#495057'
    },
    updateButton: {
      padding: '0.6rem 1.2rem',
      backgroundColor: checking ? '#adb5bd' : '#4263eb',
      color: 'white',
      border: 'none',
      borderRadius: '0.4rem',
      cursor: checking ? 'not-allowed' : 'pointer',
      fontWeight: 600,
      transition: 'all 0.2s ease',
      boxShadow: checking ? 'none' : '0 2px 4px rgba(66, 99, 235, 0.3)',
      width: '100%'
    },
    updateMessage: {
      marginTop: '0.75rem',
      padding: '0.75rem',
      borderRadius: '0.4rem',
      fontSize: '0.9rem',
      backgroundColor: message?.type === 'info' ? '#d0ebff' : 
                      message?.type === 'warning' ? '#fff9db' : 
                      message?.type === 'error' ? '#ffe3e3' : '',
      color: message?.type === 'info' ? '#1864ab' : 
             message?.type === 'warning' ? '#e67700' : 
             message?.type === 'error' ? '#c92a2a' : '',
      border: message?.type === 'info' ? '1px solid #a5d8ff' : 
              message?.type === 'warning' ? '1px solid #ffec99' : 
              message?.type === 'error' ? '1px solid #ffc9c9' : '',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.updateChecker}>
        <div style={styles.versionInfo}>
          {appVersion && (
            <>
              <span style={styles.versionLabel}>VERSION</span>
              <span>{appVersion}</span>
            </>
          )}
        </div>
        
        <button 
          style={styles.updateButton}
          onClick={checkForUpdates} 
          disabled={checking}
        >
          {checking ? "Checking for updates..." : "Check for Updates"}
        </button>
        
        {message && (
          <div style={styles.updateMessage}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;