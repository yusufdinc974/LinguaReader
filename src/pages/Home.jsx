import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import PDFContext from '../contexts/PDFContext';
import { getPDFList } from '../services/storageService';

/**
 * Home Page Component
 * Landing page of the application
 */
const Home = () => {
  const { loadPDF } = useContext(PDFContext);
  const recentPDFs = getPDFList().slice(0, 3); // Get up to 3 recent PDFs

  // Handle PDF selection
  const handleSelectPDF = async () => {
    if (window.electron) {
      try {
        const result = await window.electron.selectPdf();
        if (!result.canceled && !result.error) {
          await loadPDF(result.path);
        }
      } catch (error) {
        console.error('Error selecting PDF:', error);
      }
    }
  };

  // Handle loading a recent PDF
  const handleLoadRecentPDF = async (pdfPath) => {
    try {
      await loadPDF(pdfPath);
    } catch (error) {
      console.error('Error loading recent PDF:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 12 }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: 'var(--space-lg)',
        marginTop: 'var(--space-xl)',
      }}
    >
      {/* Hero Section */}
      <motion.div
        variants={itemVariants}
        style={{
          textAlign: 'center',
          marginBottom: 'var(--space-xxl)',
        }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            repeatType: 'loop',
            repeatDelay: 5
          }}
          style={{
            fontSize: '5rem',
            marginBottom: 'var(--space-md)',
            display: 'inline-block'
          }}
        >
          📚
        </motion.div>
        <h1 style={{ 
          fontSize: 'var(--font-size-4xl)', 
          marginBottom: 'var(--space-md)',
          background: 'linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          LinguaReader
        </h1>
        <p style={{ 
          fontSize: 'var(--font-size-xl)', 
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: 'var(--space-xl)'
        }}>
          Enhance your vocabulary while reading PDFs with this interactive reader
        </p>
        <Button size="lg" onClick={handleSelectPDF}>
          Upload a PDF
        </Button>
      </motion.div>

      {/* Features Section */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-xxl)',
        }}
      >
        {[
          {
            icon: '📝',
            title: 'Build Vocabulary',
            description: 'Click on any word to see its definition and add it to your vocabulary list.'
          },
          {
            icon: '🔍',
            title: 'Word Recognition',
            description: 'Words are highlighted based on your familiarity rating across all documents.'
          },
          {
            icon: '🌍',
            title: 'Multi-language',
            description: 'English as base with Spanish translation support for bilingual reading.'
          }
        ].map((feature, index) => (
          <motion.div
            key={index}
            whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>
              {feature.icon}
            </div>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>
              {feature.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent PDFs Section */}
      {recentPDFs.length > 0 && (
        <motion.div variants={itemVariants}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Recent Documents</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            {recentPDFs.map((pdf) => (
              <motion.div
                key={pdf.id}
                whileHover={{ y: -3, boxShadow: 'var(--shadow-lg)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLoadRecentPDF(pdf.path)}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  marginBottom: 'var(--space-sm)',
                }}>
                  <div style={{ 
                    fontSize: '2rem',
                    color: 'var(--primary-color)',
                  }}>
                    📄
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: 0,
                      fontSize: 'var(--font-size-md)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {pdf.fileName || 'Untitled PDF'}
                    </h4>
                    <p style={{ 
                      margin: 0,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-muted)',
                    }}>
                      Last opened: {formatDate(pdf.lastOpened)}
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}>
                  <span>{pdf.pageCount || '?'} pages</span>
                  <Button variant="text" size="sm">Open</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Home;