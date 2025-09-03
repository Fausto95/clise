import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import "../styles/toast.css";

type ToastVariant = "info" | "success" | "error" | "warning";

export type ToastItem = {
	id: number;
	message: string;
	variant: ToastVariant;
	duration?: number;
};

type ToastContextType = {
	toast: (message: string, variant?: ToastVariant, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [queue, setQueue] = useState<ToastItem[]>([]);

	const remove = useCallback((id: number) => {
		setQueue((q) => q.filter((t) => t.id !== id));
	}, []);

	const toast = useCallback(
		(message: string, variant: ToastVariant = "info", durationMs = 3000) => {
			const id = Date.now() + Math.floor(Math.random() * 1000);
			setQueue((q) => [...q, { id, message, variant, duration: durationMs }]);
			window.setTimeout(() => remove(id), durationMs);
		},
		[remove],
	);

	const value = useMemo(() => ({ toast }), [toast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div
				className="toast-container"
				role="status"
				aria-live="polite"
				aria-atomic="true"
			>
				{queue.map((t) => (
					<div key={t.id} className={`toast toast--${t.variant}`}>
						<span className="toast__message">{t.message}</span>
						<button
							className="toast__close"
							aria-label="Close"
							onClick={() => remove(t.id)}
						>
							×
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};

export const useToast = () => {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within a ToastProvider");
	return ctx.toast;
};
