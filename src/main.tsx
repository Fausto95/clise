import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";
import "./styles/index.css";
import { initSentry } from "./utils/sentry";

// Initialize Sentry
initSentry();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ConfirmProvider>
			<ErrorBoundary>
				<ToastProvider>
					<App />
				</ToastProvider>
			</ErrorBoundary>
		</ConfirmProvider>
	</StrictMode>,
);
