import { useLanguage } from "../i18n/LanguageProvider";

export function LanguageSwitch() {
  const { locale, setLocale, text } = useLanguage();

  return (
    <div
      className="language-switch"
      role="group"
      aria-label={text("切换语言", "Language", "Хэл")}
    >
      <button
        type="button"
        className={locale === "zh" ? "is-active" : undefined}
        aria-pressed={locale === "zh"}
        aria-label={text("切换为中文", "Switch to Chinese", "Хятад хэл рүү шилжих")}
        title={text("中文", "Chinese", "Хятад")}
        onClick={() => setLocale("zh")}
      >
        中
      </button>
      <button
        type="button"
        className={locale === "en" ? "is-active" : undefined}
        aria-pressed={locale === "en"}
        aria-label={text("切换为英文", "Switch to English", "Англи хэл рүү шилжих")}
        title="English"
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={locale === "mn" ? "is-active" : undefined}
        aria-pressed={locale === "mn"}
        aria-label={text("切换为蒙古文", "Switch to Mongolian", "Монгол хэл рүү шилжих")}
        title="Монгол"
        onClick={() => setLocale("mn")}
      >
        MN
      </button>
    </div>
  );
}
