import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	hexToHsv,
	hsvToHex,
	normalizeHex,
	isValidHex,
	type HSV,
} from "../utils/color-utils";
import type { Gradient } from "../store/elements/element-types";
import { GradientUtils } from "../canvas/canvaskit/rendering/gradient-utils";

type FillType = "solid" | "linear" | "radial" | "mesh";

interface ColorPickerModalProps {
	isOpen: boolean;
	onClose: () => void;
	value: string | Gradient;
	opacity: number;
	onChange: (value: string | Gradient) => void;
	onOpacityChange: (opacity: number) => void;
	position?: { x: number; y: number };
	anchorEl?: HTMLElement | null;
}

export function ColorPickerModal({
	isOpen,
	onClose,
	value,
	opacity,
	onChange,
	onOpacityChange,
	position,
	anchorEl,
}: ColorPickerModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const [hsv, setHsv] = useState<HSV>({ h: 0, s: 0, v: 100 });
	const [hexInput, setHexInput] = useState("");
	const [opacityInput, setOpacityInput] = useState(100);
	const [isDragging, setIsDragging] = useState<
		"color" | "hue" | "opacity" | null
	>(null);

	// Smart positioning
	const [modalStyle, setModalStyle] = useState<React.CSSProperties | null>(
		null,
	);

	const computeSmartPosition = useCallback(() => {
		// Default modal dimensions
		const defaultWidth = 280;
		const defaultHeight = 400;
		const padding = 10;
		const gap = 10; // space between anchor and modal

		// Resolve anchor position (prefer ref rect if provided)
		let anchorX: number | null = null;
		let anchorTop: number | null = null;
		let anchorBottom: number | null = null;

		if (anchorEl) {
			const rect = anchorEl.getBoundingClientRect();
			anchorX = rect.left + rect.width / 2;
			anchorTop = rect.top;
			anchorBottom = rect.bottom;
		} else if (position) {
			anchorX = position.x;
			anchorTop = position.y;
			anchorBottom = position.y; // best effort without height
		}

		// If we have no anchor info, center the modal
		if (anchorX == null || anchorTop == null || anchorBottom == null) {
			setModalStyle({
				position: "fixed",
				left: "50%",
				top: "50%",
				transform: "translate(-50%, -50%)",
			});
			return;
		}

		// Prefer VisualViewport for better mobile behavior
		const vv =
			(typeof window !== "undefined" && (window as any).visualViewport) || null;
		const viewportWidth = vv?.width ?? window.innerWidth;
		const viewportHeight = vv?.height ?? window.innerHeight;
		const viewportOffsetTop = vv?.offsetTop ?? 0;

		// Measure modal size if possible
		const measuredWidth = modalRef.current?.offsetWidth || defaultWidth;
		const measuredHeight = modalRef.current?.offsetHeight || defaultHeight;

		// Horizontal placement: center on anchor, clamp within viewport
		let left = anchorX;
		const minLeft = padding + measuredWidth / 2;
		const maxLeft = viewportWidth - padding - measuredWidth / 2;
		left = Math.max(minLeft, Math.min(maxLeft, left));

		// Vertical placement: prefer below; flip above if overflowing
		let top = anchorBottom + gap;
		if (top + measuredHeight > viewportHeight - padding + viewportOffsetTop) {
			// Try placing above the anchor
			top = anchorTop - measuredHeight - gap;
		}
		// Clamp to viewport if still overflowing
		top = Math.max(
			padding + viewportOffsetTop,
			Math.min(
				viewportOffsetTop + viewportHeight - padding - measuredHeight,
				top,
			),
		);

		setModalStyle({
			position: "fixed",
			left: `${left}px`,
			top: `${top}px`,
			transform: "translateX(-50%)",
		});
	}, [anchorEl, position]);

	// Recompute when open, when anchor moves (scroll/resize), or size changes
	useEffect(() => {
		if (!isOpen) return;

		const frame = requestAnimationFrame(() => computeSmartPosition());
		// Run a couple extra frames to catch late layout shifts
		const frame2 = requestAnimationFrame(() => computeSmartPosition());
		const timeout = setTimeout(() => computeSmartPosition(), 150);

		const handleScroll = () => computeSmartPosition();
		const handleResize = () => computeSmartPosition();
		window.addEventListener("scroll", handleScroll, true);
		window.addEventListener("resize", handleResize);

		// VisualViewport listeners (mobile keyboards / zoom)
		const vv =
			(typeof window !== "undefined" && (window as any).visualViewport) || null;
		const handleVV = () => computeSmartPosition();
		vv?.addEventListener("resize", handleVV);
		vv?.addEventListener("scroll", handleVV);

		let ro: ResizeObserver | null = null;
		if (modalRef.current && "ResizeObserver" in window) {
			ro = new ResizeObserver(() => computeSmartPosition());
			ro.observe(modalRef.current);
		}

		let aro: ResizeObserver | null = null;
		if (anchorEl && "ResizeObserver" in window) {
			aro = new ResizeObserver(() => computeSmartPosition());
			aro.observe(anchorEl);
		}

		return () => {
			cancelAnimationFrame(frame);
			cancelAnimationFrame(frame2);
			clearTimeout(timeout);
			window.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleResize);
			vv?.removeEventListener("resize", handleVV);
			vv?.removeEventListener("scroll", handleVV);
			if (ro) ro.disconnect();
			if (aro) aro.disconnect();
		};
	}, [isOpen, computeSmartPosition, anchorEl]);

	// Computed fillType based on current value (more reliable than state)
	const currentFillType: FillType =
		typeof value === "string"
			? "solid"
			: typeof value === "object" && value !== null
				? (value.type as FillType)
				: "solid";

	// Update internal state when props change
	useEffect(() => {
		if (typeof value === "string" && isValidHex(value)) {
			// Solid color
			const normalized = normalizeHex(value);
			setHsv(hexToHsv(normalized));
			setHexInput(normalized.replace("#", "").toUpperCase());
		} else if (typeof value === "object" && value !== null) {
			// Gradient

			if (
				value.type === "mesh" &&
				value.controlPoints &&
				value.controlPoints.length > 0
			) {
				// For mesh gradients, use the first control point color
				const firstPoint = value.controlPoints[0];
				if (firstPoint && isValidHex(firstPoint.color)) {
					const normalized = normalizeHex(firstPoint.color);
					setHsv(hexToHsv(normalized));
					setHexInput(normalized.replace("#", "").toUpperCase());
				}
			} else if (value.stops && value.stops.length > 0) {
				// For linear/radial gradients, use the first stop color
				const firstStop = value.stops[0];
				if (firstStop && isValidHex(firstStop.color)) {
					const normalized = normalizeHex(firstStop.color);
					setHsv(hexToHsv(normalized));
					setHexInput(normalized.replace("#", "").toUpperCase());
				}
			}
		}
		setOpacityInput(Math.round(opacity * 100));
	}, [value, opacity]);

	// Handle clicks outside modal
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				modalRef.current &&
				!modalRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen, onClose]);

	// Handle escape key
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			return () => document.removeEventListener("keydown", handleEscape);
		}
	}, [isOpen, onClose]);

	const updateColor = useCallback(
		(newHsv: HSV) => {
			setHsv(newHsv);
			const hex = hsvToHex(newHsv);

			if (currentFillType === "solid") {
				onChange(hex);
			} else if (currentFillType === "mesh") {
				// For mesh gradients, update the first control point color
				if (
					typeof value === "object" &&
					value !== null &&
					value.type === "mesh" &&
					value.controlPoints
				) {
					const updatedGradient = {
						...value,
						controlPoints: value.controlPoints.map((point, index) =>
							index === 0 ? { ...point, color: hex } : point,
						),
					};
					onChange(updatedGradient);
				}
			} else {
				// For linear/radial gradients, update the first stop color
				if (typeof value === "object" && value !== null && value.stops) {
					const updatedGradient = {
						...value,
						stops: value.stops.map((stop, index) =>
							index === 0 ? { ...stop, color: hex } : stop,
						),
					};
					onChange(updatedGradient);
				}
			}
		},
		[onChange, currentFillType, value],
	);

	const handleFillTypeChange = useCallback(
		(newFillType: FillType) => {
			if (newFillType === "solid") {
				// Convert to solid color - use current HSV color
				const currentColor = hsvToHex(hsv);
				onChange(currentColor);
			} else {
				// Convert to gradient - use current color as primary color
				const currentColor = hsvToHex(hsv);
				let gradient: Gradient;

				switch (newFillType) {
					case "linear":
						gradient = GradientUtils.createDefaultLinearGradient(
							currentColor,
							"#ffffff",
						);
						break;
					case "radial":
						gradient = GradientUtils.createDefaultRadialGradient(
							currentColor,
							"#000000",
						);
						break;
					case "mesh":
						gradient = GradientUtils.createDefaultMeshGradient();
						// Update first control point to use current color
						if (gradient.controlPoints && gradient.controlPoints.length > 0) {
							const firstPoint = gradient.controlPoints[0];
							if (firstPoint) {
								gradient.controlPoints[0] = {
									...firstPoint,
									color: currentColor,
									x: firstPoint.x,
									y: firstPoint.y,
								};
							}
						}
						break;
					default:
						return;
				}
				onChange(gradient);
			}
		},
		[hsv, onChange],
	);

	const handleColorAreaMouseDown = (event: React.MouseEvent) => {
		if (!modalRef.current) return;

		setIsDragging("color");
		const rect = modalRef.current
			.querySelector(".color-area")
			?.getBoundingClientRect();
		if (!rect) return;

		const x = Math.max(
			0,
			Math.min(1, (event.clientX - rect.left) / rect.width),
		);
		const y = Math.max(
			0,
			Math.min(1, (event.clientY - rect.top) / rect.height),
		);

		const newHsv = {
			h: hsv.h,
			s: x * 100,
			v: (1 - y) * 100,
		};
		updateColor(newHsv);
	};

	const handleHueSliderMouseDown = (event: React.MouseEvent) => {
		if (!modalRef.current) return;

		setIsDragging("hue");
		const rect = modalRef.current
			.querySelector(".hue-slider")
			?.getBoundingClientRect();
		if (!rect) return;

		const x = Math.max(
			0,
			Math.min(1, (event.clientX - rect.left) / rect.width),
		);
		const newHsv = {
			h: x * 360,
			s: hsv.s,
			v: hsv.v,
		};
		updateColor(newHsv);
	};

	const handleOpacitySliderMouseDown = (event: React.MouseEvent) => {
		if (!modalRef.current) return;

		setIsDragging("opacity");
		const rect = modalRef.current
			.querySelector(".opacity-slider")
			?.getBoundingClientRect();
		if (!rect) return;

		const x = Math.max(
			0,
			Math.min(1, (event.clientX - rect.left) / rect.width),
		);
		const newOpacity = x;
		onOpacityChange(newOpacity);
		setOpacityInput(Math.round(newOpacity * 100));
	};

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging || !modalRef.current) return;

			if (isDragging === "color") {
				const rect = modalRef.current
					.querySelector(".color-area")
					?.getBoundingClientRect();
				if (!rect) return;

				const x = Math.max(
					0,
					Math.min(1, (event.clientX - rect.left) / rect.width),
				);
				const y = Math.max(
					0,
					Math.min(1, (event.clientY - rect.top) / rect.height),
				);

				const newHsv = {
					h: hsv.h,
					s: x * 100,
					v: (1 - y) * 100,
				};
				updateColor(newHsv);
			} else if (isDragging === "hue") {
				const rect = modalRef.current
					.querySelector(".hue-slider")
					?.getBoundingClientRect();
				if (!rect) return;

				const x = Math.max(
					0,
					Math.min(1, (event.clientX - rect.left) / rect.width),
				);
				const newHsv = {
					h: x * 360,
					s: hsv.s,
					v: hsv.v,
				};
				updateColor(newHsv);
			} else if (isDragging === "opacity") {
				const rect = modalRef.current
					.querySelector(".opacity-slider")
					?.getBoundingClientRect();
				if (!rect) return;

				const x = Math.max(
					0,
					Math.min(1, (event.clientX - rect.left) / rect.width),
				);
				const newOpacity = x;
				onOpacityChange(newOpacity);
				setOpacityInput(Math.round(newOpacity * 100));
			}
		},
		[isDragging, hsv, updateColor, onOpacityChange],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(null);
	}, []);

	useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	const handleHexInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		let inputValue = event.target.value.toUpperCase().replace(/[^0-9A-F]/g, "");
		if (inputValue.length > 6) inputValue = inputValue.slice(0, 6);
		setHexInput(inputValue);
	};

	const handleHexInputBlur = () => {
		if (hexInput.length === 3 || hexInput.length === 6) {
			const normalizedHex =
				hexInput.length === 3
					? `#${hexInput[0]}${hexInput[0]}${hexInput[1]}${hexInput[1]}${hexInput[2]}${hexInput[2]}`
					: `#${hexInput}`;

			if (isValidHex(normalizedHex)) {
				const newHsv = hexToHsv(normalizedHex);
				setHsv(newHsv);

				if (currentFillType === "solid") {
					onChange(normalizedHex);
				} else if (currentFillType === "mesh") {
					// For mesh gradients, update the first control point color
					if (
						typeof value === "object" &&
						value !== null &&
						value.type === "mesh" &&
						value.controlPoints
					) {
						const updatedGradient = {
							...value,
							controlPoints: value.controlPoints.map((point, index) =>
								index === 0 ? { ...point, color: normalizedHex } : point,
							),
						};
						onChange(updatedGradient);
					}
				} else {
					// For linear/radial gradients, update the first stop color
					if (typeof value === "object" && value !== null && value.stops) {
						const updatedGradient = {
							...value,
							stops: value.stops.map((stop, index) =>
								index === 0 ? { ...stop, color: normalizedHex } : stop,
							),
						};
						onChange(updatedGradient);
					}
				}
				setHexInput(normalizedHex.replace("#", "").toUpperCase());
			} else {
				// Reset to current value if invalid
				const currentHex =
					currentFillType === "solid" && typeof value === "string"
						? value
						: currentFillType === "mesh" &&
								typeof value === "object" &&
								value !== null &&
								value.type === "mesh" &&
								value.controlPoints?.[0]?.color
							? value.controlPoints[0].color
							: (typeof value === "object" &&
									value !== null &&
									value.stops?.[0]?.color) ||
								"#000000";
				setHexInput(currentHex.replace("#", "").toUpperCase());
			}
		} else {
			// Reset to current value if invalid length
			const currentHex =
				currentFillType === "solid" && typeof value === "string"
					? value
					: currentFillType === "mesh" &&
							typeof value === "object" &&
							value !== null &&
							value.type === "mesh" &&
							value.controlPoints?.[0]?.color
						? value.controlPoints[0].color
						: (typeof value === "object" &&
								value !== null &&
								value.stops?.[0]?.color) ||
							"#000000";
			setHexInput(currentHex.replace("#", "").toUpperCase());
		}
	};

	const handleOpacityInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		let inputValue = event.target.value;
		// Allow only numbers and limit to 3 characters
		inputValue = inputValue.replace(/[^0-9]/g, "");
		if (inputValue.length > 3) inputValue = inputValue.slice(0, 3);

		// Update the input display immediately
		setOpacityInput(inputValue ? Number(inputValue) : 0);

		// Update the actual opacity if we have a valid number
		if (inputValue !== "") {
			const num = Math.max(0, Math.min(100, parseInt(inputValue, 10)));
			onOpacityChange(num / 100);
		}
	};

	const handleOpacityInputBlur = () => {
		// Ensure we have a valid value when the user finishes editing
		if (!opacityInput && opacityInput !== 0) {
			const currentOpacity = Math.round(opacity * 100);
			setOpacityInput(currentOpacity);
		} else {
			const num = Math.max(0, Math.min(100, opacityInput || 0));
			setOpacityInput(num);
			onOpacityChange(num / 100);
		}
	};

	if (!isOpen) return null;

	const currentColor = hsvToHex(hsv);
	const colorAreaStyle = {
		background: `linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%)), linear-gradient(to bottom, transparent, #000)`,
	};

	const hueSliderStyle = {
		background: `linear-gradient(to right, 
      hsl(0, 100%, 50%), 
      hsl(60, 100%, 50%), 
      hsl(120, 100%, 50%), 
      hsl(180, 100%, 50%), 
      hsl(240, 100%, 50%), 
      hsl(300, 100%, 50%), 
      hsl(360, 100%, 50%))`,
	};

	const opacitySliderStyle = {
		background: `linear-gradient(to right, 
      transparent, 
      ${currentColor})`,
	};

	const colorAreaCursorStyle = {
		"--cursor-x": `${hsv.s}%`,
		"--cursor-y": `${100 - hsv.v}%`,
	} as React.CSSProperties;

	const hueSliderCursorStyle = {
		"--cursor-x": `${(hsv.h / 360) * 100}%`,
	} as React.CSSProperties;

	const opacitySliderCursorStyle = {
		"--cursor-x": `${opacity * 100}%`,
	} as React.CSSProperties;

	const modalInlineStyle = modalStyle || {
		position: "fixed" as const,
		left: "50%",
		top: "50%",
		transform: "translate(-50%, -50%)",
	};

	return createPortal(
		<div className="color-picker-overlay">
			<div
				ref={modalRef}
				className="color-picker-modal"
				style={modalInlineStyle}
			>
				<div className="color-picker-header">
					<select
						className="color-picker-fill-type-select"
						value={currentFillType}
						onChange={(e) => handleFillTypeChange(e.target.value as FillType)}
					>
						<option value="solid">Solid</option>
						<option value="linear">Linear</option>
						<option value="radial">Radial</option>
						<option value="mesh">Mesh</option>
					</select>
				</div>

				<div className="color-picker-content">
					{currentFillType === "solid" ? (
						<>
							{/* Main color selection area */}
							<div
								className="color-area"
								style={colorAreaStyle}
								onMouseDown={handleColorAreaMouseDown}
							>
								<div
									className="color-area-cursor"
									style={colorAreaCursorStyle}
								/>
							</div>

							{/* Hue slider */}
							<div
								className="hue-slider"
								style={hueSliderStyle}
								onMouseDown={handleHueSliderMouseDown}
							>
								<div
									className="hue-slider-cursor"
									style={hueSliderCursorStyle}
								/>
							</div>

							{/* Opacity slider */}
							<div
								className="opacity-slider"
								style={opacitySliderStyle}
								onMouseDown={handleOpacitySliderMouseDown}
							>
								<div
									className="opacity-slider-cursor"
									style={opacitySliderCursorStyle}
								/>
							</div>
						</>
					) : (
						<>
							{/* Gradient preview area */}
							{/* <div className="gradient-preview-area">
                <div
                  className="gradient-preview"
                  style={{
                    background:
                      fillType === "linear"
                        ? `linear-gradient(45deg, ${hsvToHex(hsv)}, #ffffff)`
                        : fillType === "radial"
                        ? `radial-gradient(circle, ${hsvToHex(hsv)}, #000000)`
                        : `conic-gradient(from 0deg, ${hsvToHex(
                            hsv
                          )}, #00ff00, #0000ff, #ffff00)`,
                  }}
                />
              </div> */}

							{/* Gradient controls */}
							<div className="gradient-controls">
								{/* Main color selection area for gradient first stop */}
								<div
									className="color-area"
									style={colorAreaStyle}
									onMouseDown={handleColorAreaMouseDown}
								>
									<div
										className="color-area-cursor"
										style={colorAreaCursorStyle}
									/>
								</div>

								{/* Hue slider */}
								<div
									className="hue-slider"
									style={hueSliderStyle}
									onMouseDown={handleHueSliderMouseDown}
								>
									<div
										className="hue-slider-cursor"
										style={hueSliderCursorStyle}
									/>
								</div>

								{/* Gradient type specific controls */}
								{currentFillType === "linear" &&
									typeof value === "object" &&
									value !== null &&
									value.type === "linear" && (
										<div className="gradient-linear-controls">
											<label className="gradient-control-label">Angle</label>
											<input
												type="range"
												min="0"
												max="360"
												step="1"
												value={
													(Math.atan2(
														value.endY - value.startY,
														value.endX - value.startX,
													) *
														180) /
														Math.PI +
													90
												}
												onChange={(e) => {
													const angle =
														((Number(e.target.value) - 90) * Math.PI) / 180;
													const length = 0.7;
													const updatedGradient = {
														...value,
														startX: 0.5 - (Math.cos(angle) * length) / 2,
														startY: 0.5 - (Math.sin(angle) * length) / 2,
														endX: 0.5 + (Math.cos(angle) * length) / 2,
														endY: 0.5 + (Math.sin(angle) * length) / 2,
													};
													onChange(updatedGradient);
												}}
												className="gradient-slider"
											/>
										</div>
									)}

								{currentFillType === "radial" &&
									typeof value === "object" &&
									value !== null &&
									value.type === "radial" && (
										<div className="gradient-radial-controls">
											<div className="gradient-control-group">
												<label className="gradient-control-label">
													Center X
												</label>
												<input
													type="range"
													min="0"
													max="1"
													step="0.01"
													value={value.centerX}
													onChange={(e) => {
														const updatedGradient = {
															...value,
															centerX: Number(e.target.value),
														};
														onChange(updatedGradient);
													}}
													className="gradient-slider"
												/>
											</div>
											<div className="gradient-control-group">
												<label className="gradient-control-label">
													Center Y
												</label>
												<input
													type="range"
													min="0"
													max="1"
													step="0.01"
													value={value.centerY}
													onChange={(e) => {
														const updatedGradient = {
															...value,
															centerY: Number(e.target.value),
														};
														onChange(updatedGradient);
													}}
													className="gradient-slider"
												/>
											</div>
											<div className="gradient-control-group">
												<label className="gradient-control-label">Radius</label>
												<input
													type="range"
													min="0"
													max="1"
													step="0.01"
													value={value.radius}
													onChange={(e) => {
														const updatedGradient = {
															...value,
															radius: Number(e.target.value),
														};
														onChange(updatedGradient);
													}}
													className="gradient-slider"
												/>
											</div>
										</div>
									)}

								{currentFillType === "mesh" && (
									<div className="gradient-mesh-info">
										<p className="gradient-info-text">
											Mesh gradients create smooth transitions between control
											points. Use the color picker above to adjust the primary
											color.
										</p>
									</div>
								)}
							</div>
						</>
					)}

					{/* Input fields */}
					<div className="color-picker-inputs">
						<div className="color-picker-inputs-inner">
							<input
								type="text"
								className="color-picker-input"
								value={hexInput}
								onChange={handleHexInputChange}
								onBlur={handleHexInputBlur}
								placeholder="0B37FF"
							/>
							<span className="color-picker-input-suffix">%</span>
							<input
								type="number"
								min={0}
								max={100}
								step={1}
								className="color-picker-input"
								value={opacityInput}
								onChange={handleOpacityInputChange}
								onBlur={handleOpacityInputBlur}
								placeholder="100"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
