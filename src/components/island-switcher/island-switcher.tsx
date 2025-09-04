import React, { useEffect, useRef, useMemo, useCallback } from "react";
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

	// Create preview generator instance with cleanup
	const previewGenerator = useMemo(() => new IslandPreviewGenerator(), []);

	// Preview cache to avoid regenerating SVGs
	const previewCache = useRef(new Map<string, string>());

	// Clear cache and cleanup when component unmounts
	useEffect(() => {
		return () => {
			previewCache.current.clear();
			previewGenerator.destroy();
		};
	}, [previewGenerator]);

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

	// Generate cached preview for an island - MOVED BEFORE EARLY RETURNS
	const getCachedPreview = useCallback(
		(island: any) => {
			if (!island || !island.elements) {
				return previewGenerator.generatePlaceholderPreview(island, {
					width: 120,
					height: 80,
				});
			}

			// Create cache key based on island content hash
			const cacheKey = `${island.id}-${island.elementCount}-${JSON.stringify(island.bounds)}`;

			// Check cache first
			let previewUrl = previewCache.current.get(cacheKey);

			if (!previewUrl) {
				// Generate new preview - always try SVG first
				try {
					previewUrl = previewGenerator.generateSVGPreview(island, {
						width: 120,
						height: 80,
					});

					// Validate the SVG preview
					if (
						!previewUrl ||
						previewUrl.length < 50 ||
						!previewUrl.startsWith("data:image/svg+xml")
					) {
						throw new Error("Invalid SVG preview generated");
					}

					previewCache.current.set(cacheKey, previewUrl);
				} catch (error) {
					console.warn(
						"SVG preview generation failed, using placeholder:",
						error,
					);
					// Fallback to placeholder
					previewUrl = previewGenerator.generatePlaceholderPreview(island, {
						width: 120,
						height: 80,
					});
					previewCache.current.set(cacheKey, previewUrl);
				}

				// Limit cache size to prevent memory issues
				if (previewCache.current.size > 50) {
					const firstKey = previewCache.current.keys().next().value;
					if (firstKey) {
						previewCache.current.delete(firstKey);
					}
				}
			}

			return previewUrl;
		},
		[previewGenerator],
	);

	// Render individual island item (memoized) - MOVED BEFORE EARLY RETURNS
	const renderIslandItem = useCallback(
		(index: number) => {
			const island = islands[index];
			if (!island) return null;

			const previewUrl = getCachedPreview(island);

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
					<div className="island-preview-container">
						<img
							src={previewUrl}
							alt={`Island ${index + 1} preview`}
							className="island-content-preview"
							loading="lazy"
						/>
					</div>
					<div className="island-name">
						Island {index + 1} ({island.elementCount} elements)
					</div>
				</div>
			);
		},
		[islands, currentIndex, selectIsland, confirmSelection, getCachedPreview],
	);

	// Memoized container width calculation for sliding window - MOVED BEFORE EARLY RETURNS
	const containerWidth = useMemo(() => {
		const itemOnlyWidth = 140; // Item width without gap
		const gapWidth = 16; // Gap between items
		const padding = 40; // Container padding (20px each side)

		// Always show a fixed window size for consistent experience
		const maxVisibleItems = Math.min(5, islands.length);

		// For single item, use just the item width plus padding
		if (islands.length === 1) {
			return itemOnlyWidth + padding;
		}

		// Calculate width for the sliding window (shows up to maxVisibleItems)
		const visibleItemsWidth = maxVisibleItems * itemOnlyWidth;
		const visibleGapsWidth = Math.max(0, maxVisibleItems - 1) * gapWidth;

		return visibleItemsWidth + visibleGapsWidth + padding;
	}, [islands.length]);

	// Memoized carousel style calculation with sliding window behavior - MOVED BEFORE EARLY RETURNS
	const carouselStyle = useMemo(() => {
		const itemWidth = 156; // 140px + 16px gap (140px item + 16px gap)
		const itemOnlyWidth = 140; // actual item width without gap
		const gapWidth = 16;
		const totalCarouselWidth =
			islands.length * itemOnlyWidth +
			Math.max(0, islands.length - 1) * gapWidth;
		const availableContainerWidth = containerWidth - 40; // Account for container padding (20px each side)

		// Special case for single island - center it
		if (islands.length === 1) {
			return {
				width: `${totalCarouselWidth}px`,
				transform: `translateX(0px)`,
				transition: "transform 0.2s ease-out",
			};
		}

		// SLIDING WINDOW BEHAVIOR: Always center the selected item
		const selectedItemCenter = currentIndex[0] * itemWidth + itemOnlyWidth / 2;
		const containerCenter = availableContainerWidth / 2;

		// Calculate offset to center the selected item
		let offset = containerCenter - selectedItemCenter;

		// For very few items, don't scroll if everything fits
		if (totalCarouselWidth <= availableContainerWidth) {
			// Center the entire carousel if it fits completely
			offset = (availableContainerWidth - totalCarouselWidth) / 2;
		} else {
			// Apply bounds to prevent showing empty space at edges
			const maxOffset = 0; // Don't scroll past the beginning
			const minOffset = availableContainerWidth - totalCarouselWidth; // Don't scroll past the end
			offset = Math.max(minOffset, Math.min(maxOffset, offset));
		}

		return {
			width: `${totalCarouselWidth}px`,
			transform: `translateX(${offset}px)`,
			transition: "transform 0.2s ease-out", // Smooth sliding animation
		};
	}, [islands.length, currentIndex, containerWidth]);

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

	return (
		<div className="island-switcher-overlay">
			<div
				className="island-switcher-container"
				ref={containerRef}
				style={{ width: `${containerWidth}px` }}
			>
				<div className="island-switcher-strip">
					<div ref={carouselContainerRef} className="island-carousel-container">
						<div className="island-carousel" style={carouselStyle}>
							{islands.map((_island, index) => renderIslandItem(index))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
