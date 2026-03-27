import React, { useState, useEffect } from "react";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { Portion } from "../services/schedulerService";

interface PrintPortionProps {
  portion: Portion;
  onLoaded?: () => void;
}

export default function PrintPortion({ portion, onLoaded }: PrintPortionProps) {
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
    if (data.sections && data.sections.length > 0) {
      return data.sections[data.sections.length - 1];
    }
    const match = (data.ref || portion.ref).match(/:(\d+)/);
    return match ? parseInt(match[1]) : 1;
  })();

  const trackLabel = portion.track === "neviim" ? "Nevi'im" : "Ketuvim";
  const refDisplay = portion.ref.split(" ").slice(1).join(" ");

  return (
    <div className="pp-section">
      <div className="pp-header">
        <span className="pp-track">{trackLabel}</span>
        <h1 className="pp-title">{portion.book} {refDisplay}</h1>
        <p className="pp-he-title" dir="rtl">{portion.heBook}</p>
      </div>

      {data.he.map((heVerse, idx) => {
        const verseNum = startVerse + idx;
        const enText = data.text?.[idx] || "";

        return (
          <div key={idx} className="pp-verse">
            <div className="pp-verse-num">Verse {verseNum}</div>

            {/* Hebrew — RTL */}
            <div className="pp-verse-hebrew" dir="rtl" lang="he">
              <span dangerouslySetInnerHTML={{ __html: String(heVerse) }} />
            </div>

            {/* English translation — LTR */}
            {enText && (
              <div className="pp-verse-translation" lang="en">
                <span dangerouslySetInnerHTML={{ __html: String(enText) }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
