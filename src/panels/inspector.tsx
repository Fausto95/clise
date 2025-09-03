import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInspectorState } from "./inspector/inspector-state-manager";
import { usePropertyUpdater } from "./inspector/property-updater";
import { SectionCoordinator } from "./inspector/section-coordinator";

export function InspectorPanel({ className }: { className?: string }) {
	const { t } = useTranslation();
	const { selectedElement, hasSelection, isChildOfFrame } = useInspectorState();
	const { updateElementProperty, updateImageSVGPaths } = usePropertyUpdater();

	if (!hasSelection || !selectedElement) {
		return null;
	}

	const handleUpdate = (id: string, patch: Partial<any>) => {
		updateElementProperty(selectedElement, id, patch);
	};

	return (
		<div className={`panel right ${className || ""}`} style={{ width: 340 }}>
			<div className="panel-header">
				<Settings size={20} />
				<strong>{t("inspector.title")}</strong>
			</div>
			<div className="panel-content">
				<SectionCoordinator
					element={selectedElement}
					isChildOfFrame={isChildOfFrame}
					onUpdate={handleUpdate}
					updateImageSVGPaths={updateImageSVGPaths}
				/>
			</div>
		</div>
	);
}
