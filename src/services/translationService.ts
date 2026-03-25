import { STATIC_TRANSLATIONS } from "../data/translations/index";
import { translateToRussian as geminiTranslate } from "./geminiService";

export async function getVerseTranslation(book: string, chapter: number, verse: number, originalText: string): Promise<string> {
  const verseRef = `${book} ${chapter}:${verse}`;
  
  // Check all static portions for this specific verse
  for (const portion in STATIC_TRANSLATIONS) {
    if (STATIC_TRANSLATIONS[portion][verseRef]) {
      return STATIC_TRANSLATIONS[portion][verseRef];
    }
  }

  // Fallback to Gemini (or just return original if we want to avoid dynamic)
  // For now, let's keep Gemini as fallback but the user wants to "save and use"
  return geminiTranslate(originalText);
}

export function getStaticTranslation(book: string, chapter: number, verse: number): string | null {
  const verseRef = `${book} ${chapter}:${verse}`;
  for (const portion in STATIC_TRANSLATIONS) {
    if (STATIC_TRANSLATIONS[portion][verseRef]) {
      return STATIC_TRANSLATIONS[portion][verseRef];
    }
  }
  return null;
}
