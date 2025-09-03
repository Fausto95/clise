import { useDocumentName, useElements } from "@store/index";
import { v4 as uuidv4 } from "uuid";
import { captureError } from "../utils/sentry";
import type { Element } from "./element-atoms";
import {
	createFileInput,
	downloadFile,
	exportToClise,
	getElementsToExport,
	importFromClise,
	readFileAsText,
} from "./file-operations";
import type { Group } from "./group-atoms";
import { useGroupOperations, useGroups } from "./group-hooks";
import { useElementOperations } from "./hooks";
import { useSelection } from "./selection-hooks";
import { usePan, useZoom, useZoomControls } from "./viewport-hooks";

/**
 * Hook for file export/import operations
 */
export function useFileOperations() {
	const elements = useElements();
	const groups = useGroups();
	const [documentName] = useDocumentName();
	const { addElementsWithIds, clearElements } = useElementOperations();
	const { addGroups, clearGroups } = useGroupOperations();
	const [selection] = useSelection();
	const [zoom] = useZoom();
	const { pan, setPan } = usePan();
	const { setZoom } = useZoomControls();

	/**
	 * Export all elements to a .clise file
	 */
	const exportAll = async () => {
		try {
			const viewport = { zoom, pan };
			const content = await exportToClise(
				elements,
				groups,
				viewport,
				documentName,
			);
			const fileName = `${documentName || "untitled"}.clise`;
			downloadFile(content, fileName);
		} catch (error) {
			captureError(error as Error, { context: "Export failed" });
			throw error;
		}
	};

	/**
	 * Export selected elements to a .clise file
	 */
	const exportSelected = async () => {
		try {
			if (selection.length === 0) {
				throw new Error("No elements selected for export");
			}

			const { elements: selectedElements, groups: selectedGroups } =
				getElementsToExport(selection, elements, groups);

			const viewport = { zoom, pan };
			const content = await exportToClise(
				selectedElements,
				selectedGroups,
				viewport,
				`${documentName || "untitled"}_selection`,
			);
			const fileName = `${documentName || "untitled"}_selection.clise`;
			downloadFile(content, fileName);
		} catch (error) {
			captureError(error as Error, { context: "Export selected failed" });
			throw error;
		}
	};

	/**
	 * Import elements from a .clise file
	 */
	const importFile = async (replaceExisting: boolean = false) => {
		try {
			const file = await createFileInput(".clise");
			if (!file) return; // User cancelled

			const content = await readFileAsText(file);
			const data = await importFromClise(content);
			const groupsArray: Group[] = Array.isArray(data.groups)
				? data.groups
				: Object.values(data.groups);

			if (replaceExisting) {
				// Clear existing elements and groups
				clearElements();
				clearGroups();
			}

			// Generate new IDs for imported elements to avoid conflicts
			const idMapping = new Map<string, string>();
			const newElements: Element[] = [];
			const newGroups: Group[] = [];

			// Create ID mapping for elements
			data.elements.forEach((element) => {
				const newId = uuidv4();
				idMapping.set(element.id, newId);
			});

			// Create ID mapping for groups
			groupsArray.forEach((group) => {
				const newId = uuidv4();
				idMapping.set(group.id, newId);
			});

			// Update element IDs and parent references
			data.elements.forEach((element) => {
				const newElement: Element = {
					...element,
					id: idMapping.get(element.id)!,
					parentId:
						element.parentId && idMapping.has(element.parentId)
							? idMapping.get(element.parentId)!
							: element.parentId,
				};
				newElements.push(newElement);
			});

			// Update group IDs and element references
			groupsArray.forEach((group) => {
				const newGroup: Group = {
					...group,
					id: idMapping.get(group.id)!,
					elementIds: group.elementIds.map((id) => idMapping.get(id) || id),
				};
				newGroups.push(newGroup);
			});

			// Restore viewport if available
			if (data.viewport) {
				setZoom(data.viewport.zoom);
				setPan(data.viewport.pan.x, data.viewport.pan.y);
			}

			// Add elements and groups to the store
			if (newElements.length > 0) {
				addElementsWithIds(newElements);
			}
			if (newGroups.length > 0) {
				addGroups(newGroups);
			}

			return {
				elementsCount: newElements.length,
				groupsCount: newGroups.length,
				fileName: file.name,
			};
		} catch (error) {
			captureError(error as Error, { context: "Import failed" });
			throw error;
		}
	};

	/**
	 * Create a new document (clear all elements)
	 */
	const newDocument = () => {
		clearElements();
		clearGroups();
	};

	return {
		exportAll,
		exportSelected,
		importFile,
		newDocument,
		canExportSelected: selection.length > 0,
	};
}

/**
 * Hook for document operations
 */
export function useDocumentOperations() {
	const { exportAll, importFile, newDocument } = useFileOperations();

	return {
		exportAll,
		importFile,
		newDocument,
	};
}
