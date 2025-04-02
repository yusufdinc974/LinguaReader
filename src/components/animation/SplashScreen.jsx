import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../assets/styles/splash-screen.css';

const SplashScreen = ({ onComplete }) => {
  // Automatically trigger completion after animation finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Notify the main process that the splash screen is complete
      if (window.electron) {
        window.electron.ipcRenderer.send('splash-screen-complete');
      }
      
      // Call the onComplete callback to hide the splash screen
      onComplete();
    }, 3000); // 3 seconds total for the animation sequence
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo container with shine effect */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: 'spring', 
            damping: 10, 
            stiffness: 100,
            delay: 0.2
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '20%',
            marginBottom: '2rem'
          }}
        >
          {/* App logo with CSS animation */}
          <img
            className="splash-logo"
            src="assets/icon.png"
            alt="LinguaReader"
            style={{ width: '120px', height: '120px' }}
          />
          
          {/* Shine effect with CSS animation */}
          <div className="shine-effect" />
        </motion.div>
        
        {/* Text animation with CSS gradient */}
        <h1
          className="gradient-text"
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            margin: 0,
            textAlign: 'center',
          }}
        >
          LinguaReader
        </h1>
        
        {/* Tagline */}
        <motion.p
          style={{
            color: '#bbb',
            marginTop: '1rem',
            fontSize: '1.1rem',
            textAlign: 'center'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Expand your vocabulary while reading
        </motion.p>
        
        {/* Progress bar with CSS animation */}
        <div
          style={{
            width: '250px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            marginTop: '2rem',
            overflow: 'hidden',
          }}
        >
          <div className="progress-bar" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen; 