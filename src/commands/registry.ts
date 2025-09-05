import type { Command } from "./types";

export class CommandRegistry {
	private commands = new Map<string, Command>();

	register<T extends Command>(command: T): void {
		this.commands.set(command.id, command);
	}

	get(id: string): Command | undefined {
		return this.commands.get(id);
	}

	has(id: string): boolean {
		return this.commands.has(id);
	}

	getAll(): Command[] {
		return Array.from(this.commands.values());
	}
}

export const commandRegistry = new CommandRegistry();
