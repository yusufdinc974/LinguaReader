import React from 'react';
import { motion } from 'framer-motion';

/**
 * NavigationControls - Controls for navigating pages in vocabulary mode
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Function to call when page changes
 * @param {Function} props.onViewModeChange - Function to change view mode (replaces onSwitchToPdfView)
 * @param {string} props.currentViewMode - Current view mode
 */
const NavigationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  onViewModeChange,
  currentViewMode = 'text'
}) => {
  // Go to previous page
  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  // Go to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  // Go to first page
  const goToFirstPage = () => {
    onPageChange(1);
  };
  
  // Go to last page
  const goToLastPage = () => {
    onPageChange(totalPages);
  };
  
  // Handle page input change
  const handlePageInputChange = (e) => {
    const pageNum = parseInt(e.target.value);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
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
  
  // Determine the next view mode in the cycle: text → PDF → split → text
  const getNextMode = () => {
    switch(currentViewMode) {
      case 'text': return 'pdf';
      case 'pdf': return 'split';
      case 'split': return 'text';
      default: return 'text';
    }
  };
  
  // Handle view mode switch
  const handleViewModeChange = () => {
    if (onViewModeChange) {
      onViewModeChange(getNextMode());
    }
  };
  
  return (
    <motion.div
      className="navigation-controls"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        backgroundColor: 'white',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.05)',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        borderRadius: '12px 12px 0 0'
      }}
    >
      <div style={{ 
        display: 'flex',
        alignItems: 'center', 
        padding: '4px',
        backgroundColor: 'rgba(74, 105, 189, 0.05)',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* First Page Button */}
        <button
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          aria-label="First Page"
          style={{
            backgroundColor: currentPage === 1 ? 'rgba(74, 105, 189, 0.3)' : 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            margin: '0 4px',
            opacity: currentPage === 1 ? 0.6 : 1
          }}
        >
          ⟪
        </button>
        
        {/* Previous Page Button */}
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 1}
          aria-label="Previous Page"
          style={{
            backgroundColor: currentPage === 1 ? 'rgba(74, 105, 189, 0.3)' : 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '1.2rem',
            margin: '0 4px',
            opacity: currentPage === 1 ? 0.6 : 1
          }}
        >
          ←
        </button>
        
        {/* Page Information */}
        <div style={{ 
          margin: '0 16px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'white',
          padding: '0 8px',
          borderRadius: 'var(--radius-md)'
        }}>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handlePageInputChange}
            style={{
              width: '40px',
              textAlign: 'center',
              border: 'none',
              fontSize: '0.9rem',
              padding: '4px',
              backgroundColor: 'transparent'
            }}
          />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            of {totalPages}
          </span>
        </div>
        
        {/* Next Page Button */}
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          aria-label="Next Page"
          style={{
            backgroundColor: currentPage === totalPages ? 'rgba(74, 105, 189, 0.3)' : 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '1.2rem',
            margin: '0 4px',
            opacity: currentPage === totalPages ? 0.6 : 1
          }}
        >
          →
        </button>
        
        {/* Last Page Button */}
        <button
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          aria-label="Last Page"
          style={{
            backgroundColor: currentPage === totalPages ? 'rgba(74, 105, 189, 0.3)' : 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            margin: '0 4px',
            opacity: currentPage === totalPages ? 0.6 : 1
          }}
        >
          ⟫
        </button>
      </div>
      
      {/* View Mode Switch Button (updated from PDF View Button) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleViewModeChange}
        style={{
          marginLeft: '16px',
          backgroundColor: getButtonColor(),
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span style={{ fontSize: '1rem' }}>{getButtonIcon()}</span>
        <span>{getButtonText()}</span>
      </motion.button>
    </motion.div>
  );
};

export default NavigationControls;