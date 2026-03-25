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
  
  // Try multiple variations for v2
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

  // Fallback to v1
  try {
    const originalEncodedRef = encodeURIComponent(ref);
    const v1Response = await axios.get(`https://www.sefaria.org/api/texts/${originalEncodedRef}?context=0&commentary=1`);
    const v1Data = v1Response.data;
    
    if (v1Data.error) throw new Error(v1Data.error);

    return {
      ...v1Data,
      he: flatten(v1Data.he),
      text: flatten(v1Data.text || v1Data.en),
      sections: v1Data.sections || [],
      toSections: v1Data.toSections || [],
      commentary: v1Data.commentary || []
    };
  } catch (v1Error) {
    console.error(`All Sefaria fetch attempts failed for ref: ${ref}`, v1Error);
    throw v1Error;
  }
}

export function formatRef(book: string, chapter: number, verse: number): string {
  return `${book} ${chapter}:${verse}`;
}
