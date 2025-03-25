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

  return (
    <div className="update-checker">
      <div className="version-info">
        {appVersion && <div>Current Version: {appVersion}</div>}
      </div>
      
      <button 
        className="update-button"
        onClick={checkForUpdates} 
        disabled={checking}
      >
        {checking ? "Checking for updates..." : "Check for Updates"}
      </button>
      
      {message && (
        <div className={`update-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <style jsx>{`
        .update-checker {
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 0.5rem;
          background-color: #f5f5f5;
          max-width: 400px;
        }

        .version-info {
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
          color: #666;
        }

        .update-button {
          padding: 0.5rem 1rem;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .update-button:hover {
          background-color: #2980b9;
        }

        .update-button:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }

        .update-message {
          margin-top: 0.75rem;
          padding: 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.9rem;
        }

        .update-message.info {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .update-message.warning {
          background-color: #fff3cd;
          color: #856404;
        }

        .update-message.error {
          background-color: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};

export default UpdateChecker;