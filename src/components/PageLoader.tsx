export function PageLoader({ label = "正在整理关系…" }: { label?: string }) {
  return (
    <div className="page-loader">
      <span className="page-loader__bits" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <p>{label}</p>
    </div>
  );
}
