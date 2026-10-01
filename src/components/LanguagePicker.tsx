import { useEffect, useState } from "react";
import { HelpTip } from "./Ui";

export const TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ru", label: "Русский" },
  { code: "zh-CN", label: "中文" },
] as const;

function readGoogTrans(): string {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  const lang = match?.[1] ?? "en";
  return TRANSLATE_LANGUAGES.some((item) => item.code === lang) ? lang : "en";
}

function writeGoogTrans(lang: string) {
  const expire = lang === "en" ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Fri, 31 Dec 2099 23:59:59 GMT";
  const value = lang === "en" ? "" : `/en/${lang}`;
  const parts = [
    `googtrans=${value}; expires=${expire}; path=/`,
    `googtrans=${value}; expires=${expire}; path=/; domain=${window.location.hostname}`,
  ];
  for (const cookie of parts) document.cookie = cookie;
}

function applyCombo(lang: string) {
  const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (!combo) return false;
  combo.value = lang;
  combo.dispatchEvent(new Event("change"));
  return true;
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: Record<string, unknown>,
          elementId: string,
        ) => void;
      };
    };
  }
}

export function LanguagePicker() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const stored = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/)?.[1];
    const current = readGoogTrans();
    if (stored && stored !== current) writeGoogTrans("en");
    setLang(current);

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      if (document.querySelector(".goog-te-combo")) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: TRANSLATE_LANGUAGES.map((item) => item.code).join(","),
          autoDisplay: false,
        },
        "google_translate_element",
      );
      const current = readGoogTrans();
      if (current !== "en") applyCombo(current);
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }
  }, []);

  function onChange(next: string) {
    setLang(next);
    writeGoogTrans(next);
    if (!applyCombo(next)) {
      window.location.reload();
    }
  }

  return (
    <div className="language-picker notranslate" translate="no">
      <label className="language-picker-control" htmlFor="site-language">
        <span className="visually-hidden">Language</span>
        <svg
          className="language-picker-globe"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M4.6 7.5h14.8M4.6 16.5h14.8" />
        </svg>
        <select
          id="site-language"
          value={lang}
          onChange={(event) => onChange(event.target.value)}
        >
          {TRANSLATE_LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <svg
          className="language-picker-chevron"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
      {lang !== "en" ? (
        <HelpTip label="translation">
          This content was machine-translated from English and may vary from the original.
        </HelpTip>
      ) : null}
      <div id="google_translate_element" aria-hidden="true" />
    </div>
  );
}
