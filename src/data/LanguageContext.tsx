import React, { createContext, useContext, useState, useEffect } from "react";
import { UILanguage, translations } from "./translations";

interface LanguageContextType {
  language: UILanguage;
  setLanguage: (lang: UILanguage) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<UILanguage>(() => {
    const saved = localStorage.getItem("uiLanguage");
    if (saved) return saved as UILanguage;
    
    const browserLang = navigator.language.split("-")[0];
    if (["en", "ru", "he"].includes(browserLang)) {
      return browserLang as UILanguage;
    }
    
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("uiLanguage", language);
  }, [language]);

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
