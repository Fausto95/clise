import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import "../styles/confirm.css";

type ConfirmOptions = {
	title?: string;
	message: string | React.ReactNode;
	confirmText?: string;
	cancelText?: string;
};

type InternalState =
	| (ConfirmOptions & { id: number; resolve: (v: boolean) => void })
	| null;

type ConfirmContextType = {
	confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

const ConfirmOverlayBase: React.FC<
	WithTranslation & { state: InternalState; onClose: (v: boolean) => void }
> = ({ state, onClose, t }) => {
	const modalRef = useRef<HTMLDivElement | null>(null);

	// Focus management + trap
	useEffect(() => {
		if (!state) return;
		const container = modalRef.current;
		if (!container) return;

		const focusables = () =>
			Array.from(
				container.querySelectorAll<HTMLElement>(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				),
			).filter((el) => !el.hasAttribute("disabled"));

		// Focus first focusable
		const els = focusables();
		(els[els.length - 1] || container).focus(); // focus close proximity then user will tab

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose(false);
				return;
			}
			if (e.key === "Tab") {
				const list = focusables();
				if (list.length === 0) {
					e.preventDefault();
					return;
				}
				const active = document.activeElement as HTMLElement | null;
				const idx = list.indexOf(active || list[0]!);
				let next = idx;
				if (e.shiftKey) next = idx <= 0 ? list.length - 1 : idx - 1;
				else next = idx === list.length - 1 ? 0 : idx + 1;
				e.preventDefault();
				list[next]!.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose, state]);

	if (!state) return null;
	const { title, message, confirmText, cancelText, id } = state;

	return (
		<div className="confirm-overlay" role="dialog" aria-modal="true">
			<div
				className="confirm-modal"
				ref={modalRef}
				tabIndex={-1}
				aria-labelledby={`confirm-title-${id}`}
			>
				<div className="confirm-header">
					<h3 id={`confirm-title-${id}`} className="confirm-title">
						{title || t("confirm.title", "Confirm")}
					</h3>
				</div>
				<div className="confirm-body">
					{typeof message === "string" ? <p>{message}</p> : message}
				</div>
				<div className="confirm-actions">
					<button className="btn btn-secondary" onClick={() => onClose(false)}>
						{cancelText || t("confirm.cancel", "Cancel")}
					</button>
					<button className="btn btn-primary" onClick={() => onClose(true)}>
						{confirmText || t("confirm.ok", "OK")}
					</button>
				</div>
			</div>
		</div>
	);
};

const ConfirmOverlay = withTranslation()(ConfirmOverlayBase);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [state, setState] = useState<InternalState>(null);
	const prevActiveRef = useRef<HTMLElement | null>(null);

	const confirm = useCallback((opts: ConfirmOptions) => {
		return new Promise<boolean>((resolve) => {
			prevActiveRef.current = document.activeElement as HTMLElement | null;
			setState({ ...opts, id: Date.now(), resolve });
		});
	}, []);

	const onClose = useCallback((v: boolean) => {
		setState((s) => {
			if (s) s.resolve(v);
			// Restore focus
			if (prevActiveRef.current) {
				try {
					prevActiveRef.current.focus();
				} catch {
					// Ignore focus errors
				}
			}
			return null;
		});
	}, []);

	const value = useMemo(() => ({ confirm }), [confirm]);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<ConfirmOverlay state={state} onClose={onClose} />
		</ConfirmContext.Provider>
	);
};

export const useConfirm = () => {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
	return ctx.confirm;
};
