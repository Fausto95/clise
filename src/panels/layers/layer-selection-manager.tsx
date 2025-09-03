import React, { useState } from "react";
import { useUpdateElement } from "@store/index";
import type { Element } from "@store/index";

export const useLayerSelectionManager = () => {
	const updateElement = useUpdateElement();

	// State for inline editing
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState<string>("");

	const handleClick =
		(element: Element, selection: string[], select: (ids: string[]) => void) =>
		(e: React.MouseEvent) => {
			if (e.metaKey || e.ctrlKey) {
				// Toggle selection of this element
				const set = new Set(selection);
				if (set.has(element.id)) set.delete(element.id);
				else set.add(element.id);
				select(Array.from(set));
			} else {
				// Regular selection
				select([element.id]);
			}
		};

	const handleDoubleClick = (element: Element) => (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditingId(element.id);
		setEditingName(element.name);
	};

	const handleSaveName = (element: Element) => () => {
		if (editingName.trim() && editingName !== element.name) {
			updateElement({ id: element.id, patch: { name: editingName.trim() } });
		}
		setEditingId(null);
		setEditingName("");
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditingName("");
	};

	const handleKeyDown = (element: Element) => (e: React.KeyboardEvent) => {
		// Stop propagation for all keys during editing to prevent shortcuts
		e.stopPropagation();

		if (e.key === "Enter") {
			e.preventDefault();
			handleSaveName(element)();
		} else if (e.key === "Escape") {
			e.preventDefault();
			handleCancelEdit();
		}
	};

	return {
		editingId,
		editingName,
		setEditingName,
		handleClick,
		handleDoubleClick,
		handleSaveName,
		handleCancelEdit,
		handleKeyDown,
	};
};
