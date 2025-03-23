import React from 'react';
import { motion } from 'framer-motion';

/**
 * ModeSwitchButton - Component for switching between text, PDF, and split view modes
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onViewModeChange - Function to call when changing view mode
 * @param {string} props.currentViewMode - Current view mode ('text', 'pdf', or 'split')
 */
const ModeSwitchButton = ({ onViewModeChange, currentViewMode = 'text' }) => {
  // Determine the next view mode in the cycle: text → PDF → split → text
  const getNextMode = () => {
    switch(currentViewMode) {
      case 'text': return 'pdf';
      case 'pdf': return 'split';
      case 'split': return 'text';
      default: return 'text';
    }
  };
  
  // Get button text based on current mode
  const getButtonText = () => {
    switch(currentViewMode) {
      case 'text': return 'Switch to PDF View';
      case 'pdf': return 'Switch to Split View';
      case 'split': return 'Switch to Text View';
      default: return 'Change View Mode';
    }
  };
  
  // Get button icon based on current mode
  const getButtonIcon = () => {
    switch(currentViewMode) {
      case 'text': return '📄';
      case 'pdf': return '⚡';
      case 'split': return '📝';
      default: return '🔄';
    }
  };
  
  // Get button color based on current mode
  const getButtonColor = () => {
    switch(currentViewMode) {
      case 'text': return 'var(--primary-color)';
      case 'pdf': return 'var(--secondary-color)';
      case 'split': return 'var(--accent-green)';
      default: return 'var(--primary-color)';
    }
  };
  
  const handleClick = () => {
    onViewModeChange(getNextMode());
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '80px',
        zIndex: 20
      }}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="app-button mode-switch-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: getButtonColor(),
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          cursor: 'pointer',
          fontWeight: 'var(--font-weight-medium)',
          boxShadow: 'var(--shadow-lg)',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>
          {getButtonIcon()}
        </span>
        <span>
          {getButtonText()}
        </span>
      </motion.button>
    </motion.div>
  );
};

export default ModeSwitchButton;