import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Element as CanvasElement } from "../store/atoms";
import { useCoordinateTransforms } from "./canvaskit/hooks/use-coordinate-transforms";

interface TextEditorProps {
	element?: CanvasElement | null;
	textCreationPosition?: { x: number; y: number } | null;
	zoom: number;
	onFinish: (
		mode: "editing" | "creating",
		text: string,
		fontSize: number,
		calculatedWidth: number,
		calculatedHeight: number,
	) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
	element,
	textCreationPosition,
	zoom,
	onFinish,
}) => {
	const mode = element ? "editing" : "creating";
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [text, setText] = useState(
		element?.type === "text" ? element?.text : "",
	);
	const [dynamicDimensions, setDynamicDimensions] = useState({
		width: 200,
		height: 30,
	});
	const { worldToScreen } = useCoordinateTransforms();

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;
		if (textareaRef.current) {
			// Use setTimeout to ensure the textarea is rendered and focusable
			timeoutId = setTimeout(() => {
				if (textareaRef.current) {
					textareaRef.current.focus();
					textareaRef.current.selectionStart =
						textareaRef.current.selectionEnd = text.length;
				}
			}, 0);
		}
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [text.length]);

	// Update dynamic dimensions when text changes
	useEffect(() => {
		const fontSize = element?.type === "text" ? (element.fontSize ?? 16) : 16;
		const { width, height } = calculateTextDimensions(text, fontSize);
		setDynamicDimensions({ width, height });
	}, [text, element]);

	// Function to calculate text dimensions using the same logic as getTextBounds
	const calculateTextDimensions = (textContent: string, fontSize: number) => {
		if (!textContent.trim()) {
			// Empty text should have minimal dimensions
			return { width: 20, height: fontSize * 1.2 };
		}

		const lineHeight = 1.2;
		const letterSpacing = 0;

		// Split by line breaks (same as canvas renderer)
		const lines = textContent.split("\n");
		const actualLineHeight = lineHeight * fontSize;

		// Calculate maximum line width (same logic as getTextBounds)
		let maxLineWidth = 20; // Minimum width for empty text
		for (const line of lines) {
			let lineWidth;
			if (letterSpacing && letterSpacing !== 0) {
				const charWidth = fontSize * 0.6;
				lineWidth = line.length * charWidth + (line.length - 1) * letterSpacing;
			} else {
				lineWidth = line.length * (fontSize * 0.6);
			}
			maxLineWidth = Math.max(maxLineWidth, lineWidth);
		}

		const width = maxLineWidth;
		// Match canvas logic: don't apply lineHeight if single line
		const height =
			(lines.length <= 1 ? fontSize : lines.length * actualLineHeight) +
			fontSize * 0.2; // Add padding like getTextBounds

		return { width, height };
	};

	const handleFinish = () => {
		if (mode === "creating") {
			const { width, height } = calculateTextDimensions(text, 16);
			onFinish("creating", text.trim(), 16, width, height);
		}
		if (mode === "editing" && element?.type === "text") {
			const fontSize = element.fontSize ?? 16;
			const { width, height } = calculateTextDimensions(text, fontSize);
			onFinish("editing", text.trim(), fontSize, width, height);
		}
	};

	const handleBlur = () => {
		if (mode === "editing" && element?.type === "text") {
			handleFinish();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			handleFinish();
		}

		if (e.key === "Enter") {
			e.stopPropagation();
			e.preventDefault();
			if (e.shiftKey) {
				// Shift+Enter: Insert line break manually since we need to handle it ourselves
				const textarea = textareaRef.current;
				if (textarea) {
					const start = textarea.selectionStart;
					const end = textarea.selectionEnd;
					const newText = text.substring(0, start) + "\n" + text.substring(end);
					setText(newText);
					// Set cursor position after the line break
					setTimeout(() => {
						textarea.selectionStart = textarea.selectionEnd = start + 1;
					}, 0);
				}
				return;
			} else {
				handleFinish();
			}
		}

		// Allow Tab but prevent it from changing focus
		if (e.key === "Tab") {
			e.preventDefault();
			const textarea = textareaRef.current;
			if (textarea) {
				const start = textarea.selectionStart;
				const end = textarea.selectionEnd;
				const newText = text.substring(0, start) + "\t" + text.substring(end);
				setText(newText);
				// Set cursor position after the tab
				setTimeout(() => {
					textarea.selectionStart = textarea.selectionEnd = start + 1;
				}, 0);
			}
		}
	};

	// Calculate position and size based on mode (editing existing element or creating new one)
	let transformedX = 0;
	let transformedY = 0;
	let scaledFontSize = 16 * zoom; // Default font size

	// Use dynamic dimensions scaled by zoom
	const scaledWidth = dynamicDimensions.width * zoom;
	const scaledHeight = dynamicDimensions.height * zoom;

	if (mode === "editing" && element) {
		// Editing existing text element - use element's position
		const screenPos = worldToScreen(element.x, element.y);
		transformedX = screenPos.x;
		transformedY = screenPos.y;

		// Use element's font size
		if (element.type === "text") {
			scaledFontSize = element.fontSize * zoom;
		}
	} else if (mode === "creating" && textCreationPosition) {
		// Creating new text element - use click position (already in world coordinates)
		const screenPos = worldToScreen(
			textCreationPosition.x,
			textCreationPosition.y,
		);
		transformedX = screenPos.x;
		transformedY = screenPos.y;
		scaledFontSize = 16 * zoom; // Scale default font size
	}

	return (
		<textarea
			ref={textareaRef}
			value={text}
			onChange={(e) => setText(e.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			wrap="soft"
			style={{
				position: "absolute",
				left: transformedX,
				top: transformedY,
				// Use dynamic width with reasonable bounds
				width: Math.max(100, Math.min(scaledWidth, 800)),
				// Use dynamic height that grows with content
				height: scaledHeight,
				fontSize: scaledFontSize,
				fontFamily:
					element?.type === "text" ? element.fontFamily : "Arial, sans-serif",
				color: element?.type === "text" ? element.color : "#000000",
				backgroundColor: "transparent",
				border: "none",
				outline: "none",
				resize: "none",
				overflow: "hidden", // Hide scrollbars since we're auto-sizing
				margin: 0,
				zIndex: 50,
				pointerEvents: "auto",
			}}
			autoFocus
		/>
	);
};
