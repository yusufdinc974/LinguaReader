import React, { useContext, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import PDFContext from '../contexts/PDFContext';
import { getPDFList } from '../services/storageService';
import useSpacedRepetition from '../hooks/useSpacedRepetition';

/**
 * Home Page Component
 * Landing page of the application
 */
const Home = ({ onNavigate }) => {
  const { loadPDF } = useContext(PDFContext);
  const recentPDFs = getPDFList().slice(0, 3); // Get up to 3 recent PDFs
  const spacedRepetition = useSpacedRepetition();
  const [streakInfo, setStreakInfo] = useState(null);

  // Load streak info only once when component mounts
  useEffect(() => {
    const info = spacedRepetition.getStreakInfo();
    setStreakInfo(info);
  }, []); // Empty dependency array - only run once on mount

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

  // Flame SVG component for streak
  const Flame = ({ color, isActive, isDarkMode }) => {
    return (
      <motion.div
        style={{
          position: 'relative',
          width: '28px',
          height: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <motion.svg
          width="28"
          height="40"
          viewBox="0 0 28 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: isActive 
              ? `drop-shadow(0 4px 6px ${isDarkMode ? 'rgba(255,100,0,0.4)' : 'rgba(255,120,50,0.3)'})`
              : 'none',
            position: 'relative',
            zIndex: 1,
          }}
          whileHover={{ scale: 1.1 }}
          animate={isActive ? { 
            y: [0, -2, 0],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut'
          }}
        >
          <motion.path 
            d="M14 0C14 0 17 6 17 11C17 13.761 14.761 16 12 16C9.239 16 7 13.761 7 11C7 13.761 4.761 16 2 16C0.896 16 0 16.896 0 18C0 23.523 4.477 28 10 28C15.523 28 20 23.523 20 18C20 16.896 19.104 16 18 16C15.239 16 13 13.761 13 11C13 6 14 0 14 0ZM10 32C4.477 32 0 27.523 0 22C0 20.896 0.896 20 2 20C2.986 20 3.926 19.802 4.772 19.444C3.082 18.253 2 16.247 2 14C2 9.582 5.582 6 10 6C14.418 6 18 9.582 18 14C18 16.247 16.918 18.253 15.228 19.444C16.074 19.802 17.014 20 18 20C19.104 20 20 20.896 20 22C20 27.523 15.523 32 10 32Z" 
            fill={color}
          />
        </motion.svg>
      </motion.div>
    );
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
            marginBottom: 'var(--space-md)',
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

        {/* Streak bar section - similar to Duolingo strike flame */}
        <motion.div
          variants={itemVariants}
          className="streak-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card, white)',
            marginBottom: 'var(--space-xl)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            padding: 'var(--space-md) var(--space-lg)',
            border: '1px solid var(--border-color, rgba(200, 200, 200, 0.3))',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.05,
              background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48.97 0l3.657 3.657-1.414 1.414L46.143 0h2.828zM11.03 0L7.372 3.657 8.787 5.07 13.857 0H11.03zm32.284 0L49.8 6.485 48.384 7.9l-7.9-7.9h2.83zM16.686 0L10.2 6.485 11.616 7.9l7.9-7.9h-2.83zm20.97 0l9.315 9.314-1.414 1.414L34.828 0h2.83zM22.344 0L13.03 9.314l1.414 1.414L25.172 0h-2.83zM32 0l12.142 12.142-1.414 1.414L30 .828 17.272 13.556l-1.414-1.414L28 0h4zM.284 0l28 28-1.414 1.414L0 2.544v2.83L25.456 30l-1.414 1.414L0 7.97v2.828L22.626 33.84l-1.414 1.414L0 13.4v2.83L19.797 35.24l-1.414 1.415L0 18.8v2.83L16.97 40.626l-1.414 1.414L0 24.23v2.828L14.142 42l-1.414 1.414L0 29.6v3.22L12 45.858 10.586 47.3 0 36.77v2.83l8 8-1.414 1.414L0 42v2.83L5.172 50 3.758 51.414 0 47.656v2.828L2.828 53.3 1.414 54.72 0 53.33v3.22L1.414 60H0v-3.22l1.414 1.414L0 56.484v-3.22l1.414 1.414L0 53.33v-2.83l3.757 3.757L3.9 55.7 0 51.8v-2.83l6 6L4.364 56.9 0 52.484v-3.22l7.778 7.778-1.414 1.414L0 56v-2.22L9.9 60H7.1L0 52.9v-3.556L14.364 60h-2.85L0 48.686v-2.83L17.172 60h-2.837L0 45.13v-3.22L20 60h-2.827L0 41.844v-2.836L22.828 60h-2.85L0 38.454v-2.82L25.657 60h-2.85L0 34.97v-2.83L28.485 60h-2.828L0 31.494v-2.82L31.313 60h-2.84L0 28.03v-2.828L34.142 60h-2.83L0 24.657v-2.83L36.97 60h-2.83L0 21.222v-2.83L39.8 60h-2.837L0 17.788v-2.83L42.626 60h-2.83L0 14.364v-2.83L45.456 60h-2.84L0 10.93v-2.83L48.284 60h-2.83L0 7.496v-2.82L51.114 60h-2.857L0 4.07V1.213L53.94 60h-2.84L0 0v2.97l-.285.286L0 0v2.97l-.285.286L0 0z' fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Streak info and active flame */}
          <motion.div 
            className="streak-info" 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            <Flame color="#FF7843" isActive={streakInfo?.currentStreak > 0} isDarkMode={false} />
            <div>
              <motion.h3 
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                style={{ 
                  margin: 0, 
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--text-primary)',
                  fontWeight: 'bold'
                }}
              >
                {streakInfo?.currentStreak || 0} Day Streak
              </motion.h3>
              <motion.p 
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                style={{ 
                  margin: 0, 
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                {streakInfo?.currentStreak > 0 
                  ? "Keep reading to maintain your streak!"
                  : "Start reading to begin your streak!"}
              </motion.p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            style={{ 
              flex: 1, 
              margin: '0 var(--space-lg)',
              position: 'relative',
              height: '12px',
              background: 'var(--bg-progress, rgba(200, 200, 200, 0.2))',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: streakInfo?.currentStreak > 0 ? '33%' : '0%' }}
              transition={{ 
                duration: 1.5, 
                ease: [0.34, 1.56, 0.64, 1], // Custom spring-like easing
                delay: 1 
              }}
              style={{
                position: 'absolute',
                height: '100%',
                background: 'linear-gradient(90deg, var(--flame-color-start, #FF7843) 0%, var(--flame-color-end, #FFB443) 100%)',
                boxShadow: '0 0 10px var(--flame-glow, rgba(255, 120, 50, 0.5))',
                borderRadius: '6px',
              }}
            >
              {/* Shimmer animation */}
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'linear',
                  delay: 2,
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                  zIndex: 5,
                }}
              />
            </motion.div>
            
            {/* Day markers */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              style={{ 
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 6px',
              }}
            >
              {[0, 1, 2].map((day) => (
                <motion.div 
                  key={day}
                  initial={{ height: 0 }}
                  animate={{ height: day === 0 ? 24 : 16 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 1.3 + day * 0.1,
                    type: 'spring',
                    stiffness: 300,
                  }}
                  style={{ 
                    width: day === 0 ? 6 : 4, 
                    backgroundColor: day === 0 
                      ? 'var(--flame-color-start, #FF7843)' 
                      : 'var(--day-marker-color, rgba(200, 200, 200, 0.5))',
                    borderRadius: '2px',
                    transform: 'translateY(-50%)',
                    position: 'relative',
                    top: '50%',
                    zIndex: 3,
                    boxShadow: day === 0 
                      ? '0 0 8px var(--flame-glow, rgba(255, 120, 50, 0.5))' 
                      : 'none',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Tomorrow's flame (white/inactive) */}
          <motion.div 
            className="tomorrow-flame" 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1 }}
              style={{ 
                margin: 0, 
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)'
              }}
            >
              Tomorrow
            </motion.p>
            <Flame color="var(--inactive-flame, #E5E5E5)" isActive={false} isDarkMode={false} />
          </motion.div>

          {/* CSS variables for dark mode compatibility */}
          <style 
            dangerouslySetInnerHTML={{
              __html: `
                :root {
                  --flame-color-start: #FF7843;
                  --flame-color-end: #FFB443;
                  --flame-glow: rgba(255, 120, 50, 0.5);
                  --inactive-flame: #E5E5E5;
                  --day-marker-color: rgba(200, 200, 200, 0.5);
                  --bg-progress: rgba(240, 240, 240, 0.5);
                  --bg-card: white;
                  --border-color: rgba(200, 200, 200, 0.3);
                }
                
                .dark-mode {
                  --flame-color-start: #FF5722;
                  --flame-color-end: #FF9800;
                  --flame-glow: rgba(255, 100, 0, 0.6);
                  --inactive-flame: #555555;
                  --day-marker-color: rgba(100, 100, 100, 0.7);
                  --bg-progress: rgba(40, 40, 40, 0.5);
                  --bg-card: #2A2A2A;
                  --border-color: rgba(60, 60, 60, 0.6);
                }
              `
            }}
          />
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