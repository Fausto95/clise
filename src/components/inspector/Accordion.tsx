import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import React from "react";

type Variant = "regular" | "set";

export interface AccordionProps {
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	variant?: Variant;
	isSet?: boolean; // required for variant "set"
	onSet?: () => void; // required for variant "set"
	onUnset?: () => void; // required for variant "set"
	defaultOpen?: boolean;
}

export function Accordion({
	title,
	icon,
	children,
	variant = "regular",
	isSet = true,
	onSet,
	onUnset,
	defaultOpen = false,
}: AccordionProps) {
	const [open, setOpen] = React.useState<boolean>(defaultOpen);

	React.useEffect(() => {
		// For set variant, close when unset
		if (variant === "set" && !isSet) {
			setOpen(false);
		}
	}, [variant, isSet]);

	const handleHeaderClick = () => {
		// Only toggle if regular, or set-variant with value already set
		if (variant === "regular" || (variant === "set" && isSet)) {
			setOpen((v) => !v);
		}
	};

	const handleSet = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (variant === "set" && !isSet && onSet) {
			onSet();
			setOpen(true);
		}
	};

	const handleUnset = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (variant === "set" && isSet && onUnset) {
			onUnset();
			setOpen(false);
		}
	};

	return (
		<div className="section">
			<div
				role="button"
				tabIndex={0}
				className="accordion-header"
				onClick={handleHeaderClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleHeaderClick();
					}
				}}
			>
				{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				{icon}
				<span>{title}</span>
				{variant === "set" && (
					<span
						style={{
							marginLeft: "auto",
							display: "flex",
							alignItems: "center",
						}}
					>
						{isSet ? (
							<button
								type="button"
								aria-label="Unset"
								onClick={handleUnset}
								className="align-button"
								style={{ width: 28, height: 24 }}
							>
								<Minus size={14} />
							</button>
						) : (
							<button
								type="button"
								aria-label="Set"
								onClick={handleSet}
								className="align-button"
								style={{ width: 28, height: 24 }}
							>
								<Plus size={14} />
							</button>
						)}
					</span>
				)}
			</div>

			{open && <div className="input-group">{children}</div>}
		</div>
	);
}
