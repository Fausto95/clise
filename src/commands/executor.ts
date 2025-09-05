import { atom, useSetAtom } from "jotai";
import type { Scene, Command } from "./types";
import { elementsAtom } from "../store/element-atoms";
import { selectionAtom } from "../store/selection-atoms";
import {
	elementAtomFamily,
	elementIdsAtom,
} from "../store/elements/element-state";
import { pushHistoryAtom } from "../store/history-atoms";
import {
	groupsAtom,
	groupAtomFamily,
	groupIdsAtom,
} from "../store/group-atoms";
import { clipboardAtom } from "../store/clipboard-atoms";

export const sceneAtom = atom((get) => {
	const selection = get(selectionAtom);
	const elements = get(elementsAtom);
	const groups = get(groupsAtom);
	const clipboard = get(clipboardAtom);

	// Convert elements array to elements object
	const elementsObj: { [id: string]: any } = {};
	elements.forEach((element) => {
		elementsObj[element.id] = element;
	});

	// Convert groups array to groups object
	const groupsObj: { [id: string]: any } = {};
	groups.forEach((group) => {
		groupsObj[group.id] = group;
	});

	return {
		elements: elementsObj,
		selection,
		groups: groupsObj,
		clipboard,
	} as Scene;
});

export const executeCommandAtom = atom(
	null,
	(get, set, { command, args = [] }: { command: Command; args?: any[] }) => {
		// Push current state to history before executing command
		set(pushHistoryAtom);

		// Get current scene
		const currentScene = get(sceneAtom);

		// Execute command
		const newScene = command.run(currentScene, ...args);

		// Apply the new state to the store
		set(selectionAtom, newScene.selection);

		// Update clipboard if it changed
		if (newScene.clipboard) {
			set(clipboardAtom, newScene.clipboard);
		}

		// Update elements - handle additions, updates, and deletions
		const currentElementIds = get(elementIdsAtom);
		const newElementIds = Object.keys(newScene.elements);

		// Add/update elements
		Object.entries(newScene.elements).forEach(([id, element]) => {
			set(elementAtomFamily(id), element);
		});

		// Remove deleted elements
		const elementsToRemove = currentElementIds.filter(
			(id) => !newScene.elements[id],
		);
		elementsToRemove.forEach((id) => {
			set(elementAtomFamily(id), null);
		});

		// Update element IDs list
		set(elementIdsAtom, newElementIds);

		// Update groups - handle additions, updates, and deletions
		const currentGroupIds = get(groupIdsAtom);
		const newGroupIds = Object.keys(newScene.groups);

		// Add/update groups
		Object.entries(newScene.groups).forEach(([id, group]) => {
			set(groupAtomFamily(id), group);
		});

		// Remove deleted groups
		const groupsToRemove = currentGroupIds.filter((id) => !newScene.groups[id]);
		groupsToRemove.forEach((id) => {
			set(groupAtomFamily(id), null);
		});

		// Update group IDs list
		set(groupIdsAtom, newGroupIds);
	},
);

export const useExecuteCommand = () => {
	return useSetAtom(executeCommandAtom);
};
