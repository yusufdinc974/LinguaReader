import React from 'react';
import WindowControls from '../common/WindowControls';

/**
 * Custom TitleBar component for the Electron application
 * Provides a draggable area and window controls (minimize, maximize, close)
 * Contains no text as requested by user
 */
const TitleBar = () => {
  return (
    <div className="title-bar">
      <div className="drag-region">
        {/* Empty draggable region, no text content */}
      </div>
      <WindowControls />
    </div>
  );
};

export default TitleBar; 