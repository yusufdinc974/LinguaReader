import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import usePDFNavigation from '../../hooks/usePDFNavigation';
import PDFContext from '../../contexts/PDFContext';

/**
 * PDF Controls Component
 * Provides navigation controls for the PDF viewer
 */
const PDFControls = () => {
  const {
    currentPage,
    totalPages,
    canNavigate,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    zoomIn,
    zoomOut,
    resetZoom
  } = usePDFNavigation();

  const { scale, zoomInProgress } = useContext(PDFContext);

  const [pageInputValue, setPageInputValue] = useState(currentPage.toString());
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Update page input when current page changes
  React.useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  // Handle page input change
  const handlePageInputChange = (e) => {
    // Allow only numeric input
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPageInputValue(value);
  };

  // Handle page input submission
  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(pageInputValue, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
    } else {
      // Reset to current page if invalid
      setPageInputValue(currentPage.toString());
    }
    setIsInputFocused(false);
  };

  // Handle zoom in button click
  const handleZoomIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!zoomInProgress) {
      zoomIn();
    }
  };

  // Handle zoom out button click
  const handleZoomOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!zoomInProgress) {
      zoomOut();
    }
  };

  // Handle reset zoom button click
  const handleResetZoom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!zoomInProgress) {
      resetZoom();
    }
  };

  // Format scale as percentage
  const formatScale = (scale) => {
    return `${Math.round(scale * 100)}%`;
  };

  // Button animation variants
  const buttonVariants = {
    hover: { 
      scale: 1.05,
      backgroundColor: 'rgba(74, 105, 189, 0.9)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    },
    tap: { 
      scale: 0.95,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    disabled: {
      opacity: 0.5,
      scale: 1,
      backgroundColor: 'rgba(74, 105, 189, 0.3)',
    }
  };

  // Common button styles
  const buttonStyle = {
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    margin: '0 4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  };

  // Secondary button style
  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: 'rgba(74, 105, 189, 0.1)',
    color: 'var(--primary-color)',
    border: '1px solid rgba(74, 105, 189, 0.3)',
  };

  // Button loading animation
  const loadingAnimation = {
    opacity: 0.7,
    scale: 0.98
  };

  return (
    <motion.div
      className="pdf-controls"
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
        zIndex: 50,
        borderRadius: '12px 12px 0 0',
      }}
    >
      {/* Navigation Controls */}
      <div className="navigation-controls" style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginRight: '20px',
        backgroundColor: 'rgba(74, 105, 189, 0.05)',
        padding: '4px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <motion.button
          aria-label="First Page"
          variants={buttonVariants}
          whileHover={canNavigate.previous ? "hover" : "disabled"}
          whileTap={canNavigate.previous ? "tap" : "disabled"}
          animate={canNavigate.previous ? {} : "disabled"}
          onClick={goToFirstPage}
          disabled={!canNavigate.previous}
          style={buttonStyle}
        >
          ⟪
        </motion.button>
        
        <motion.button
          aria-label="Previous Page"
          variants={buttonVariants}
          whileHover={canNavigate.previous ? "hover" : "disabled"}
          whileTap={canNavigate.previous ? "tap" : "disabled"}
          animate={canNavigate.previous ? {} : "disabled"}
          onClick={prevPage}
          disabled={!canNavigate.previous}
          style={buttonStyle}
        >
          ←
        </motion.button>
        
        <form onSubmit={handlePageInputSubmit} style={{ margin: '0 8px' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            padding: '0 8px',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: isInputFocused ? '0 0 0 2px rgba(74, 105, 189, 0.3)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setIsInputFocused(false);
                setPageInputValue(currentPage.toString());
              }}
              style={{
                width: '40px',
                textAlign: 'center',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 4px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'transparent',
                fontWeight: 'var(--font-weight-medium)',
              }}
              aria-label="Page number"
            />
            <span style={{ 
              margin: '0 8px', 
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 'var(--font-weight-medium)',
            }}>
              of {totalPages}
            </span>
          </div>
        </form>
        
        <motion.button
          aria-label="Next Page"
          variants={buttonVariants}
          whileHover={canNavigate.next ? "hover" : "disabled"}
          whileTap={canNavigate.next ? "tap" : "disabled"}
          animate={canNavigate.next ? {} : "disabled"}
          onClick={nextPage}
          disabled={!canNavigate.next}
          style={buttonStyle}
        >
          →
        </motion.button>
        
        <motion.button
          aria-label="Last Page"
          variants={buttonVariants}
          whileHover={canNavigate.next ? "hover" : "disabled"}
          whileTap={canNavigate.next ? "tap" : "disabled"}
          animate={canNavigate.next ? {} : "disabled"}
          onClick={goToLastPage}
          disabled={!canNavigate.next}
          style={buttonStyle}
        >
          ⟫
        </motion.button>
      </div>
      
      {/* Zoom Controls */}
      <div className="zoom-controls" style={{ 
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(74, 105, 189, 0.05)',
        padding: '4px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <motion.button
          aria-label="Zoom Out"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          animate={zoomInProgress ? loadingAnimation : {}}
          onClick={handleZoomOut}
          disabled={zoomInProgress}
          style={secondaryButtonStyle}
        >
          −
        </motion.button>
        
        <motion.button
          aria-label="Reset Zoom"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          animate={zoomInProgress ? loadingAnimation : {}}
          onClick={handleResetZoom}
          disabled={zoomInProgress}
          style={{
            ...secondaryButtonStyle,
            fontSize: '12px',
            minWidth: '60px',
            backgroundColor: 'white',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {formatScale(scale)}
        </motion.button>
        
        <motion.button
          aria-label="Zoom In"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          animate={zoomInProgress ? loadingAnimation : {}}
          onClick={handleZoomIn}
          disabled={zoomInProgress}
          style={secondaryButtonStyle}
        >
          +
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PDFControls;