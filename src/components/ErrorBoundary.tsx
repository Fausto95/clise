import React from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { captureError } from "../utils/sentry";
import "../styles/error-boundary.css";
import { useConfirm } from "./ConfirmProvider";

type ErrorBoundaryOwnProps = {
	children: React.ReactNode;
	fallback?: React.ReactNode;
};
type ErrorBoundaryProps = ErrorBoundaryOwnProps & WithTranslation;

type ErrorBoundaryState = {
	hasError: boolean;
	error?: unknown;
	cleared?: boolean;
};

class ErrorBoundaryBase extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false };

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: unknown, info: React.ErrorInfo) {
		captureError(error instanceof Error ? error : new Error(String(error)), {
			componentStack: info?.componentStack,
		});
	}

	handleReload = () => {
		// Full reload is the safest recovery for unknown fatal errors
		window.location.reload();
	};

	handleClearStorage = () => {
		try {
			localStorage.removeItem("clise-app-state");
			this.setState({ cleared: true });
		} catch {}
	};

	render() {
		if (this.state.hasError) {
			const { t, fallback } = this.props;
			if (fallback) return fallback;
			const ConfirmClearButton: React.FC = () => {
				const confirm = useConfirm();
				const onClick = async () => {
					const ok = await confirm({
						message: t(
							"file.clearStorageConfirm",
							"Clear saved data in storage? This will remove persisted elements and settings.",
						),
					});
					if (ok) {
						this.handleClearStorage();
						window.setTimeout(() => window.location.reload(), 300);
					}
				};
				return (
					<button className="error-boundary__button" onClick={onClick}>
						{t("file.clearSavedData", "Clear Saved Data")}
					</button>
				);
			};

			return (
				<div className="error-boundary">
					<h2 className="error-boundary__title">{t("errorBoundary.title")}</h2>
					<p className="error-boundary__message">
						{t("errorBoundary.message")}
					</p>
					<div className="error-boundary__actions">
						<ConfirmClearButton />
						<button
							className="error-boundary__button"
							onClick={this.handleReload}
						>
							{t("errorBoundary.reload")}
						</button>
					</div>
					{this.state.cleared && (
						<p className="error-boundary__note">
							{t("file.clearStorageDone", "Saved data cleared.")}
						</p>
					)}
				</div>
			);
		}
		return this.props.children;
	}
}

const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
export { ErrorBoundary };
