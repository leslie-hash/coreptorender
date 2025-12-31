import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

export const initSentry = () => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
  // integrations: [new Integrations.BrowserTracing()],
      environment: import.meta.env.VITE_ENVIRONMENT,
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Don't send events in development
        if (import.meta.env.DEV) {
          return null;
        }
        return event;
      },
    });
  }
};