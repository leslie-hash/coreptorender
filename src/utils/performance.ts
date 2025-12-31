import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

const vitalsCallback = (metric: Metric) => {
  // Log to Sentry
  Sentry.captureMessage('Web Vitals', {
    level: 'info',
    extra: {
      metric,
    },
  });

  // You can also send to your analytics service here
  if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
    // Example: send to Google Analytics
    // window.ga('send', 'event', {
    //   eventCategory: 'Web Vitals',
    //   eventAction: metric.name,
    //   eventValue: Math.round(metric.value),
    //   eventLabel: metric.id,
    //   nonInteraction: true,
    // });
  }
};

export const measureWebVitals = () => {
  onCLS(vitalsCallback);
  onFCP(vitalsCallback);
  onLCP(vitalsCallback);
  onTTFB(vitalsCallback);
  onINP(vitalsCallback);
};