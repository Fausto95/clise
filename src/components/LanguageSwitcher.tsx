import { useState } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { captureError } from "../utils/sentry";

interface Language {
	code: string;
	name: string;
	flag: string;
}

const languages: Language[] = [
	{ code: "en", name: "English", flag: "🇺🇸" },
	{ code: "fr", name: "Français", flag: "🇫🇷" },
	{ code: "pt", name: "Português", flag: "🇵🇹" },
];

export const LanguageSwitcher: React.FC = () => {
	const { i18n } = useTranslation();
	const [isLoading, setIsLoading] = useState(false);

	const handleLanguageChange = async (
		e: React.ChangeEvent<HTMLSelectElement>,
	) => {
		const newLang = e.target.value;
		setIsLoading(true);
		try {
			await i18n.changeLanguage(newLang);
		} catch (error) {
			captureError("Failed to change language", { newLang, error });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<select
			value={i18n.language}
			onChange={handleLanguageChange}
			className="language-select"
			title="Change Language"
			disabled={isLoading}
		>
			{languages.map((language) => (
				<option key={language.code} value={language.code}>
					{language.flag} {language.name}{" "}
					{isLoading && language.code === i18n.language && "..."}
				</option>
			))}
		</select>
	);
};
