import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PDFList from '../pdf/PDFList';

/**
 * Sidebar Component
 * Side panel for displaying PDFs and other content
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether the sidebar is visible
 */
const Sidebar = ({ isVisible }) => {
  const [activeTab, setActiveTab] = useState('pdfs');
  
  // Sidebar tabs configuration
  const tabs = [
    { id: 'pdfs', label: 'PDF Library', icon: '📚' },
    { id: 'vocab', label: 'Vocabulary', icon: '📝' },
    { id: 'notes', label: 'Notes', icon: '📋' },
  ];

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pdfs':
        return <PDFList />;
      case 'vocab':
        return (
          <div style={{ padding: 'var(--space-md)' }}>
            <h3>Vocabulary Lists</h3>
            <p className="text-muted">
              Your saved vocabulary will appear here. Start by opening a PDF and clicking on words to save them.
            </p>
          </div>
        );
      case 'notes':
        return (
          <div style={{ padding: 'var(--space-md)' }}>
            <h3>Notes</h3>
            <p className="text-muted">
              Your notes will appear here. Add notes while reading to keep track of important information.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.aside
      initial={{ x: 320 }}
      animate={{
        x: isVisible ? 0 : 320,
        width: 320
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        backgroundColor: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        height: '100%',
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Sidebar tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
      }}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--surface)' : 'transparent',
              borderBottom: activeTab === tab.id 
                ? '2px solid var(--primary-color)' 
                : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
            <span style={{ fontSize: 'var(--font-size-sm)' }}>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Sidebar content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
      }}>
        {renderTabContent()}
      </div>
      
      {/* Sidebar footer */}
      <div style={{
        padding: 'var(--space-sm) var(--space-md)',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-muted)',
      }}>
        <span>LinguaReader</span>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          ❓
        </motion.button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;