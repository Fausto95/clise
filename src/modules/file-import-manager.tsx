import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Element } from "@store/element-atoms";
import { readFileAsText } from "@store/file-operations";
import type { Group } from "@store/group-atoms";
import { useGroupOperations } from "@store/group-hooks";
import { useElementOperations } from "@store/index";
import {
	usePan,
	useZoomControls as useZoomControlsHook,
} from "@store/viewport-hooks";
import { captureError } from "../utils/sentry";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../components/ConfirmProvider";
import { useFileProcessor } from "../hooks/use-file-processor";

export const useFileImport = () => {
	const { addElementsWithIds } = useElementOperations();
	const { addGroups } = useGroupOperations();
	const { setPan } = usePan();
	const { setZoom } = useZoomControlsHook();
	const toast = useToast();
	const { t } = useTranslation();
	const confirmModal = useConfirm();
	const { processCliseFile, isProcessing, progress } = useFileProcessor();

	const handleFileImport = useCallback(
		async (file: File) => {
			try {
				const content = await readFileAsText(file);
				const data = await processCliseFile(content);
				const groupsArray: Group[] = Array.isArray(data.groups)
					? data.groups
					: Object.values(data.groups);

				// Ask user if they want to add the content
				const shouldImport = await confirmModal({
					message: `Import "${file.name}"? This will add ${
						data.elements?.length || 0
					} elements and ${
						groupsArray.length
					} groups to your current design.\n\nClick OK to import, or Cancel to abort.`,
				});

				if (shouldImport) {
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

					return true;
				}

				return false;
			} catch (error) {
				captureError(error as Error, {
					context: "Failed to import dropped file",
				});
				toast(
					t(
						"file.importError",
						"Failed to import file. Please check that it's a valid .clise file.",
					),
					"error",
				);
				return false;
			}
		},
		[addElementsWithIds, addGroups, setZoom, setPan, confirmModal, t, toast],
	);

	const isCliseFile = useCallback((file: File) => {
		return (
			file.name.toLowerCase().endsWith(".clise") ||
			file.type === "application/json"
		);
	}, []);

	return {
		handleFileImport,
		isCliseFile,
		isProcessing,
		progress,
	};
};
