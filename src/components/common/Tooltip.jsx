import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Tooltip Component
 * Displays a tooltip when hovering over children elements
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The element that triggers the tooltip
 * @param {string} props.content - Tooltip content
 * @param {string} [props.position='top'] - Tooltip position (top, bottom, left, right)
 * @param {number} [props.delay=300] - Delay before showing tooltip (ms)
 * @param {string} [props.background='#2d3748'] - Background color
 * @param {string} [props.textColor='white'] - Text color
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 300,
  background = '#2d3748',
  textColor = 'white',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);

  // Handle positioning of the tooltip
  const updateTooltipPosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.bottom + 8;
        break;
      case 'left':
        x = targetRect.left - tooltipRect.width - 8;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = targetRect.right + 8;
        y = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      default:
        x = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        y = targetRect.top - tooltipRect.height - 8;
    }

    // Ensure tooltip stays within viewport
    const padding = 10;
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setTooltipPosition({ x, y });
  };

  // Show tooltip after delay
  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(updateTooltipPosition, 0);
    }, delay);
  };

  // Hide tooltip and clear timer
  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      updateTooltipPosition();
      // Also update on resize and scroll
      window.addEventListener('resize', updateTooltipPosition);
      window.addEventListener('scroll', updateTooltipPosition);
    }

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
    };
  }, [isVisible]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Get arrow styling based on position
  const getArrowStyle = () => {
    const baseStyle = {
      position: 'absolute',
      width: 0,
      height: 0,
      border: '6px solid transparent',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderTopColor: background,
          borderBottom: 'none',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderBottomColor: background,
          borderTop: 'none',
        };
      case 'left':
        return {
          ...baseStyle,
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderLeftColor: background,
          borderRight: 'none',
        };
      case 'right':
        return {
          ...baseStyle,
          left: '-12px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderRightColor: background,
          borderLeft: 'none',
        };
      default:
        return {};
    }
  };

  // Animation variants
  const variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <>
      {/* Target element that triggers the tooltip */}
      <div
        ref={targetRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: tooltipPosition.y,
              left: tooltipPosition.x,
              zIndex: 'var(--z-index-tooltip)',
              backgroundColor: background,
              color: textColor,
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              maxWidth: '300px',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
            }}
          >
            {content}
            <div style={getArrowStyle()} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Tooltip;