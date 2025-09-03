import { Provider } from "jotai";
import "./i18n";
import { Canvas } from "@canvas/canvas";
import { FilePanel } from "@panels/file";
import { IslandSwitcher } from "@components/island-switcher";
import TouchDeviceMessage from "@components/TouchDeviceMessage";
import { FontCacheInitializer } from "@components/font-cache-initializer";
import { useThemeManager } from "./hooks/useThemeManager";
import { useAppInitialization } from "./modules/app-initialization";
import { useBrowserControls } from "./modules/browser-controls";
import { useDragDrop, DragDropManager } from "./modules/drag-drop-manager";
import { usePersistence } from "./modules/persistence-manager";
import { useIslandKeyboardShortcuts } from "./utils/island-keyboard-shortcuts";
import { isTouchDevice } from "./utils/touch-detection";

function AppContent() {
	useAppInitialization();
	usePersistence();
	useBrowserControls();
	useThemeManager();
	useIslandKeyboardShortcuts();

	const { isDragOver, dragDropProps } = useDragDrop();

	return (
		<DragDropManager isDragOver={isDragOver} dragDropProps={dragDropProps}>
			<FontCacheInitializer />
			<FilePanel />
			<Canvas />
			<IslandSwitcher />
		</DragDropManager>
	);
}

export function App() {
	// Check if this is a touch device
	if (isTouchDevice()) {
		return <TouchDeviceMessage />;
	}

	return (
		<Provider>
			<AppContent />
		</Provider>
	);
}
