import { useEffect, useState } from "react";

export const TRANSLATE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "fr", label: "Français" },
  { code: "ko", label: "한국어" },
  { code: "uk", label: "Українська" },
  { code: "ru", label: "Русский" },
  { code: "sw", label: "Kiswahili" },
  { code: "ne", label: "नेपाली" },
  { code: "zh-CN", label: "中文" },
] as const;

function readGoogTrans(): string {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
  return match?.[1] ?? "en";
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
    setLang(readGoogTrans());

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
          className="language-picker-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
          />
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
      </label>
      <div id="google_translate_element" aria-hidden="true" />
    </div>
  );
}
