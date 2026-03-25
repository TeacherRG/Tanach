import React, { useState, useEffect } from "react";
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from "../firebase";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { History, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface QuizAttempt {
  id: string;
  userId: string;
  day: number;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    questionText: string;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
  }[];
  createdAt: any;
}

interface QuizHistoryViewProps {
  user: any;
}

export default function QuizHistoryView({ user }: QuizHistoryViewProps) {
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "quiz_attempts"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const atts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
      setAttempts(atts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "quiz_attempts");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getKnowledgeGaps = () => {
    const gaps: { [questionText: string]: number } = {};
    attempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        if (!answer.isCorrect) {
          gaps[answer.questionText] = (gaps[answer.questionText] || 0) + 1;
        }
      });
    });
    return Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#141414]"></div>
      </div>
    );
  }

  const gaps = getKnowledgeGaps();

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t("quizHistory")}</h1>
        <p className="text-[#141414]/50 italic">
          {attempts.length} {t("attempts")}
        </p>
      </header>

      {attempts.length === 0 ? (
        <div className="p-12 bg-white rounded-[40px] border border-dashed border-[#141414]/10 text-center space-y-4">
          <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto text-[#141414]/20">
            <History size={32} />
          </div>
          <p className="text-[#141414]/40 italic">{t("noHistory")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {attempts.map((attempt) => (
                <motion.div
                  key={attempt.id}
                  layout
                  className="bg-white rounded-[40px] border border-[#141414]/5 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}
                    className="w-full p-8 flex items-center justify-between hover:bg-[#141414]/5 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        attempt.score === attempt.totalQuestions ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {attempt.score}/{attempt.totalQuestions}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">{t("day")} {attempt.day}</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#141414]/30">
                          {attempt.createdAt ? new Date(attempt.createdAt.seconds * 1000).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                    {expandedAttempt === attempt.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  <AnimatePresence>
                    {expandedAttempt === attempt.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="border-t border-[#141414]/5 bg-[#F5F5F0]/30"
                      >
                        <div className="p-8 space-y-6">
                          {attempt.answers.map((answer, idx) => (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-start gap-3">
                                {answer.isCorrect ? (
                                  <CheckCircle2 size={18} className="text-green-500 mt-1 shrink-0" />
                                ) : (
                                  <XCircle size={18} className="text-red-500 mt-1 shrink-0" />
                                )}
                                <p className="font-bold text-[#141414]/80">{answer.questionText}</p>
                              </div>
                              {!answer.isCorrect && (
                                <div className="ml-7 p-3 bg-red-50 rounded-2xl text-xs text-red-600">
                                  <span className="font-bold uppercase tracking-widest opacity-50 block mb-1">
                                    {t("incorrect")}
                                  </span>
                                  {/* In a real app we'd show the selected vs correct option text here */}
                                  {t("checkAnswer")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-8">
            <section className="bg-[#141414] text-white p-8 rounded-[40px] shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-amber-400" />
                <h2 className="text-xl font-bold">{t("gaps")}</h2>
              </div>
              <p className="text-white/60 text-sm italic">
                {t("gapsSubtitle")}
              </p>
              <div className="space-y-4">
                {gaps.length === 0 ? (
                  <p className="text-white/40 text-xs italic">No gaps identified yet. Keep it up!</p>
                ) : (
                  gaps.map(([text, count], idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <p className="text-sm font-medium">{text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                          {count} {count === 1 ? "miss" : "misses"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
