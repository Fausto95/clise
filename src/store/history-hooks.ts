import { useSetAtom } from "jotai";
import {
	clearHistoryAtom,
	commitTransactionAtom,
	pushHistoryAtom,
	redoAtom,
	startTransactionAtom,
	undoAtom,
} from "./history-atoms";

// History hooks
export const useHistoryOperations = () => {
	const startTransaction = useSetAtom(startTransactionAtom);
	const commitTransaction = useSetAtom(commitTransactionAtom);
	const push = useSetAtom(pushHistoryAtom);
	const undo = useSetAtom(undoAtom);
	const redo = useSetAtom(redoAtom);
	const clear = useSetAtom(clearHistoryAtom);

	return {
		startTransaction,
		commitTransaction,
		push,
		undo,
		redo,
		clear,
	};
};
