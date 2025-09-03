import React, { useCallback } from "react";
import {
	useEditingTextId,
	useElementOperations,
	useElementsById,
	useIsEditingText,
	useTextCreationPosition,
	useTool,
} from "../../../store";
import type { Element as CanvasElement } from "../../../store/atoms";
import { TextEditor } from "../../text-editor";
import { useTranslation } from "react-i18next";

export const useTextEditorManager = () => {
	const { t } = useTranslation();
	const [isEditingText, setIsEditingText] = useIsEditingText();
	const [editingTextId, setEditingTextId] = useEditingTextId();
	const [textCreationPosition, setTextCreationPosition] =
		useTextCreationPosition();
	const elementsById = useElementsById();
	const { updateElement, addElement } = useElementOperations();
	const [, setTool] = useTool();

	const handleFinishEditing = useCallback(
		(
			mode: "editing" | "creating",
			text: string,
			fontSize: number,
			calculatedWidth: number,
			calculatedHeight: number,
		) => {
			setIsEditingText(false);
			setEditingTextId(null);
			setTextCreationPosition(null); // Clear the creation position
			setTool("select");
			if (mode === "creating") {
				const textElement = {
					type: "text" as const,
					x: textCreationPosition?.x ?? 0,
					y: textCreationPosition?.y ?? 0,
					w: calculatedWidth,
					h: calculatedHeight,
					fill: "transparent",
					opacity: 1,
					visible: true,
					parentId: null,
					rotation: 0,
					name: `${t("elements.text")} ${Date.now()}`,
					text: text,
					color: "#000000",
					fontSize: fontSize,
					fontFamily: "Arial, sans-serif",
					textDecoration: "none",
					fontWeight: "normal",
					textTransform: "none",
					lineHeight: 1.2,
					letterSpacing: 0,
				};
				addElement(textElement);
			}
			if (mode === "editing" && editingTextId) {
				updateElement({
					id: editingTextId,
					patch: { text, visible: true }, // Make text element visible again
				});
			}
		},
		[
			setIsEditingText,
			setEditingTextId,
			setTextCreationPosition,
			setTool,
			addElement,
			updateElement,
			textCreationPosition,
			editingTextId,
			t,
		],
	);

	const editingElement = editingTextId
		? (elementsById.get(editingTextId) ?? null)
		: null;

	return {
		isEditingText,
		editingElement,
		textCreationPosition,
		handleFinishEditing,
	};
};

interface TextEditorOverlayProps {
	isEditingText: boolean;
	editingElement: CanvasElement | null | undefined;
	textCreationPosition: { x: number; y: number } | null;
	zoom: number;
	onFinish: (
		mode: "editing" | "creating",
		text: string,
		fontSize: number,
		calculatedWidth: number,
		calculatedHeight: number,
	) => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
	isEditingText,
	editingElement,
	textCreationPosition,
	zoom,
	onFinish,
}) => {
	if (isEditingText === false) return null;

	return (
		<TextEditor
			element={editingElement}
			textCreationPosition={textCreationPosition}
			zoom={zoom}
			onFinish={onFinish}
		/>
	);
};
