import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../common/Button';
import Tooltip from '../common/Tooltip';
import PDFContext from '../../contexts/PDFContext';

/**
 * AppHeader Component
 * Main application header with navigation and actions
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.showSidebar - Whether the sidebar is visible
 * @param {Function} props.toggleSidebar - Function to toggle sidebar visibility
 * @param {Function} props.handleNewPdfClick - Function to handle uploading a new PDF
 * @param {string} props.currentPage - The current active page (optional)
 * @param {Function} props.onNavigate - Function to navigate between pages (optional)
 */
const AppHeader = ({ 
  showSidebar, 
  toggleSidebar, 
  handleNewPdfClick,
  currentPage,
  onNavigate
}) => {
  const { pdfDocument } = useContext(PDFContext);
  // Default to vocabulary-mode if no external current page is provided
  const [activeTab, setActiveTab] = useState(currentPage || 'vocabulary-mode');

  // Header tabs configuration - updated to match our new structure
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'vocabulary-mode', label: 'PDF Reader', icon: '📄' },
    { id: 'vocabulary', label: 'Word List', icon: '📋' },
  ];

  // Handle tab click
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    // If onNavigate is provided, use it to navigate to the selected page
    if (onNavigate) {
      onNavigate(tabId);
    }
  };

  // Update activeTab when currentPage changes (if provided)
  if (currentPage && currentPage !== activeTab) {
    setActiveTab(currentPage);
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: '0.75rem 1.25rem',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10,
      }}
    >
      {/* Logo and App Name */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <motion.div
          whileHover={{ rotate: 5 }}
          style={{
            fontSize: '1.75rem',
            marginRight: '0.75rem',
          }}
        >
          📖
        </motion.div>
        <h1
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 600,
            background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          LinguaReader
        </h1>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTabClick(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: activeTab === tab.id ? 'rgba(74, 105, 189, 0.1)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 500 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span className="tab-label" style={{ '@media (max-width: 768px)': { display: 'none' } }}>
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {pdfDocument && (
          <Tooltip content="Upload a new PDF">
            <Button size="sm" onClick={handleNewPdfClick}>
              New PDF
            </Button>
          </Tooltip>
        )}
        
        <Tooltip content={showSidebar ? "Hide Library" : "Show Library"}>
        <button 
          className="app-button library-toggle"
          onClick={toggleSidebar}
        >
          <span className="btn-with-icon">
            <span className="icon">📚</span>
            <span>{showSidebar ? 'Hide Library' : 'Show Library'}</span>
          </span>
        </button>
        </Tooltip>

        <Tooltip content="Settings">
          <motion.button
            whileHover={{ rotate: 15 }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-circle)',
              width: '2.5rem',
              height: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
            }}
          >
            ⚙️
          </motion.button>
        </Tooltip>
      </div>
    </motion.header>
  );
};

export default AppHeader;