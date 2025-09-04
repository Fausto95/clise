import { TabletSmartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TouchDeviceMessageProps {
  className?: string;
}

/**
 * Component that displays a message to users on mobile devices
 * informing them that mobile support is coming soon
 */
export function TouchDeviceMessage({
  className = "",
}: TouchDeviceMessageProps) {
  const { t } = useTranslation();

  return (
    <div className={`touch-device-message ${className}`}>
      <div className="touch-device-content">
        <div className="touch-device-icon">
          <TabletSmartphone size={32} />
        </div>
        <h1 className="touch-device-title">{t("touchDevice.title")}</h1>
        <p className="touch-device-description">
          {t("touchDevice.description")}
        </p>

        <div className="touch-device-features">
          <h3 className="touch-device-features-title">
            {t("touchDevice.features.title")}
          </h3>
          <ul className="touch-device-features-list">
            {[
              t("touchDevice.features.items.0"),
              t("touchDevice.features.items.1"),
              t("touchDevice.features.items.2"),
              t("touchDevice.features.items.3"),
            ].map((feature: string, index: number) => (
              <li key={index} className="touch-device-feature-item">
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="touch-device-footer">
          <p className="touch-device-note">{t("touchDevice.note")}</p>
        </div>
      </div>
    </div>
  );
}

export default TouchDeviceMessage;
