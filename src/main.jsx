import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import './index.css';

/**
 * FinTrack application entry point.
 *
 * Responsibilities:
 * 1. Locate the React root element.
 * 2. Initialize React.
 * 3. Enable client-side routing.
 * 4. Render the main application.
 */

function initializeApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error(
      'FinTrack initialization failed: missing #root element in index.html.'
    );
  }

  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

initializeApp();