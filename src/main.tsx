// En src/main.jsx o src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 💡 ESTA LÍNEA ES CLAVE para que Vite cargue el CSS:
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // Fallback: render nothing but avoid runtime crash during tests
  console.warn('Root element not found: cannot mount React application');
}