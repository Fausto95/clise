import type { FieldProps } from "./types";

export function Field({ label, children, fullWidth }: FieldProps) {
	const cls = `field${fullWidth ? " field--full" : ""}`;
	return (
		<label className={cls}>
			<span className="field-label">{label}</span>
			<span className="field-input">{children}</span>
		</label>
	);
}
