import "./sentry";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Redirect to settings page before any render when URL has email-change/auth hash (avoids landing → login)
const shouldRedirectToSettingsForEmailChange =
  typeof window !== 'undefined' &&
  (() => {
    const pathname = window.location.pathname || '/';
    const hash = window.location.hash || '';
    const isRootOrLogin = pathname === '/' || pathname === '' || pathname === '/login';
    const hasMessage = hash.includes('message=');
    const hasError = hash.includes('error=') || hash.includes('error_code=') || hash.includes('error_description=');
    const looksLikeEmailChange = hasMessage && (hash.includes('Confirmation') || hash.includes('link') || hash.includes('email'));
    const looksLikeAuthError = hasError || (hasMessage && hash.includes('other'));
    return isRootOrLogin && (looksLikeEmailChange || looksLikeAuthError || hasError);
  })();

if (shouldRedirectToSettingsForEmailChange && typeof window !== 'undefined') {
  window.location.replace(window.location.origin + '/settings' + window.location.hash);
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