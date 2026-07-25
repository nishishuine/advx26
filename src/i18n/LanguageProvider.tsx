import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "zh" | "en" | "mn";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: (chinese: string, english: string, mongolian: string) => string;
};

const STORAGE_KEY = "manifold-language";

const defaultText = (
  chinese: string,
  _english: string,
  _mongolian: string,
) => chinese;

const LanguageContext = createContext<LanguageContextValue>({
  locale: "zh",
  setLocale: () => undefined,
  text: defaultText,
});

function getInitialLocale(): Locale {
  try {
    const requested = new URLSearchParams(window.location.search).get(
      "lang",
    );
    if (requested === "zh" || requested === "en" || requested === "mn") {
      return requested;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "mn" ? saved : "zh";
  } catch {
    return "zh";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const text = useCallback(
    (chinese: string, english: string, mongolian: string) =>
      locale === "zh" ? chinese : locale === "en" ? english : mongolian,
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang =
      locale === "zh" ? "zh-CN" : locale === "en" ? "en" : "mn";
    document.title = text(
      "manifold · 拆开世界，再重建",
      "manifold · Understand it. Build it.",
      "manifold · Ойлгоод, дараа нь бүтээ",
    );

    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    description?.setAttribute(
      "content",
      text(
        "manifold 按理解所需拆解复杂对象，帮你看见关系，再重新组建。",
        "manifold reveals how complex things connect, then guides you to build them yourself.",
        "manifold нь нарийн төвөгтэй зүйлийн холбоосыг ойлгуулж, өөрийн гараар бүтээхэд чиглүүлнэ.",
      ),
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [locale, text]);

  const value = useMemo(
    () => ({ locale, setLocale, text }),
    [locale, text],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
