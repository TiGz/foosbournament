import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('[DEBUG] index.tsx loaded');

const rootElement = document.getElementById('root');
console.log('[DEBUG] rootElement:', rootElement);
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('[DEBUG] Creating React root');
const root = ReactDOM.createRoot(rootElement);
console.log('[DEBUG] Rendering App');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('[DEBUG] Render called');