import { useLanguage } from "../i18n/LanguageProvider";

export function PageLoader({ label }: { label?: string }) {
  const { text } = useLanguage();

  return (
    <div className="page-loader">
      <span className="page-loader__bits" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <p>
        {label ??
          text(
            "正在整理关系…",
            "Organizing the relationships…",
            "Холбоосуудыг эмхэлж байна…",
          )}
      </p>
    </div>
  );
}
