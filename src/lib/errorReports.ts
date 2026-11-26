/**
 * Error reports. A build made with `VITE_SENTRY_DSN` set (a Sentry project's
 * DSN) sends every error nothing else caught to that project: uncaught errors
 * and rejected promises on their own, render errors through the ErrorBoundary.
 * Without it nothing is sent anywhere, and Sentry's code is never loaded: it
 * lives in its own chunk, outside the initial bundle and its budget.
 *
 * A report carries the error, its stack and the device, never who is signed
 * in, cookies, headers or what was typed (`dataCollection` below).
 */
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// Sentry once it has loaded and connected, or null if the build has no project
// or the chunk failed to load. A promise, so that a report made while it is
// still loading waits for it instead of being lost.
let sentry: Promise<typeof import('@sentry/browser') | null> | null = null;

/** Connects to the build's Sentry project, if it has one. */
export function startErrorReports(): Promise<void> {
  if (!dsn) return Promise.resolve();
  sentry = import('@sentry/browser').then(connect, () => null);
  return sentry.then(() => undefined);
}

function connect(s: typeof import('@sentry/browser')): typeof import('@sentry/browser') {
  s.init({
    dsn,
    release: `zirr-pos@${import.meta.env.VITE_APP_VERSION}`,
    environment: import.meta.env.MODE,
    // Only the error and the device: no user, cookies, headers, query strings
    // or request bodies.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
      httpBodies: [],
    },
  });
  return s;
}

/** Sends an error that was caught on the way up (a render error) to Sentry. */
export function reportError(error: unknown, where?: string): void {
  void sentry?.then((s) => s?.captureException(error, where ? { extra: { where } } : undefined));
}
