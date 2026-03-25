import React, { useState, useEffect } from "react";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { Portion } from "../services/schedulerService";
import { getStaticTranslation } from "../services/translationService";
import { useLanguage } from "../data/LanguageContext";

interface PrintPortionProps {
  portion: Portion;
  language: string;
}

export default function PrintPortion({ portion, language }: PrintPortionProps) {
  const [data, setData] = useState<SefariaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchText(portion.ref);
        setData(res);
      } catch (err) {
        console.error("Failed to fetch text for print:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [portion.ref]);

  if (loading || !data) return null;

  const startVerse = (() => {
    if (data?.sections && data.sections.length > 0) {
      return data.sections[data.sections.length - 1];
    }
    const ref = data?.ref || portion.ref;
    const match = ref.match(/:(\d+)/);
    return match ? parseInt(match[1]) : 1;
  })();

  const chapter = (() => {
    if (data?.sections && data.sections.length > 0) {
      return data.sections[0];
    }
    const ref = data?.ref || portion.ref;
    const match = ref.match(/ (\d+):/);
    return match ? parseInt(match[1]) : 1;
  })();

  return (
    <div className="space-y-12 mb-20 last:mb-0">
      <header className="border-b-2 border-black pb-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {language === "ru" ? portion.ruBook : portion.book} {language === "ru" ? portion.ruRef?.split(" ").slice(1).join(" ") : portion.ref?.split(" ").slice(1).join(" ") || ""}
        </h1>
        <p className="text-gray-600 italic">{language === "ru" ? portion.ruRef : portion.ref}</p>
        <p className="text-xs mt-2 uppercase tracking-widest font-bold text-gray-400">
          {portion.track === 'neviim' ? (language === "ru" ? "Невиим" : "Nevi'im") : (language === "ru" ? "Ктувим" : "Ketuvim")}
        </p>
      </header>

      {data.he.map((heVerse, idx) => {
        const verseNum = startVerse + idx;
        const russianTranslation = language === "ru" ? getStaticTranslation(portion.book, chapter, verseNum) : null;
        const englishTranslation = data.text?.[idx] || "";

        return (
          <div key={idx} className="verse-print-block">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-xs font-bold text-gray-400">Verse {verseNum}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div dir="rtl" className="text-2xl leading-relaxed font-serif text-right">
                <div dangerouslySetInnerHTML={{ __html: String(heVerse) }} />
              </div>
              
              <div className="text-lg leading-relaxed text-gray-800 font-sans">
                {russianTranslation ? (
                  <div dangerouslySetInnerHTML={{ __html: russianTranslation }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: String(englishTranslation) }} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
