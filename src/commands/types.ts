import type { Element } from "../store/elements/element-types";
import type { Group } from "../store/group-atoms";

export interface Scene {
	elements: { [id: string]: Element };
	selection: string[];
	groups: { [id: string]: Group };
	clipboard?: Element[];
}

export interface Command<T = any> {
	id: string;
	run(scene: Scene, ...args: T[]): Scene;
	undo?(scene: Scene): Scene;
}

export interface CommandResult {
	newScene: Scene;
	command?: Command;
}

export type CommandExecutor = (command: Command, ...args: any[]) => void;
