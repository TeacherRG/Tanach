import joshua1 from "./Joshua_1.json";

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

export const STATIC_QUIZZES: Record<string, Question[]> = {
  "Joshua 1:1-18": joshua1,
  // Add more as we go
};

export function getStaticQuiz(ref: string): Question[] | null {
  // Try exact match first
  if (STATIC_QUIZZES[ref]) return STATIC_QUIZZES[ref];
  
  // Try to find by book and chapter (e.g. "Joshua 1")
  const bookChapter = ref.split(':')[0]; // "Joshua 1"
  for (const key in STATIC_QUIZZES) {
    if (key.startsWith(bookChapter)) return STATIC_QUIZZES[key];
  }
  
  return null;
}
