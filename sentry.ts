import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD, // disable in development to avoid CORS errors
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.2,
  environment: import.meta.env.MODE,
});