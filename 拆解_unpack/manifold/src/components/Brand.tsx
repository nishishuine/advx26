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
      aria-label="manifold 首页"
    >
      <span className="brand__name">manifold</span>
      {!compact && <span className="brand__tagline">拆开世界，再重建</span>}
    </Link>
  );
}
