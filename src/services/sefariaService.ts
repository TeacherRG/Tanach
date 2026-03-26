import axios from "axios";

const SEFARIA_API_BASE = "https://www.sefaria.org/api/v2/texts";

const flatten = (text: unknown): string[] => {
  if (typeof text === "string") return [text];
  if (Array.isArray(text)) return text.flatMap(item => flatten(item));
  return [];
};

export interface SefariaResponse {
  he: string[];
  text: string[];
  ref: string;
  book: string;
  heBook: string;
  sections: number[];
  toSections: number[];
  commentary?: Array<{
    text?: string;
    he?: string;
    ref: string;
    author?: string;
    heAuthor?: string;
  }>;
}

export async function fetchText(ref: string): Promise<SefariaResponse> {
  if (!ref || ref === "Rest Day") {
    throw new Error("Invalid reference");
  }

  // Try v1 API first — it reliably supports commentary=1
  try {
    const encodedRef = encodeURIComponent(ref);
    const v1Response = await axios.get(`https://www.sefaria.org/api/texts/${encodedRef}?context=0&commentary=1`);
    const v1Data = v1Response.data;

    if (!v1Data.error) {
      return {
        he: flatten(v1Data.he),
        text: flatten(v1Data.text || v1Data.en),
        ref: v1Data.ref,
        book: v1Data.book,
        heBook: v1Data.heBook,
        sections: v1Data.sections || [],
        toSections: v1Data.toSections || [],
        commentary: v1Data.commentary || []
      };
    }
  } catch (e) {
    // Fall through to v2 variations
  }

  const lastSpaceIndex = ref.lastIndexOf(' ');
  if (lastSpaceIndex === -1) {
    throw new Error("Malformed reference format");
  }

  const bookName = ref.substring(0, lastSpaceIndex);
  const rawRange = ref.substring(lastSpaceIndex + 1);

  let range = rawRange;
  const rangeParts = rawRange.split('-');
  if (rangeParts.length === 2) {
    const startParts = rangeParts[0].split(':');
    const endParts = rangeParts[1].split(':');
    if (startParts.length === 2 && endParts.length === 2 && startParts[0] === endParts[0]) {
      range = `${startParts[0]}:${startParts[1]}-${endParts[1]}`;
    }
  }

  const canonicalRange = range.replace(/:/g, '.');
  const bookNameUnderscore = bookName.replace(/ /g, '_');

  // Try v2 API variations as fallback
  const variations = [
    `${bookNameUnderscore}.${canonicalRange}`,
    `${bookName}.${canonicalRange}`,
    `${bookNameUnderscore} ${range}`,
    `${bookName} ${range}`
  ];

  for (const vRef of variations) {
    try {
      const encodedRef = encodeURIComponent(vRef);
      const response = await axios.get(`${SEFARIA_API_BASE}/${encodedRef}?context=0&commentary=1`);
      const data = response.data;

      if (data.error) continue;

      return {
        he: flatten(data.he),
        text: flatten(data.en || data.text),
        ref: data.ref,
        book: data.book,
        heBook: data.heBook,
        sections: data.sections || [],
        toSections: data.toSections || [],
        commentary: data.commentary || []
      };
    } catch (e) {
      // Continue to next variation
    }
  }

  throw new Error(`All Sefaria fetch attempts failed for ref: ${ref}`);
}

export function formatRef(book: string, chapter: number, verse: number): string {
  return `${book} ${chapter}:${verse}`;
}

export interface SteinsaltzCommentaryEntry {
  verseNumber: number;
  chapter: number;
  text: string;
  ref: string; // e.g. "Steinsaltz on Joshua 3:11"
}

/**
 * Fetches Steinsaltz commentary directly from the dedicated Steinsaltz text in Sefaria.
 * This is more reliable than using commentary=1 on the base text, which often returns
 * only a subset of verses or attaches all commentary to the first verse.
 *
 * @param sefariaBookName - Canonical Sefaria book name, e.g. "Joshua" (book.name)
 * @param ref - Full display ref, e.g. "Yehoshua 3:1-17" (used to extract the range)
 */
export async function fetchSteinsaltzCommentary(
  sefariaBookName: string,
  ref: string
): Promise<SteinsaltzCommentaryEntry[]> {
  // Extract the numeric range: everything from the first digit to end of string
  const rangeMatch = ref.match(/(\d+.+)$/);
  if (!rangeMatch) return [];
  const range = rangeMatch[1]; // e.g. "3:1-17" or "1:15-2:5"

  const steinsaltzRef = `Steinsaltz on ${sefariaBookName} ${range}`;

  try {
    const encoded = encodeURIComponent(steinsaltzRef);
    const response = await axios.get(
      `https://www.sefaria.org/api/texts/${encoded}?context=0`
    );
    const data = response.data;
    if (data.error) throw new Error(data.error);

    // sections[0] = chapter, sections[1] = startVerse (for single-chapter ranges)
    const sections: number[] = data.sections || [];
    const startChapter = sections.length >= 2 ? sections[sections.length - 2] : 1;
    const startVerse = sections.length >= 1 ? sections[sections.length - 1] : 1;

    const rawText: unknown = data.text ?? data.en ?? [];
    const results: SteinsaltzCommentaryEntry[] = [];

    if (!Array.isArray(rawText)) return [];

    const isMultiChapter = rawText.length > 0 && Array.isArray(rawText[0]);

    if (isMultiChapter) {
      // Multi-chapter: [[verse1ch1, verse2ch1, ...], [verse1ch2, ...]]
      (rawText as unknown[][]).forEach((chapterArr, chIdx) => {
        const chapter = startChapter + chIdx;
        const chStartVerse = chIdx === 0 ? startVerse : 1;
        chapterArr.forEach((item, vIdx) => {
          const text =
            typeof item === "string" ? item
            : Array.isArray(item) ? (item as string[]).join("") : "";
          if (text.trim()) {
            const verse = chStartVerse + vIdx;
            results.push({
              verseNumber: verse,
              chapter,
              text,
              ref: `Steinsaltz on ${sefariaBookName} ${chapter}:${verse}`,
            });
          }
        });
      });
    } else {
      // Single chapter: [verse1, verse2, ...]
      (rawText as unknown[]).forEach((item, vIdx) => {
        const text =
          typeof item === "string" ? item
          : Array.isArray(item) ? (item as string[]).join("") : "";
        if (text.trim()) {
          const verse = startVerse + vIdx;
          results.push({
            verseNumber: verse,
            chapter: startChapter,
            text,
            ref: `Steinsaltz on ${sefariaBookName} ${startChapter}:${verse}`,
          });
        }
      });
    }

    return results;
  } catch (e) {
    console.warn(`[sefariaService] Steinsaltz fetch failed for "${steinsaltzRef}":`, e);
    return [];
  }
}
