import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize React in strict mode
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log application startup
console.log('PDF Vocabulary Reader application started');