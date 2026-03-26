import { GoogleGenAI, Type } from "@google/genai";
import aiPrompt from "../config/aiPrompt.json";

const MODEL = "gemini-2.5-flash-preview";

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface LessonResult {
  ruTranslation: string[];
  quiz: Array<{
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}

export async function generateLesson(heText: string[]): Promise<LessonResult> {
  const numQuestions = Math.min(Math.max(heText.length, 3), 10);
  const prompt = `${aiPrompt.taskPrompt}

Количество вопросов: ${numQuestions}.

Текст на иврите (каждый стих на новой строке):
${heText.join("\n")}

Верни ответ строго в JSON:
{
  "ruTranslation": ["перевод стиха 1", "перевод стиха 2", ...],
  "quiz": [
    {
      "text": "Вопрос?",
      "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
      "correctAnswer": 0,
      "explanation": "Краткое объяснение на русском"
    }
  ]
}`;

  const response = await getAI().models.generateContent({
    model: MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      systemInstruction: aiPrompt.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ruTranslation: { type: Type.ARRAY, items: { type: Type.STRING } },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["text", "options", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["ruTranslation", "quiz"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return {
    ruTranslation: result.ruTranslation,
    quiz: result.quiz.map((q: any, idx: number) => ({ ...q, id: `q_${idx}` }))
  };
}

export async function translateToRussian(text: string): Promise<string> {
  try {
    const prompt = `Переведи следующий комментарий к Танаху на русский язык. Сохраняй теги <b> вокруг оригинальных слов (стиль Штайнзальца). Сохраняй все HTML-теги. Текст: ${text}`;

    const response = await getAI().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: aiPrompt.systemInstruction
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
}

export async function generateQuizQuestions(ref: string, text: string, commentary: string, language: string): Promise<Question[]> {
  try {
    const verseCount = text.split(/[.!?]/).filter(s => s.trim().length > 0).length;
    const numQuestions = Math.min(Math.max(Math.floor(verseCount / 3), 3), 10);

    const prompt = `Составь ${numQuestions} вопросов с несколькими вариантами ответа по отрывку Танаха (${ref}) и комментарию к нему. Не менее 30% вопросов должны касаться комментария. Для каждого вопроса дай краткое объяснение правильного ответа. Язык ответа: ${language === "ru" ? "русский" : "английский"}.

Текст: ${text}

Комментарий: ${commentary}`;

    const response = await getAI().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: aiPrompt.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.NUMBER },
              text: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.NUMBER },
              explanation: { type: Type.STRING }
            },
            required: ["id", "text", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Quiz generation error:", error);
    return [];
  }
}
