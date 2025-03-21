import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

/**
 * Modal Component
 * Reusable modal dialog with animations
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Function to close the modal
 * @param {string} [props.title] - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} [props.size='md'] - Modal size (sm, md, lg)
 * @param {boolean} [props.closeOnOutsideClick=true] - Whether clicking outside closes the modal
 * @param {boolean} [props.showCloseButton=true] - Whether to show the close button
 * @param {React.ReactNode} [props.footer] - Custom footer content
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOutsideClick = true,
  showCloseButton = true,
  footer,
  ...rest
}) => {
  // Handle escape key press to close the modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    // Prevent body scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      // Restore body scrolling when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget && closeOnOutsideClick) {
      onClose();
    }
  };

  // Calculate modal width based on size
  const getModalWidth = () => {
    switch (size) {
      case 'sm':
        return '400px';
      case 'lg':
        return '800px';
      case 'md':
      default:
        return '600px';
    }
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', damping: 25, stiffness: 350 }
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 'var(--z-index-modal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
          }}
          {...rest}
        >
          <motion.div
            key="modal"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: getModalWidth(),
              maxWidth: '90%',
              maxHeight: '90vh',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            {(title || showCloseButton) && (
              <div
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {title && <h3 style={{ margin: 0 }}>{title}</h3>}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-circle)',
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '1.5rem',
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Modal Content */}
            <div
              style={{
                padding: 'var(--space-lg)',
                overflowY: 'auto',
                flexGrow: 1,
              }}
            >
              {children}
            </div>

            {/* Modal Footer */}
            {footer && (
              <div
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 'var(--space-md)',
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Confirmation Modal
 * Specialized modal for confirmation dialogs
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isDestructive = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'error' : confirmVariant} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: 0 }}>{message}</p>
    </Modal>
  );
};

export default Modal;