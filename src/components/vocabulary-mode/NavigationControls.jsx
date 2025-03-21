import React from 'react';
import { motion } from 'framer-motion';

/**
 * NavigationControls - Controls for navigating pages in vocabulary mode
 * 
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Function to call when page changes
 * @param {Function} props.onSwitchToPdfView - Function to switch to PDF view mode
 */
const NavigationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  onSwitchToPdfView
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
      
      {/* Switch to PDF View Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSwitchToPdfView}
        style={{
          marginLeft: '16px',
          backgroundColor: 'var(--secondary-color)',
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
        <span style={{ fontSize: '1rem' }}>📄</span>
        <span>Switch to PDF View</span>
      </motion.button>
    </motion.div>
  );
};

export default NavigationControls;