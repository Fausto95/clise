import React, { useEffect, useRef, useState } from "react";
import { ColorPickerModal } from "./color-picker-modal";
import { isValidHex } from "../utils/color-utils";

interface StringColorInputProps {
	value: string;
	opacity?: number;
	showOpacity?: boolean;
	onChange: (color: string) => void;
	onOpacityChange?: (opacity: number) => void;
}

export function StringColorInput({
	value,
	opacity = 1,
	showOpacity = true,
	onChange,
	onOpacityChange,
}: StringColorInputProps) {
	// Display the hex without the leading # and uppercase (e.g., B1B2B5)
	const normalizeToDisplay = (hex: string) =>
		hex.replace(/^#/, "").toUpperCase();
	const [hexValue, setHexValue] = useState(normalizeToDisplay(value));
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalPosition, setModalPosition] = useState<
		{ x: number; y: number } | undefined
	>();
	const swatchRef = useRef<HTMLButtonElement>(null);

	// Update hex value when value prop changes
	useEffect(() => {
		setHexValue(normalizeToDisplay(value));
	}, [value]);

	const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let inputValue = e.target.value.toUpperCase();
		// Allow users to paste with or without #
		inputValue = inputValue.replace(/^#/, "");
		// Restrict to hex characters and max 6
		inputValue = inputValue.replace(/[^0-9A-F]/g, "").slice(0, 6);
		setHexValue(inputValue);
	};

	const handleHexInputBlur = () => {
		// Accept 3 or 6 length. If invalid, reset to current prop value
		const v = hexValue.trim();
		if (v.length === 3 || v.length === 6) {
			const normalized =
				v.length === 3
					? `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`
					: `#${v}`;
			if (isValidHex(normalized)) {
				onChange(normalized);
				setHexValue(normalizeToDisplay(normalized));
			} else {
				setHexValue(normalizeToDisplay(value));
			}
		} else if (v.length === 0) {
			// Empty -> revert
			setHexValue(normalizeToDisplay(value));
		} else {
			setHexValue(normalizeToDisplay(value));
		}
	};

	const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!onOpacityChange) return;
		const raw = e.target.value.replace(/[^0-9.]/g, "");
		const num = Math.max(0, Math.min(100, Number(raw)));
		onOpacityChange(num / 100);
	};

	const handleColorSwatchClick = () => {
		if (swatchRef.current) {
			const rect = swatchRef.current.getBoundingClientRect();
			const position = {
				x: rect.left + rect.width / 2,
				y: rect.bottom,
			};
			setModalPosition(position);
		}
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setModalPosition(undefined);
	};

	const handleColorChange = (
		color: string | import("../store/elements/element-types").Gradient,
	) => {
		// Only accept string values for this component
		if (typeof color === "string") {
			onChange(color);
		}
	};

	return (
		<>
			<div className="color-input-inline">
				<div className="color-composite">
					<button
						ref={swatchRef}
						type="button"
						className="color-swatch-btn"
						onClick={handleColorSwatchClick}
						title="Pick color"
						aria-label="Pick color"
					>
						<span
							className="color-swatch-preview"
							style={{ backgroundColor: value }}
						/>
					</button>

					<input
						type="text"
						value={hexValue}
						onChange={handleHexInputChange}
						onBlur={handleHexInputBlur}
						className="hex-field"
						placeholder="B1B2B5"
						spellCheck={false}
					/>

					{showOpacity && onOpacityChange && (
						<>
							<span className="color-divider" />
							<div className="opacity-field">
								<span className="opacity-prefix">%</span>
								<input
									type="number"
									min={0}
									max={100}
									step={1}
									value={Math.round(opacity * 100)}
									onChange={handleOpacityChange}
									className="opacity-input"
								/>
							</div>
						</>
					)}
				</div>
			</div>

			<ColorPickerModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				value={value}
				opacity={opacity}
				onChange={handleColorChange}
				onOpacityChange={onOpacityChange || (() => {})}
				position={modalPosition}
				anchorEl={swatchRef.current}
			/>
		</>
	);
}
