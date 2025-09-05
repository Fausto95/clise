import { useCallback } from "react";
import { useCommandDispatcher } from "./dispatcher";
import { moveSelection } from "./move-selection";

export const useKeyboardCommands = () => {
	const { dispatch } = useCommandDispatcher();

	const handleArrowKey = useCallback(
		(code: string, shiftKey: boolean) => {
			const moveStep = shiftKey ? 10 : 1;
			let dx = 0;
			let dy = 0;

			switch (code) {
				case "ArrowLeft":
					dx = -moveStep;
					break;
				case "ArrowRight":
					dx = moveStep;
					break;
				case "ArrowUp":
					dy = -moveStep;
					break;
				case "ArrowDown":
					dy = moveStep;
					break;
			}

			if (dx !== 0 || dy !== 0) {
				dispatch(moveSelection(dx, dy));
				return true;
			}

			return false;
		},
		[dispatch],
	);

	return {
		handleArrowKey,
	};
};
