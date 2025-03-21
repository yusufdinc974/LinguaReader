import React from 'react';
import { motion } from 'framer-motion';

/**
 * ModeSwitchButton - Component for switching between PDF Reader and Vocabulary Mode
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSwitchMode - Function to call when switching modes
 * @param {string} props.currentMode - Current mode ('pdf' or 'vocabulary')
 */
const ModeSwitchButton = ({ onSwitchMode, currentMode = 'pdf' }) => {
  const isPdfMode = currentMode === 'pdf';
  
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
        onClick={onSwitchMode}
        className="app-button mode-switch-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: isPdfMode ? 'var(--secondary-color)' : 'var(--primary-color)',
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
          {isPdfMode ? '📚' : '📄'}
        </span>
        <span>
          {isPdfMode ? 'Switch to Vocabulary Mode' : 'Switch to PDF View'}
        </span>
      </motion.button>
    </motion.div>
  );
};

export default ModeSwitchButton;