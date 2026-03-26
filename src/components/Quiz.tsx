import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, ChevronRight, Trophy, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../data/LanguageContext";
import { Portion } from "../services/schedulerService";
import { fetchText } from "../services/sefariaService";
import { generateQuizQuestions, Question } from "../services/geminiService";
import { getStaticQuiz } from "../data/quizzes";
import { db, collection, addDoc, auth, handleFirestoreError, OperationType } from "../firebase";
import confetti from "canvas-confetti";

interface QuizProps {
  day: number;
  portion: Portion;
  onComplete: (score: number, totalQuestions: number) => void;
  isAdmin?: boolean;
}

export default function Quiz({ day, portion, onComplete, isAdmin }: QuizProps) {
  const { t, language } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);

  useEffect(() => {
    async function prepareQuiz() {
      // 1. Check if we have a static quiz for this portion
      const staticQuiz = getStaticQuiz(portion.ref, language);
      if (staticQuiz) {
        setQuestions(staticQuiz);
        setLoading(false);
        return;
      }

      // For regular users, if no curated questions exist, don't generate them
      if (!isAdmin) {
        setLoading(false);
        setQuestions([]);
        return;
      }

      setLoading(true);
      try {
        // 2. Fallback to dynamic generation if no static quiz exists (only for admins)
        const data = await fetchText(portion.ref);
        const text = data.text.join(" ");
        const commentary = data.commentary?.map(c => c.text || c.he || "").join("\n") || "";
        const generated = await generateQuizQuestions(portion.ref, text, commentary, language);
        setQuestions(generated);
      } catch (error) {
        console.error("Failed to prepare quiz:", error);
      } finally {
        setLoading(false);
      }
    }
    prepareQuiz();
  }, [portion, language, isAdmin]);

  const handleCheck = () => {
    if (selectedIdx === null || questions.length === 0) return;
    
    const isCorrect = selectedIdx === questions[currentIdx].correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
    }
    setResults([...results, isCorrect]);
    setUserAnswers([...userAnswers, {
      questionId: questions[currentIdx].id,
      questionText: questions[currentIdx].text,
      selectedAnswer: selectedIdx,
      correctAnswer: questions[currentIdx].correctAnswer,
      isCorrect
    }]);
    setIsAnswered(true);
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      // Save attempt to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, "quiz_attempts"), {
            userId: auth.currentUser.uid,
            day,
            score,
            totalQuestions: questions.length,
            answers: userAnswers,
            createdAt: new Date()
          });
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.CREATE, "quiz_attempts");
          } catch {
            // Firestore save failed, but quiz should still complete
          }
        }
      }

      // Trigger confetti on finish
      if (score / questions.length >= 0.7) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#141414', '#F27D26', '#3B82F6', '#10B981']
        });
      }

      setIsFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-[#141414]/50" size={48} />
        <p className="text-[#141414]/50 italic">{language === "ru" ? "Генерация вопросов теста..." : "Generating quiz questions..."}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 bg-[#141414]/5 rounded-full flex items-center justify-center text-[#141414]/20">
          <Trophy size={40} />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">
            {language === "ru" ? "Тест скоро появится" : "Quiz Coming Soon"}
          </h3>
          <p className="text-[#141414]/50 italic">
            {language === "ru" 
              ? "Администратор еще не подготовил тест для этого чтения. Пожалуйста, загляните позже!" 
              : "The administrator hasn't prepared a quiz for this reading yet. Please check back later!"}
          </p>
        </div>
        <button
          onClick={() => onComplete(0, 0)}
          className="px-8 py-3 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all"
        >
          {t("returnToDashboard")}
        </button>
      </div>
    );
  }

  if (isFinished) {
    const isPass = score / questions.length >= 0.7;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto space-y-12 py-10"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`w-32 h-32 ${isPass ? "bg-yellow-50 text-yellow-500" : "bg-blue-50 text-blue-500"} rounded-full flex items-center justify-center shadow-inner relative`}
          >
            {isPass ? <Trophy size={64} /> : <Sparkles size={64} />}
            {isPass && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg"
              >
                <CheckCircle2 size={20} />
              </motion.div>
            )}
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-4xl font-bold mb-2">
              {isPass 
                ? (language === "ru" ? "Поздравляем!" : "Congratulations!") 
                : (language === "ru" ? "Тест завершен" : "Quiz Complete")}
            </h2>
            <p className="text-[#141414]/50 italic">
              {isPass 
                ? (language === "ru" ? "Вы отлично справились с сегодняшним чтением!" : "You've mastered today's reading!")
                : t("quizSubtitle").replace("{day}", day.toString())}
            </p>
          </motion.div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
            className="text-6xl font-bold text-[#141414]"
          >
            {score} / {questions.length}
          </motion.div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-widest font-bold text-[#141414]/40 px-4">{t("summary")}</h3>
          <div className="bg-white rounded-[32px] border border-[#141414]/5 overflow-hidden">
            {questions.map((q, idx) => (
              <div key={q.id} className={`p-6 flex items-center justify-between border-b border-[#141414]/5 last:border-0 ${results[idx] ? "bg-green-50/30" : "bg-red-50/30"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${results[idx] ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {results[idx] ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold line-clamp-1">{q.text}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#141414]/40">
                      {results[idx] ? t("correct") : `${t("incorrect")} • ${language === "ru" ? "Ответ" : "Answer"}: ${q.options[q.correctAnswer]}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onComplete(score, questions.length)}
          className="w-full py-5 bg-[#141414] text-white rounded-2xl font-bold text-lg hover:scale-[1.02] transition-all shadow-xl"
        >
          {t("returnToDashboard")}
        </button>
      </motion.div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header className="flex justify-between items-center">
        <h2 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">
          {t("questionOf").replace("{current}", (currentIdx + 1).toString()).replace("{total}", questions.length.toString())}
        </h2>
        <div className="w-32 h-2 bg-[#141414]/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#141414] transition-all duration-500" 
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="space-y-8">
        <h3 className="text-3xl font-bold leading-tight">{currentQuestion.text}</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = idx === currentQuestion.correctAnswer;
            const isSelected = selectedIdx === idx;
            
            let buttonClass = "border-[#141414]/10 bg-white hover:border-[#141414]/30";
            if (isSelected) {
              buttonClass = "border-[#141414] bg-[#141414] text-white shadow-lg";
            }
            
            if (isAnswered) {
              if (isCorrect) {
                buttonClass = "border-green-500 bg-green-500 text-white shadow-lg";
              } else if (isSelected) {
                buttonClass = "border-red-500 bg-red-500 text-white shadow-lg";
              } else {
                buttonClass = "border-[#141414]/5 bg-white text-[#141414]/20 opacity-50";
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => setSelectedIdx(idx)}
                className={`p-6 rounded-2xl border-2 text-left transition-all flex justify-between items-center group ${buttonClass}`}
              >
                <span className="text-lg font-medium">{option}</span>
                {isAnswered ? (
                  isCorrect ? <CheckCircle2 size={20} /> : (isSelected ? <XCircle size={20} /> : null)
                ) : (
                  isSelected && <CheckCircle2 size={20} className="text-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-3xl flex flex-col gap-4 ${selectedIdx === currentQuestion.correctAnswer ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedIdx === currentQuestion.correctAnswer ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {selectedIdx === currentQuestion.correctAnswer ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <p className="font-bold">{selectedIdx === currentQuestion.correctAnswer ? t("correct") + "!" : t("incorrect")}</p>
                {selectedIdx !== currentQuestion.correctAnswer && (
                  <p className="text-sm font-bold">
                    {language === "ru" ? "Правильный ответ" : "Correct answer"}: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </p>
                )}
              </div>
            </div>
            
            {currentQuestion.explanation && (
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${selectedIdx === currentQuestion.correctAnswer ? "bg-green-100/50" : "bg-red-100/50"}`}>
                <p className="font-bold mb-1 uppercase tracking-widest text-[10px] opacity-50">
                  {language === "ru" ? "Объяснение" : "Explanation"}
                </p>
                {currentQuestion.explanation}
                <div className="mt-2 text-[10px] font-bold">
                  <a 
                    href={`https://www.sefaria.org/${portion.ref.replace(/ /g, "_")}?with=Steinsaltz`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:opacity-70 transition-opacity"
                  >
                    {language === "ru" ? "Читать комментарий на Sefaria" : "Read commentary on Sefaria"}
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="flex justify-end pt-10">
        {!isAnswered ? (
          <button 
            disabled={selectedIdx === null}
            onClick={handleCheck}
            className={`px-10 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all ${
              selectedIdx === null 
                ? "bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed" 
                : "bg-[#141414] text-white hover:scale-105 shadow-xl"
            }`}
          >
            {t("checkAnswer")}
            <CheckCircle2 size={20} />
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="px-10 py-4 bg-[#141414] text-white rounded-full font-bold text-lg flex items-center gap-2 hover:scale-105 shadow-xl transition-all"
          >
            {currentIdx === questions.length - 1 ? t("finishQuiz") : t("nextQuestion")}
            <ChevronRight size={20} />
          </button>
        )}
      </footer>
    </div>
  );
}
