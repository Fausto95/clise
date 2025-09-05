import { useCallback } from "react";
import { useExecuteCommand } from "./executor";
import { commandRegistry } from "./registry";
import type { Command } from "./types";

export const useCommandDispatcher = () => {
	const executeCommand = useExecuteCommand();

	const dispatch = useCallback(
		(command: Command, ...args: any[]) => {
			executeCommand({ command, args });
		},
		[executeCommand],
	);

	const dispatchById = useCallback(
		(commandId: string, ...args: any[]) => {
			const command = commandRegistry.get(commandId);
			if (!command) {
				console.warn(`Command with id "${commandId}" not found`);
				return;
			}
			dispatch(command, ...args);
		},
		[dispatch],
	);

	return {
		dispatch,
		dispatchById,
	};
};
