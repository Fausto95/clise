import * as Sentry from "@sentry/react";

// Initialize Sentry
export const initSentry = () => {
	Sentry.init({
		dsn: import.meta.env.VITE_SENTRY_DSN,
		environment: import.meta.env.MODE,
		enabled: import.meta.env.PROD, // Only enable in production
	});
};

// Helper function to capture errors
export const captureError = (
	error: Error | string,
	context?: Record<string, unknown>,
) => {
	if (typeof error === "string") {
		Sentry.captureMessage(error, "error");
	} else {
		Sentry.captureException(error);
	}

	if (context) {
		Sentry.setContext("errorContext", context);
	}

	// Still log to console in development
	if (import.meta.env.DEV) {
		console.error(error, context);
	}
};

export { Sentry };
