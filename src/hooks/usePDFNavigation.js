import { useContext, useCallback, useEffect } from 'react';
import PDFContext from '../contexts/PDFContext';

/**
 * Custom hook for PDF navigation
 * Provides simple navigation controls and keyboard shortcuts
 */
const usePDFNavigation = () => {
  const { 
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom
  } = useContext(PDFContext);

  /**
   * Check if a navigation action is possible
   * @returns {Object} - Object containing boolean flags for possible actions
   */
  const canNavigate = useCallback(() => {
    return {
      previous: currentPage > 1,
      next: currentPage < totalPages,
    };
  }, [currentPage, totalPages]);

  /**
   * Jump to first page
   */
  const goToFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  /**
   * Jump to last page
   */
  const goToLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyboardNavigation = useCallback((event) => {
    // Check if the focus is on an input element
    const target = event.target;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable
    ) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        nextPage();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        prevPage();
        event.preventDefault();
        break;
      case 'Home':
        goToFirstPage();
        event.preventDefault();
        break;
      case 'End':
        goToLastPage();
        event.preventDefault();
        break;
      case '+':
      case '=':
        zoomIn();
        event.preventDefault();
        break;
      case '-':
        zoomOut();
        event.preventDefault();
        break;
      case '0':
        resetZoom();
        event.preventDefault();
        break;
      default:
        // Handle numeric keys for page jumping (1-9)
        if (/^[1-9]$/.test(event.key) && event.ctrlKey) {
          // Calculate the page to go to (e.g., Ctrl+1 goes to 10%, Ctrl+9 goes to 90%)
          const pagePercent = parseInt(event.key, 10) / 10;
          const targetPage = Math.max(1, Math.min(
            Math.round(totalPages * pagePercent), 
            totalPages
          ));
          goToPage(targetPage);
          event.preventDefault();
        }
        break;
    }
  }, [nextPage, prevPage, goToFirstPage, goToLastPage, goToPage, totalPages, zoomIn, zoomOut, resetZoom]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  return {
    currentPage,
    totalPages,
    canNavigate: canNavigate(),
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    zoomIn,
    zoomOut,
    resetZoom
  };
};

export default usePDFNavigation;