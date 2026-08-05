"use client";

import { useLanguage } from "../lib/LanguageContext";

const OPTIONS = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <div className="flex items-center gap-1 border border-line rounded-full p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          onClick={() => setLocale(o.code)}
          className={`font-mono text-xs px-2.5 py-1 rounded-full transition-colors ${
            locale === o.code ? "bg-gold text-ink font-bold" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
