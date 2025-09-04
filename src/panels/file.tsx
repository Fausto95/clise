import {
	ChevronDown,
	Download,
	FolderOpen,
	Menu,
	Plus,
	Save,
} from "lucide-react";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../components/ConfirmProvider";
import { captureError } from "../utils/sentry";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeToggle } from "../components/ThemeToggle";
import { useFileOperations } from "../store/file-hooks";

export function FilePanel() {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { exportAll, importFile, newDocument } = useFileOperations();
	const toast = useToast();
	const confirmModal = useConfirm();

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleNew = async () => {
		const ok = await confirmModal({
			message: t(
				"file.confirmNew",
				"Create a new document? This will clear all current elements.",
			),
		});
		if (ok) newDocument();
		setIsOpen(false);
	};

	const handleOpen = async () => {
		try {
			const result = await importFile(true); // Replace existing
			if (result) {
				// File imported successfully
			}
		} catch (error) {
			captureError(error as Error, { context: "Failed to open file" });
			toast(
				t(
					"file.openError",
					"Failed to open file. Please check the file format.",
				),
				"error",
			);
		}
		setIsOpen(false);
	};

	const handleSave = () => {
		// Save functionality to be implemented
		setIsOpen(false);
	};

	const handleExport = async () => {
		try {
			await exportAll();
		} catch (error) {
			captureError(error as Error, { context: "Failed to export" });
			toast(t("file.exportError", "Failed to export file."), "error");
		}
		setIsOpen(false);
	};

	return (
		<div className="topnav">
			<div className="file-dropdown" ref={dropdownRef}>
				<button className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
					<Menu size={16} />
					<ChevronDown
						size={14}
						className={`chevron ${isOpen ? "open" : ""}`}
					/>
				</button>

				{isOpen && (
					<div className="dropdown-menu">
						<button className="dropdown-item" onClick={handleNew}>
							<Plus size={16} />
							<span>{t("file.new", "New")}</span>
						</button>
						<button className="dropdown-item" onClick={handleOpen}>
							<FolderOpen size={16} />
							<span>{t("file.open", "Open")}</span>
						</button>
						<button className="dropdown-item" onClick={handleSave}>
							<Save size={16} />
							<span>{t("file.save", "Save")}</span>
						</button>
						<button className="dropdown-item" onClick={handleExport}>
							<Download size={16} />
							<span>{t("file.export", "Export")}</span>
						</button>
						<div className="dropdown-separator" />
						<div className="dropdown-item language-switcher-item">
							<LanguageSwitcher />
						</div>
						<div className="dropdown-item language-switcher-item">
							<ThemeToggle />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
