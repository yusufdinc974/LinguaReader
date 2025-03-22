import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HighlightingControls from './HighlightingControls';

/**
 * SettingsPopup - Component for displaying application settings
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the popup is visible
 * @param {Function} props.onClose - Function to call when popup is closed
 * @param {Function} props.onHighlightingChange - Callback for highlighting changes
 */
const SettingsPopup = ({ isVisible, onClose, onHighlightingChange }) => {
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '15px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--primary-color)',
              color: 'white'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
              ⚙️ Settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                padding: 0
              }}
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div
            style={{
              padding: '20px',
              overflow: 'auto'
            }}
          >
            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Word Highlighting
              </h3>
              <HighlightingControls onHighlightingChange={onHighlightingChange} />
            </section>
            
            {/* Add additional settings sections here */}
            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Display Options
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '10px' }}>
                Additional display settings will be available in future updates.
              </div>
            </section>
          </div>
          
          {/* Footer */}
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--background)'
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsPopup;