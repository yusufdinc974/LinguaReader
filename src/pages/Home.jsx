import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import PDFContext from '../contexts/PDFContext';
import { getPDFList } from '../services/storageService';

/**
 * Home Page Component
 * Landing page of the application
 */
const Home = ({ onNavigate }) => {
  const { loadPDF } = useContext(PDFContext);
  const recentPDFs = getPDFList().slice(0, 3); // Get up to 3 recent PDFs

  // Handle PDF selection
  const handleSelectPDF = async () => {
    if (window.electron) {
      try {
        const result = await window.electron.selectPdf();
        if (!result.canceled && !result.error) {
          await loadPDF(result.path);
          // Navigate to the reader page after loading the PDF
          onNavigate('reader');
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
      // Navigate to the reader page after loading the PDF
      onNavigate('reader');
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

  // Background decorative elements
  const decorativeElements = [
    { icon: '📘', x: '10%', y: '15%', size: '30px', rotation: -15, color: 'var(--primary-light)' },
    { icon: '📖', x: '85%', y: '20%', size: '40px', rotation: 10, color: 'var(--secondary-color)' },
    { icon: '🔍', x: '75%', y: '70%', size: '28px', rotation: -5, color: 'var(--accent-yellow)' },
    { icon: '📝', x: '15%', y: '75%', size: '32px', rotation: 15, color: 'var(--accent-coral)' },
    { icon: '📋', x: '92%', y: '40%', size: '36px', rotation: -12, color: 'var(--accent-purple)' },
    { icon: '💡', x: '5%', y: '45%', size: '34px', rotation: 8, color: 'var(--secondary-light)' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="home-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        background: 'linear-gradient(135deg, rgba(74, 105, 189, 0.05) 0%, rgba(29, 209, 161, 0.05) 100%)',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%234a69bd' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      }}
    >
      <div className="home-content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'var(--space-lg)',
      }}>
        {/* Decorative elements */}
        {decorativeElements.map((element, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0, rotate: element.rotation * 2 }}
            animate={{ 
              opacity: 0.7, 
              scale: 1, 
              rotate: element.rotation,
              y: [0, -10, 0],
            }}
            transition={{ 
              delay: index * 0.2 + 0.5,
              duration: 0.5,
              y: {
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: index * 0.3
              }
            }}
            style={{
              position: 'absolute',
              left: element.x,
              top: element.y,
              fontSize: element.size,
              color: element.color,
              zIndex: 0,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            }}
          >
            {element.icon}
          </motion.div>
        ))}

        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className="hero-section"
          style={{
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            padding: 'var(--space-xl)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Gradient background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(74, 105, 189, 0.1) 0%, rgba(29, 209, 161, 0.1) 100%)',
            zIndex: -1,
          }} />
          
          {/* Corner decorations */}
          <svg width="100" height="100" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.1 }}>
            <circle cx="0" cy="0" r="100" fill="var(--primary-color)" />
          </svg>
          <svg width="100" height="100" style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.1 }}>
            <circle cx="100" cy="100" r="100" fill="var(--secondary-color)" />
          </svg>
          
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
              display: 'inline-block',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
            }}
          >
            📚
          </motion.div>
          <h1 className="gradient-text" style={{ 
            fontSize: 'var(--font-size-4xl)', 
            marginBottom: 'var(--space-md)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
          }}>
            LinguaReader
          </h1>
          <p style={{ 
            fontSize: 'var(--font-size-xl)', 
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            margin: '0 auto',
            marginBottom: 'var(--space-xl)',
            lineHeight: 1.6,
          }}>
            Enhance your vocabulary while reading PDFs with this interactive reader. 
            Click on any word to see its definition and add it to your personal vocabulary list.
          </p>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="primary-cta"
            style={{
              display: 'inline-block',
              marginBottom: 'var(--space-lg)',
              position: 'relative',
            }}
          >
            {/* Pulsing background effect */}
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.2, 0.4],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatType: 'loop',
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--gradient-primary)',
                filter: 'blur(15px)',
                zIndex: -1,
              }}
            />
            <Button 
              size="lg" 
              onClick={handleSelectPDF}
              className="upload-pdf-btn"
              style={{
                padding: '1rem 2rem',
                fontSize: 'var(--font-size-lg)',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 'var(--font-weight-medium)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'var(--gradient-primary)', 
              }}
            >
              Upload a PDF
            </Button>
          </motion.div>
          
          {/* Key benefits */}
          <div className="key-benefits" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--space-lg)',
            flexWrap: 'wrap',
            marginTop: 'var(--space-md)',
          }}>
            {[
              { icon: '🔍', text: 'Lookup words instantly' },
              { icon: '🔄', text: 'Track progress over time' },
              { icon: '🌍', text: 'Multilingual support' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + idx * 0.2 }}
                className="benefit-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  color: 'var(--text-secondary)',
                  padding: 'var(--space-xs) var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          variants={itemVariants}
          className="features-section"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-xxl)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            {
              icon: '📝',
              title: 'Build Vocabulary',
              description: 'Click on any word to see its definition and add it to your vocabulary list.',
              color: 'rgba(74, 105, 189, 0.1)',
              borderColor: 'var(--primary-color)',
              iconBg: 'rgba(74, 105, 189, 0.2)',
            },
            {
              icon: '🔍',
              title: 'Word Recognition',
              description: 'Words are highlighted based on your familiarity rating across all documents.',
              color: 'rgba(29, 209, 161, 0.1)',
              borderColor: 'var(--secondary-color)',
              iconBg: 'rgba(29, 209, 161, 0.2)',
            },
            {
              icon: '🌍',
              title: 'Multi-language',
              description: 'English as base with Spanish translation support for bilingual reading.',
              color: 'rgba(255, 107, 107, 0.1)',
              borderColor: 'var(--accent-coral)',
              iconBg: 'rgba(255, 107, 107, 0.2)',
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card"
              whileHover={{
                y: -8, 
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              }}
              style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.3s ease',
                border: `1px solid ${feature.borderColor}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background pattern */}
              <svg width="120" height="120" style={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
                <circle cx="60" cy="60" r="60" fill={feature.borderColor} />
              </svg>
              
              <div className="feature-icon" style={{ 
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-circle)',
                backgroundColor: feature.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                marginBottom: 'var(--space-md)',
                position: 'relative',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }}>
                {feature.icon}
              </div>
              <h3 style={{ 
                marginBottom: 'var(--space-sm)',
                color: feature.borderColor,
                position: 'relative',
              }}>
                {feature.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', position: 'relative' }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works section */}
        <motion.div
          variants={itemVariants}
          className="how-it-works"
          style={{
            marginBottom: 'var(--space-xxl)',
            backgroundColor: 'white',
            padding: 'var(--space-xl)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h2 className="gradient-text" style={{ 
            marginBottom: 'var(--space-lg)',
            textAlign: 'center',
            display: 'inline-block',
          }}>
            How It Works
          </h2>
          
          <div className="steps-container" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--space-xl)',
            flexWrap: 'wrap',
          }}>
            {[
              { 
                number: 1, 
                title: 'Upload Your PDF',
                description: 'Select any PDF document you want to read and improve your vocabulary with.',
                icon: '📄', 
                color: 'var(--primary-color)'
              },
              { 
                number: 2, 
                title: 'Read & Click Words',
                description: 'As you read, click on any unfamiliar words to see their definitions.',
                icon: '👆', 
                color: 'var(--secondary-color)'
              },
              { 
                number: 3, 
                title: 'Build Your Vocabulary',
                description: 'Rate your familiarity with words and build your personalized vocabulary list.',
                icon: '📈', 
                color: 'var(--accent-coral)'
              },
            ].map((step, index) => (
              <div 
                key={index}
                className="step-item"
                style={{
                  flex: '1 1 250px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'relative',
                  marginBottom: 'var(--space-md)',
                }}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: 'var(--radius-circle)',
                    backgroundColor: 'white',
                    border: `2px solid ${step.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    position: 'relative',
                    zIndex: 2,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{
                    position: 'absolute',
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-circle)',
                    backgroundColor: step.color,
                    top: -5,
                    right: -5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'var(--font-weight-bold)',
                    fontSize: 'var(--font-size-sm)',
                    zIndex: 3,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  }}>
                    {step.number}
                  </div>
                </div>
                <h3 style={{ marginBottom: 'var(--space-sm)', color: step.color }}>
                  {step.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent PDFs Section */}
        {recentPDFs.length > 0 && (
          <motion.div 
            variants={itemVariants}
            className="recent-pdfs"
            style={{
              backgroundColor: 'white',
              padding: 'var(--space-xl)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              zIndex: 1,
              marginBottom: 'var(--space-xl)',
            }}
          >
            <h2 className="gradient-text" style={{ 
              marginBottom: 'var(--space-lg)',
              display: 'inline-block'
            }}>
              Recent Documents
            </h2>
            <div className="pdf-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--space-md)',
              }}
            >
              {recentPDFs.map((pdf) => (
              <motion.div
                key={pdf.id}
                className="pdf-card"
                whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLoadRecentPDF(pdf.path)}
              >
                {/* Background decoration */}
                <div className="corner-decoration"></div>
                
                <div className="pdf-info">
                  <div className="pdf-icon">📄</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 className="file-name">{pdf.fileName || 'Untitled PDF'}</h4>
                    <p className="file-date">Last opened: {formatDate(pdf.lastOpened)}</p>
                  </div>
                </div>
                
                <div className="pdf-meta">
                  <span className="page-count">{pdf.pageCount || '?'} pages</span>
                  <div onClick={(e) => {
                    e.stopPropagation(); 
                    handleLoadRecentPDF(pdf.path);
                  }}>
                    <button className="app-button open-button">Open</button>
                  </div>
                </div>
              </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Footer section */}
        <motion.div
          variants={itemVariants}
          className="footer"
          style={{
            textAlign: 'center',
            padding: 'var(--space-lg)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <p>
            LinguaReader — Expand your vocabulary while reading PDFs
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Home;