import React, { useState, useEffect } from "react";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { Portion } from "../services/schedulerService";
import { getStaticTranslation } from "../services/translationService";

interface PrintPortionProps {
  portion: Portion;
  language: string;
  onLoaded?: () => void;
}

export default function PrintPortion({ portion, language, onLoaded }: PrintPortionProps) {
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

  useEffect(() => {
    if (!loading && onLoaded) {
      onLoaded();
    }
  }, [loading, onLoaded]);

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

  const trackLabel =
    portion.track === "neviim"
      ? language === "ru" ? "נביאים · Невиим" : "Nevi'im"
      : language === "ru" ? "כתובים · Ктувим" : "Ketuvim";

  const bookDisplay = language === "ru" ? portion.ruBook : portion.book;
  const refDisplay = language === "ru"
    ? portion.ruRef?.split(" ").slice(1).join(" ")
    : portion.ref?.split(" ").slice(1).join(" ") || "";

  return (
    <div className="pp-section">
      {/* Portion header */}
      <div className="pp-header">
        <span className="pp-track">{trackLabel}</span>
        <h1 className="pp-title">{bookDisplay} {refDisplay}</h1>
        <p className="pp-he-title" dir="rtl">{portion.heBook}</p>
      </div>

      {data.he.map((heVerse, idx) => {
        const verseNum = startVerse + idx;
        const ruTranslation = language === "ru"
          ? getStaticTranslation(portion.book, chapter, verseNum)
          : null;
        const fallbackTranslation = data.text?.[idx] || "";
        const translationText = ruTranslation ?? fallbackTranslation;

        return (
          <div key={idx} className="pp-verse">
            <div className="pp-verse-num">
              {language === "ru" ? `Стих ${verseNum}` : `Verse ${verseNum}`}
            </div>

            {/* Hebrew — RTL */}
            <div className="pp-verse-hebrew" dir="rtl" lang="he">
              <span dangerouslySetInnerHTML={{ __html: String(heVerse) }} />
            </div>

            {/* Translation — LTR for Russian/English */}
            {translationText && (
              <div className="pp-verse-translation" lang={language === "ru" ? "ru" : "en"}>
                <span dangerouslySetInnerHTML={{ __html: String(translationText) }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
