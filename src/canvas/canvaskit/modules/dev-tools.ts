import React from "react";
import { useElementOperations } from "../../../store";
import {
	generateTestElements,
	PERFORMANCE_TEST_CONFIGS,
} from "../../utils/performance-test";

export const useDevTools = () => {
	const { addElements, clearElements } = useElementOperations();

	React.useEffect(() => {
		// Only enable dev tools in development mode
		if (!import.meta.env.DEV) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "F4") {
				e.preventDefault();

				const generate10KElements = async () => {
					clearElements();

					const testElements = generateTestElements(
						PERFORMANCE_TEST_CONFIGS.heavy,
					);

					const chunkSize = 500;
					for (let i = 0; i < testElements.length; i += chunkSize) {
						const chunk = testElements.slice(i, i + chunkSize);
						addElements(chunk);
						await new Promise((resolve) => setTimeout(resolve, 10));
					}
				};

				generate10KElements();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [addElements, clearElements]);
};
