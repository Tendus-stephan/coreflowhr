import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    // Built-in browser tracing integration (no separate @sentry/tracing package needed)
    Sentry.browserTracingIntegration(),
  ],
  // Capture 100% of transactions in dev; lower this in production (e.g. 0.1)
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
});