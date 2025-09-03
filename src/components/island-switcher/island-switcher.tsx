import React, { useEffect, useRef, useMemo } from "react";
import { useIslandSwitcher, useIslands } from "@store/island-hooks";
import { IslandPreviewGenerator } from "@canvas/canvaskit/managers/island-preview-generator";
import "./island-switcher.css";

export const IslandSwitcher: React.FC = () => {
	const {
		isOpen,
		currentIndex,
		islandCount,
		closeSwitcher,
		selectIsland,
		confirmSelection,
		canSelect,
	} = useIslandSwitcher();

	const islands = useIslands();
	const containerRef = useRef<HTMLDivElement>(null);
	const carouselContainerRef = useRef<HTMLDivElement>(null);

	// Create preview generator instance
	const previewGenerator = useMemo(() => new IslandPreviewGenerator(), []);

	// Handle keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case "Escape":
					closeSwitcher();
					break;
				case "ArrowLeft":
					event.preventDefault();
					if (canSelect(currentIndex[0] - 1)) {
						selectIsland(currentIndex[0] - 1);
					}
					break;
				case "ArrowRight":
					event.preventDefault();
					if (canSelect(currentIndex[0] + 1)) {
						selectIsland(currentIndex[0] + 1);
					}
					break;
				case "Enter":
				case " ":
					event.preventDefault();
					confirmSelection();
					break;
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		currentIndex,
		islandCount,
		closeSwitcher,
		selectIsland,
		confirmSelection,
		canSelect,
	]);

	// Handle click outside to close
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				closeSwitcher();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, closeSwitcher]);

	if (!isOpen[0]) {
		return null;
	}

	// Handle empty state
	if (islandCount === 0 || !islands.length) {
		return (
			<div className="island-switcher-overlay">
				<div className="island-switcher-container" ref={containerRef}>
					<div className="island-switcher-strip">
						<div className="island-switcher-empty-state">
							<div className="island-empty-message">
								<div className="island-empty-icon">🏝️</div>
								<div className="island-empty-text">No islands detected</div>
								<div className="island-empty-subtext">
									Create some elements to see islands appear
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Render individual island item
	const renderIslandItem = (index: number) => {
		const island = islands[index];
		if (!island) return null;

		let previewContent;

		try {
			const svgUrl = previewGenerator.generateSVGPreview(island, {
				width: 120,
				height: 80,
			});

			previewContent = (
				<img
					src={svgUrl}
					alt={`Island ${index + 1} preview`}
					className="island-content-preview"
					onError={(e) => {
						// Try to show placeholder on error
						const target = e.target as HTMLImageElement;
						const placeholderUrl = previewGenerator.generatePlaceholderPreview(
							island,
							{
								width: 120,
								height: 80,
							},
						);
						target.src = placeholderUrl;
					}}
				/>
			);
		} catch (error) {
			// Fallback to placeholder
			const placeholderUrl = previewGenerator.generatePlaceholderPreview(
				island,
				{
					width: 120,
					height: 80,
				},
			);
			previewContent = (
				<img
					src={placeholderUrl}
					alt={`Island ${index + 1} preview (placeholder)`}
					className="island-content-preview"
				/>
			);
		}

		return (
			<div
				key={island.id}
				className={`island-item ${index === currentIndex[0] ? "selected" : ""}`}
				onClick={(e) => {
					e.stopPropagation();
					selectIsland(index);
					confirmSelection();
				}}
			>
				<div className="island-preview-container">{previewContent}</div>
				<div className="island-name">
					Island {index + 1} ({island.elementCount} elements)
				</div>
			</div>
		);
	};

	// Calculate container width based on number of islands
	const getContainerWidth = () => {
		const itemWidth = 156; // 140px + 16px gap
		const padding = 40; // Container padding (20px each side)
		const maxVisibleItems = 5;
		const visibleItems = Math.min(islands.length, maxVisibleItems);

		// For single item, use just the item width plus padding
		if (visibleItems === 1) {
			return itemWidth + padding;
		}

		// For multiple items, calculate based on visible items
		const gapWidth = 16; // gap between items
		const totalItemsWidth = visibleItems * 140; // item width without gap
		const totalGapsWidth = (visibleItems - 1) * gapWidth;

		return totalItemsWidth + totalGapsWidth + padding;
	};

	// Calculate carousel positioning
	const getCarouselStyle = () => {
		const itemWidth = 156; // 140px + 16px gap
		const padding = 20; // padding from CSS
		const totalCarouselWidth = islands.length * itemWidth;
		const containerWidth = getContainerWidth() - padding * 2; // Available width inside container

		// Special case for single island - no offset needed since container is sized to fit
		if (islands.length === 1) {
			return {
				width: `${totalCarouselWidth}px`,
				transform: `translateX(0px)`,
			};
		}

		// For multiple islands, use carousel logic
		const maxVisibleItems = 5;

		if (islands.length <= maxVisibleItems) {
			// Show all islands centered - no offset needed since container is sized to content
			return {
				width: `${totalCarouselWidth}px`,
				transform: `translateX(0px)`,
			};
		}

		// More than 5 islands - use scrolling carousel
		const currentItemCenter = currentIndex[0] * itemWidth + itemWidth / 2;
		const containerCenter = containerWidth / 2;
		let offset = containerCenter - currentItemCenter;

		// Apply bounds to prevent over-scrolling
		const maxOffset = padding;
		const minOffset = containerWidth - totalCarouselWidth + padding;
		offset = Math.max(minOffset, Math.min(maxOffset, offset));

		return {
			width: `${totalCarouselWidth}px`,
			transform: `translateX(${offset}px)`,
		};
	};

	return (
		<div className="island-switcher-overlay">
			<div
				className="island-switcher-container"
				ref={containerRef}
				style={{ width: `${getContainerWidth()}px` }}
			>
				<div className="island-switcher-strip">
					<div ref={carouselContainerRef} className="island-carousel-container">
						<div className="island-carousel" style={getCarouselStyle()}>
							{islands.map((_island, index) => renderIslandItem(index))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
