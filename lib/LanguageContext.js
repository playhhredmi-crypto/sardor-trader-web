"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, LOCALES } from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState("uz");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("locale") : null;
    if (saved && LOCALES.includes(saved)) setLocale(saved);
  }, []);

  const changeLocale = (next) => {
    if (!LOCALES.includes(next)) return;
    setLocale(next);
    if (typeof window !== "undefined") window.localStorage.setItem("locale", next);
  };

  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
