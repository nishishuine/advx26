import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageProvider";

type BrandProps = {
  compact?: boolean;
  inverted?: boolean;
};

export function Brand({ compact = false, inverted = false }: BrandProps) {
  const { text } = useLanguage();

  return (
    <Link
      className={`brand ${compact ? "brand--compact" : ""} ${inverted ? "brand--inverted" : ""}`}
      to="/"
      aria-label={text(
        "manifold 首页",
        "manifold home",
        "manifold нүүр хуудас",
      )}
    >
      <span className="brand__name">manifold</span>
      {!compact && (
        <span className="brand__tagline">
          {text(
            "拆开世界，再重建",
            "Understand it, then build it",
            "Ойлгоод, дараа нь бүтээ",
          )}
        </span>
      )}
    </Link>
  );
}
