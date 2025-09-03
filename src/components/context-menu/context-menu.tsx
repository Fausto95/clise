import React from "react";
import {
	installContextMenuGuard,
	noteMenuClosed,
} from "../../context-menu/suppressor";
import {
	computeMenuPosition,
	getViewportRect,
	type Point,
} from "../../utils/positioning";

export interface MenuItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	shortcut?: string;
	disabled?: boolean;
	onClick: () => void;
	type?: "item" | "separator";
}

export interface ContextMenuProps {
	open: boolean;
	anchorPoint: Point | null;
	items: MenuItem[];
	onClose: () => void;
	preferredPlacement?:
		| "bottom-left"
		| "bottom-right"
		| "top-left"
		| "top-right";
	offset?: number;
	portalContainer?: HTMLElement | null;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
	open,
	anchorPoint,
	items,
	onClose,
	preferredPlacement = "bottom-left",
	offset = 8,
	portalContainer,
}) => {
	const ref = React.useRef<HTMLDivElement>(null);
	const [pos, setPos] = React.useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [focused, setFocused] = React.useState<number>(-1);

	// Manage outside-click close and suppress native contextmenu while open
	React.useEffect(() => {
		installContextMenuGuard();
		if (!open) return;
		const handleDown = (e: Event) => {
			if (ref.current && e.target && ref.current.contains(e.target as Node))
				return;
			if (e instanceof MouseEvent && e.button === 2) {
				noteMenuClosed(800);
			}
			onClose();
		};
		const blockContextMenu = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
		};
		window.addEventListener("mousedown", handleDown, true);
		window.addEventListener("touchstart", handleDown, true);
		window.addEventListener("contextmenu", blockContextMenu, true);
		return () => {
			window.removeEventListener("mousedown", handleDown, true);
			window.removeEventListener("touchstart", handleDown, true);
			window.removeEventListener("contextmenu", blockContextMenu, true);
		};
	}, [open, onClose]);

	// Recompute position when opening or when size changes
	React.useLayoutEffect(() => {
		if (!open || !anchorPoint) return;
		const el = ref.current;
		if (!el) return;
		// Ensure measured
		const rect = el.getBoundingClientRect();
		const p = computeMenuPosition(
			anchorPoint,
			{ width: rect.width || 180, height: rect.height || 10 },
			getViewportRect(),
			{ preferred: preferredPlacement, offset },
		);
		setPos(p);
	}, [open, anchorPoint, preferredPlacement, offset, items.length]);

	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				moveFocus(1);
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				moveFocus(-1);
			}
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				activateFocused();
			}
		};
		const onResize = () => {
			if (!anchorPoint || !ref.current) return;
			const rect = ref.current.getBoundingClientRect();
			const p = computeMenuPosition(
				anchorPoint,
				{ width: rect.width, height: rect.height },
				getViewportRect(),
				{ preferred: preferredPlacement, offset },
			);
			setPos(p);
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("resize", onResize);
		window.addEventListener("scroll", onResize, true);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("resize", onResize);
			window.removeEventListener("scroll", onResize, true);
		};
	}, [open, anchorPoint, preferredPlacement, offset, onClose]);

	const enabled = items.filter(
		(i) => i && i.type !== "separator" && !i.disabled,
	);
	const moveFocus = (dir: number) => {
		if (enabled.length === 0) return;
		const ids = items
			.map((_, i) => i)
			.filter((i) => {
				const it = items[i];
				return it && it.type !== "separator" && !it.disabled;
			});
		const curIndex = Math.max(0, ids.indexOf(focused));
		const nextIndex = ids[(curIndex + dir + ids.length) % ids.length];
		if (typeof nextIndex === "number") setFocused(nextIndex);
	};
	const activateFocused = () => {
		const item = items[focused];
		if (item && !item.disabled && item.type !== "separator") {
			item.onClick();
			onClose();
		}
	};

	if (!open || !anchorPoint) return null;

	const content = (
		<div
			ref={ref}
			role="menu"
			style={{
				position: "fixed",
				top: pos.y,
				left: pos.x,
				background: "var(--bg-secondary)",
				border: "1px solid var(--border)",
				boxShadow: "var(--shadow-lg)",
				backdropFilter: "blur(10px)",
				padding: "4px 0",
				borderRadius: 12,
				zIndex: 100000,
				minWidth: 180,
				maxWidth: Math.max(220, window.innerWidth - 32),
				maxHeight: Math.max(120, window.innerHeight - 32),
				overflowY: "auto",
			}}
			onMouseDown={(e) => e.stopPropagation()}
		>
			{items.map((it, i) =>
				it.type === "separator" ? (
					<div
						key={i}
						style={{
							height: 1,
							margin: "4px 0",
							background: "var(--overlay-light)",
						}}
					/>
				) : (
					<button
						key={it.id}
						role="menuitem"
						aria-disabled={it.disabled}
						disabled={it.disabled}
						onClick={() => {
							if (!it.disabled) {
								it.onClick();
								onClose();
							}
						}}
						onMouseEnter={() => setFocused(i)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							width: "100%",
							padding: "8px 12px",
							background: focused === i ? "var(--bg-hover)" : "transparent",
							color: it.disabled ? "var(--text-muted)" : "var(--text-primary)",
							border: "none",
							textAlign: "left",
							cursor: it.disabled ? "not-allowed" : "pointer",
						}}
					>
						{it.icon}
						<span style={{ flex: 1 }}>{it.label}</span>
						{it.shortcut && (
							<span style={{ opacity: 0.6, fontSize: 12 }}>{it.shortcut}</span>
						)}
					</button>
				),
			)}
		</div>
	);

	if (portalContainer) {
		return (portalContainer as any).ownerDocument.defaultView?.ReactDOM
			? (
					portalContainer as any
				).ownerDocument.defaultView.ReactDOM.createPortal(
					content,
					portalContainer,
				)
			: content;
	}
	return content;
};
