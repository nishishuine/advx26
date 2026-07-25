import { Link } from "react-router-dom";

type BrandProps = {
  compact?: boolean;
  inverted?: boolean;
};

export function Brand({ compact = false, inverted = false }: BrandProps) {
  return (
    <Link
      className={`brand ${compact ? "brand--compact" : ""} ${inverted ? "brand--inverted" : ""}`}
      to="/"
      aria-label="8bit 首页"
    >
      <span className="brand__mark" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <span className="brand__name">8bit</span>
      {!compact && <span className="brand__tagline">拆开世界，再重建</span>}
    </Link>
  );
}
