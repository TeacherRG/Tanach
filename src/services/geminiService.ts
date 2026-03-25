import { GoogleGenAI, Type } from "@google/genai";

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

export async function translateToRussian(text: string): Promise<string> {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following Jewish commentary on Tanakh to Russian. 
      
      CRITICAL TERMINOLOGY RULE:
      Use traditional Jewish terminology and names as used in Russian-speaking Orthodox communities.
      - Use "Вс-вышний", "Г-сподь", or "Ашем" for G-d. Use hyphens in G-d's names (Б-г, Г-сподь).
      - Use "Танах" instead of "Ветхий Завет".
      - Use "Моше" instead of "Моисей".
      - Use "Йеошуа" instead of "Иисус Навин".
      - Use "Аарон" (with double 'a').
      - Use "Йерихо" instead of "Иерихон".
      - Use "Бней Исраэль" instead of "сыны Израилевы".
      - Use "Арон а-Кодеш" or "Арон а-Брит" instead of "Ковчег".
      - Use "Коэны" instead of "священники".
      - Use "Левиты" instead of "левиты".
      - Use "Мишкан" instead of "Скиния".
      - Use "Шломо" instead of "Соломон".
      - Use "Яаков" instead of "Иаков".
      
      CRITICAL FORMATTING RULE: 
      In this commentary (Steinsaltz style), the original Hebrew/Aramaic words being commented on are usually wrapped in <b> tags or appear at the start of a phrase. 
      You MUST preserve these <b> tags around the translated equivalent of the original words. 
      The commentary text itself should be in regular font.
      
      Example: "<b>ויהי</b> - and it was" -> "<b>И было</b> — и случилось"
      
      Maintain the tone and accuracy. Keep all HTML tags.
      
      Text: ${text}`,
      config: {
        systemInstruction: "You are an expert translator specializing in Jewish religious texts and commentaries for the Russian-speaking Orthodox community. You understand the Steinsaltz commentary style where the base text is bolded and the explanation is plain text. You strictly use traditional Jewish terminology (Moshe, Yehoshua, Tanakh, Bnei Israel, etc.) in your translations. Translate clearly and accurately into Russian, preserving this distinction.",
      }
    });
    
    return response.text || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export async function generateQuizQuestions(ref: string, text: string, commentary: string, language: string): Promise<Question[]> {
  try {
    const verseCount = text.split(/[.!?]/).filter(s => s.trim().length > 0).length;
    const numQuestions = Math.min(Math.max(Math.floor(verseCount / 3), 3), 10);

    const prompt = `Generate ${numQuestions} multiple-choice questions based on the following Tanakh portion (${ref}) and its commentary. 
    The questions should test deep understanding of both the biblical text and the provided Steinsaltz commentary. 
    At least 30% of the questions MUST be specifically about the insights from the commentary.
    
    For each question, provide a brief explanation (1-2 sentences) explaining why the correct answer is right, referencing the text or commentary where appropriate.
    
    CRITICAL TERMINOLOGY RULE:
    Use traditional Jewish terminology and names in both English and Russian.
    - English: Use "Moshe", "Yehoshua", "Tanakh", "Bnei Israel", "Aron HaBrit", "Kohanim", "Yericho".
    - Russian: Use "Моше", "Йеошуа", "Танах", "Бней Исраэль", "Арон а-Брит", "Коэны", "Йерихо".
    
    Provide the output in ${language === "ru" ? "Russian" : "English"}.
    
    Biblical Text: ${text}
    
    Commentary: ${commentary}`;

    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Tanakh methodologist and educator. Your task is to generate high-quality, pedagogically sound multiple-choice questions. You strictly use traditional Jewish terminology (Moshe, Yehoshua, Tanakh, Bnei Israel, etc.). The questions should vary in difficulty and test both factual recall and deep conceptual understanding of the biblical text and the Steinsaltz commentary. Ensure that the distractors (incorrect options) are plausible but clearly wrong for someone who has studied the material. Return the response as a JSON array of objects with fields: id (number), text (string), options (array of 4 strings), correctAnswer (index 0-3), explanation (string).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              text: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "text", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const questions = JSON.parse(response.text || "[]");
    return questions;
  } catch (error) {
    console.error("Quiz generation error:", error);
    // Fallback to empty or generic if failed
    return [];
  }
}
