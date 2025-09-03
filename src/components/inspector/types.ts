import type { Element } from "../../store/element-atoms";

export interface InspectorSectionProps {
	element: Element;
	onUpdate: (id: string, patch: Partial<Element>) => void;
	addElement?: (element: Element) => string;
}

export interface FieldProps {
	label: string;
	children: React.ReactNode;
	fullWidth?: boolean;
}
