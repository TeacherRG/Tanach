import React, { useState, useEffect } from "react";
import { Loader2, Globe } from "lucide-react";
import { db, doc, getDoc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from "../firebase";
import { translateToRussian } from "../services/geminiService";
import { useLanguage } from "../data/LanguageContext";

interface SharedCommentaryProps {
  day: number;
  index: string; // Unique ID for the snippet within the day
  originalText: string;
}

export default function SharedCommentary({ day, index, originalText }: SharedCommentaryProps) {
  const { language, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const translationId = `day_${day}_idx_${index.replace(/[^a-zA-Z0-9]/g, "_")}`;

  useEffect(() => {
    async function fetchTranslation() {
      if (language !== "ru") {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "translations", translationId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setTranslatedText(docSnap.data().translatedText);
          setLoading(false);
        } else {
          // If no translation exists, trigger it automatically
          setLoading(false);
          handleTranslate();
        }
      } catch (error) {
        console.error("Error fetching translation:", error);
        setLoading(false);
      }
    }

    fetchTranslation();
  }, [language, translationId]);

  const handleTranslate = async () => {
    if (translating || translatedText) return;
    
    setTranslating(true);
    try {
      const translated = await translateToRussian(originalText);
      
      // Save to Firestore for everyone
      const docRef = doc(db, "translations", translationId);
      await setDoc(docRef, {
        day,
        index: index,
        originalText,
        translatedText: translated,
        language: "ru",
        createdAt: serverTimestamp()
      });

      setTranslatedText(translated);
    } catch (error) {
      console.error("Translation failed:", error);
      // We don't use handleFirestoreError here to avoid crashing the whole app for one snippet
    } finally {
      setTranslating(false);
    }
  };

  if (loading || (language === "ru" && translating && !translatedText)) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#141414]/20 py-4">
        <Loader2 size={12} className="animate-spin" />
        {translating ? t("translating") : t("loading")}
      </div>
    );
  }

  const displayText = (language === "ru" && translatedText) ? translatedText : originalText;

  return (
    <div className="space-y-4">
      <div className="text-base leading-relaxed text-[#141414]/70 font-serif italic">
        <div dangerouslySetInnerHTML={{ __html: String(displayText) }} />
      </div>

      {language === "ru" && translatedText && (
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-green-500/50">
          <Globe size={10} />
          {t("sharedTranslation")}
        </div>
      )}
    </div>
  );
}
