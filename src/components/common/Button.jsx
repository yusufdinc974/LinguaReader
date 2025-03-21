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
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  ...rest
}) => {
  // Define button styles based on variant
  const getButtonStyles = () => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      fontWeight: 'var(--font-weight-medium)',
      transition: 'all var(--animation-fast)',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.6 : 1,
    };

    // Size variations
    const sizeStyles = {
      sm: {
        padding: '0.375rem 0.75rem',
        fontSize: 'var(--font-size-sm)',
      },
      md: {
        padding: '0.5rem 1rem',
        fontSize: 'var(--font-size-md)',
      },
      lg: {
        padding: '0.75rem 1.5rem',
        fontSize: 'var(--font-size-lg)',
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: 'var(--primary-color)',
        color: 'white',
      },
      secondary: {
        backgroundColor: 'var(--secondary-color)',
        color: 'white',
      },
      outline: {
        backgroundColor: 'transparent',
        border: '1px solid var(--primary-color)',
        color: 'var(--primary-color)',
      },
      text: {
        backgroundColor: 'transparent',
        color: 'var(--primary-color)',
        padding: sizeStyles[size].padding.split(' ')[0] + ' 0',
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
      backgroundColor:
        variant === 'primary'
          ? 'var(--primary-dark)'
          : variant === 'secondary'
          ? 'var(--secondary-dark)'
          : undefined,
    },
    tap: {
      scale: disabled ? 1 : 0.97,
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
      {...rest}
    >
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
        children
      )}
    </motion.button>
  );
};

export default Button;