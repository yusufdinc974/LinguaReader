import React from 'react';
import { motion } from 'framer-motion';

/**
 * Button Component
 * Reusable button with different variants and animations
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, outline, text)
 * @param {string} [props.size='md'] - Button size (sm, md, lg)
 * @param {boolean} [props.fullWidth=false] - Whether the button should take full width
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.loading=false] - Whether the button is in loading state
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.className] - Additional CSS classes
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  ...rest
}) => {
  // Define button styles based on variant
  const getButtonStyles = () => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 'var(--radius-md)',
      fontWeight: 'var(--font-weight-semibold)',
      transition: 'all 0.2s ease',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.6 : 1,
      letterSpacing: '0.01em',
      position: 'relative',
      overflow: 'hidden',
    };

    // Size variations
    const sizeStyles = {
      sm: {
        padding: '0.4rem 0.8rem',
        fontSize: 'var(--font-size-sm)',
        height: '32px',
      },
      md: {
        padding: '0.6rem 1.2rem',
        fontSize: 'var(--font-size-md)',
        height: '40px',
      },
      lg: {
        padding: '0.8rem 1.8rem',
        fontSize: 'var(--font-size-lg)',
        height: '48px',
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: 'var(--primary-color)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: 'var(--shadow-sm), 0 2px 0 rgba(0, 0, 0, 0.1)',
      },
      secondary: {
        backgroundColor: 'var(--secondary-color)',
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: 'var(--shadow-sm), 0 2px 0 rgba(0, 0, 0, 0.1)',
      },
      outline: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid var(--primary-color)',
        color: 'var(--primary-color)',
        boxShadow: 'var(--shadow-sm)',
      },
      text: {
        backgroundColor: 'transparent',
        color: 'var(--primary-color)',
        padding: sizeStyles[size].padding.split(' ')[0] + ' 0',
        border: 'none',
        boxShadow: 'none',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  // Animation variants
  const buttonVariants = {
    hover: {
      scale: disabled ? 1 : 1.03,
      boxShadow: variant !== 'text' ? 'var(--shadow-md), 0 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
      backgroundColor:
        variant === 'primary'
          ? 'var(--primary-dark)'
          : variant === 'secondary'
          ? 'var(--secondary-dark)'
          : variant === 'outline'
          ? 'rgba(74, 105, 189, 0.1)'
          : undefined,
      y: variant !== 'text' ? -1 : 0,
    },
    tap: {
      scale: disabled ? 1 : 0.97,
      boxShadow: variant !== 'text' ? 'var(--shadow-sm), 0 1px 0 rgba(0, 0, 0, 0.1)' : 'none',
      y: variant !== 'text' ? 1 : 0,
    },
  };

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      style={getButtonStyles()}
      whileHover={disabled ? {} : 'hover'}
      whileTap={disabled ? {} : 'tap'}
      variants={buttonVariants}
      disabled={disabled || loading}
      className={className}
      {...rest}
    >
      {/* Button content with loading indicator if needed */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{
              width: '1em',
              height: '1em',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: 'white',
              marginRight: '0.5rem',
            }}
          />
          Loading...
        </div>
      ) : (
        <>
          {/* Background shine effect for primary and secondary buttons */}
          {(variant === 'primary' || variant === 'secondary') && !disabled && (
            <motion.div
              initial={{ x: '-100%', opacity: 0.7 }}
              animate={{ 
                x: ['100%', '200%'],
                opacity: [0, 0.3, 0]
              }}
              transition={{ 
                repeat: Infinity,
                repeatType: 'loop',
                duration: 2,
                ease: 'easeInOut',
                repeatDelay: 5
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                zIndex: 0,
              }}
            />
          )}
          
          {/* Button content */}
          <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {children}
          </span>
        </>
      )}
    </motion.button>
  );
};

export default Button;