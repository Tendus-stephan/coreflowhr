import "./sentry";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Redirect / with email-change hash to change-email page before any render (avoids landing → login)
const shouldRedirectToChangeEmail =
  typeof window !== 'undefined' &&
  (() => {
    const pathname = window.location.pathname || '/';
    const hash = window.location.hash || '';
    const isRoot = pathname === '/' || pathname === '';
    const isEmailChangeHash = hash.includes('message=') && (hash.includes('Confirmation') || hash.includes('link+accepted') || hash.includes('link accepted'));
    const isEmailErrorHash = hash.includes('error=') || hash.includes('error_code=');
    return isRoot && (isEmailChangeHash || isEmailErrorHash);
  })();

if (shouldRedirectToChangeEmail && typeof window !== 'undefined') {
  window.location.replace(window.location.origin + '/settings/change-email' + window.location.hash);
} else {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}