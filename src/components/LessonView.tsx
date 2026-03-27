import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { Portion } from "../services/schedulerService";
import { Loader2, MessageSquare, ChevronDown, ChevronUp, Pause, Volume2, BookOpen, Star, Share2, Printer, Check, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../data/LanguageContext";
import SharedCommentary from "./SharedCommentary";

import { GoogleGenAI, Modality } from "@google/genai";
import { db, collection, addDoc, auth, handleFirestoreError, OperationType, getDocs, query, orderBy } from "../firebase";
import { toast } from "sonner";
import { VOICES, SPEEDS } from "../constants";
import { pcmToWav } from "../lib/audioUtils";
import confetti from "canvas-confetti";

import PrintPortion from "./PrintPortion";

interface FirestoreVerse {
  verseNumber: number;
  chapter: number;
  heText: string;
  enText: string;
  commentary: {
    ref: string;
    enText: string;
    ruText: string;
    author: string;
  } | null;
}

interface LessonViewProps {
  day: number;
  portion: Portion;
  onComplete: () => void;
  onFinish: () => void;
  isAdmin?: boolean;
  userProfile?: any;
}

export default function LessonView({ day, portion, onComplete, onFinish, isAdmin, userProfile }: LessonViewProps) {
  const { language, t } = useLanguage();
  const [data, setData] = useState<SefariaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommentary, setExpandedCommentary] = useState<Record<number, boolean>>({});
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [savingFav, setSavingFav] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  const [viewMode, setViewMode] = useState<"step" | "full">("step");
  const [isPrintingLesson, setIsPrintingLesson] = useState(false);
  // Verse data loaded from Firestore: keyed by absolute verse number
  const [firestoreVerses, setFirestoreVerses] = useState<Map<number, FirestoreVerse> | null>(null);

  const textLanguage = userProfile?.textLanguage || "both";
  const voice = userProfile?.readingVoice || "Zephyr";
  const speed = userProfile?.readingSpeed || 1;

  const toggleCommentary = (idx: number) => {
    setExpandedCommentary(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handlePlayTts = async (verseIdx?: number) => {
    const idx = verseIdx !== undefined ? verseIdx : currentVerseIndex;
    
    if (isPlaying && audio) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (audio) {
      audio.play();
      setIsPlaying(true);
      return;
    }

    if (!data?.he || data.he.length === 0) return;

    setIsTtsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Read only the specified verse
      const currentVerse = data.he[idx].replace(/<[^>]*>/g, '');
      const prompt = `Read the following Hebrew text clearly: ${currentVerse}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice as any },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioUrl = pcmToWav(base64Audio);
        const newAudio = new Audio(audioUrl);
        newAudio.playbackRate = speed;
        newAudio.onended = () => setIsPlaying(false);
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("TTS Error:", err);
    } finally {
      setIsTtsLoading(false);
    }
  };

  useEffect(() => {
    if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed, audio]);

  useEffect(() => {
    // Cleanup audio on unmount or portion change or verse change
    return () => {
      if (audio) {
        audio.pause();
        const url = audio.src;
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        audio.src = "";
        setAudio(null);
        setIsPlaying(false);
      }
    };
  }, [audio, portion.ref, currentVerseIndex]);

  useEffect(() => {
    async function load() {
      setCurrentVerseIndex(0);
      setFirestoreVerses(null);
      setLoading(true);
      try {
        // 1. Try Firestore verses subcollection first (curated content)
        const lessonId = `${day}_${portion.track}`;
        const versesSnap = await getDocs(
          query(collection(db, "lessons", lessonId, "verses"), orderBy("verseNumber"))
        );

        if (!versesSnap.empty) {
          const map = new Map<number, FirestoreVerse>();
          versesSnap.docs.forEach(d => {
            const v = d.data() as FirestoreVerse;
            map.set(v.verseNumber, v);
          });
          setFirestoreVerses(map);

          const sorted = Array.from(map.values());
          // Build a SefariaResponse-compatible object so all existing rendering works
          setData({
            he: sorted.map(v => v.heText),
            text: sorted.map(v => v.enText),
            ref: portion.ref,
            book: portion.book,
            heBook: "",
            sections: [sorted[0]?.chapter ?? 1, sorted[0]?.verseNumber ?? 1],
            toSections: [sorted[0]?.chapter ?? 1, sorted[sorted.length - 1]?.verseNumber ?? 1],
            // Commentary array: one entry per verse that has Steinsaltz notes
            commentary: sorted
              .filter(v => v.commentary !== null)
              .map(v => ({
                ref: v.commentary!.ref,
                text: v.commentary!.enText,
                he: v.commentary!.enText,
                author: v.commentary!.author,
              }))
          });
          return;
        }

        // 2. Fallback: load live from Sefaria API
        const result = await fetchText(portion.ref);
        setData(result);
      } catch (err) {
        setError("Failed to load text from Sefaria. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [portion.ref, day, isAdmin]);

  const saveToFavorites = async (type: 'verse' | 'commentary', content: string, ref: string, id: string) => {
    if (!auth.currentUser) return;
    setSavingFav(id);
    try {
      await addDoc(collection(db, "favorites"), {
        userId: auth.currentUser.uid,
        type,
        content,
        ref,
        day,
        createdAt: new Date()
      });
      toast.success(t("saved"));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "favorites");
    } finally {
      setSavingFav(null);
    }
  };

  const handleShare = async () => {
    const shareRef = language === "ru" ? portion.ruRef : portion.ref;
    const shareText = t("shareText").replace("{ref}", shareRef);
    const shareUrl = window.location.href;

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success(language === "ru" ? "Ссылка скопирована!" : "Link copied to clipboard!");
      } catch (err) {
        console.error("Clipboard failed:", err);
        toast.error(language === "ru" ? "Не удалось скопировать" : "Failed to copy");
      }
    };

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tanakh365",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // If user canceled, don't show error but don't fallback either
        if ((err as Error).name === 'AbortError') {
          return;
        }
        // For other errors (like permission denied in iframe), fallback to clipboard
        console.warn("Native share failed, falling back to clipboard:", err);
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const handlePrintPortionLoaded = useCallback(() => {
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print error:", err);
        toast.error(language === "ru" ? "Ошибка при печати. Попробуйте Ctrl+P" : "Print failed. Try Ctrl+P");
      } finally {
        setTimeout(() => setIsPrintingLesson(false), 2000);
      }
    }, 300);
  }, [language]);

  const handlePrint = () => {
    toast.info(language === "ru" ? "Загрузка данных для печати..." : "Loading print data...");
    setIsPrintingLesson(true);
  };

  const nextVerse = () => {
    if (data?.he && currentVerseIndex < data.he.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
    }
  };

  const prevVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(prev => prev - 1);
    }
  };

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-[#141414]/50" size={48} />
        <p className="text-[#141414]/50 italic">{t("fetching")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <p className="text-red-500 font-medium">{t("failed")}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#141414] text-white rounded-full hover:bg-opacity-90 transition-all"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const handleComplete = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#141414', '#F27D26']
    });
    onComplete();
  };

  return (
    <>
      {/* Print portal — appended to <body> so CSS can isolate it */}
      {isPrintingLesson && ReactDOM.createPortal(
        <div className="print-portal">
          <PrintPortion portion={portion} language={language} onLoaded={handlePrintPortionLoaded} />
        </div>,
        document.body
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 print-reset"
      >

      {/* Header (Screen only) */}
      <header className="border-b border-[#141414]/10 pb-8 print-hidden">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-sm uppercase tracking-widest text-[#141414]/50 mb-1">{t("day")} {day}</h2>
            <h1 className="text-4xl font-bold tracking-tight">
              {language === "ru" ? portion.ruBook : portion.book} {language === "ru" ? portion.ruRef?.split(" ").slice(1).join(" ") : portion.ref?.split(" ").slice(1).join(" ") || ""}
            </h1>
            <p className="text-[#141414]/50 italic">{language === "ru" ? portion.ruRef : portion.ref}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePlayTts()}
              disabled={isTtsLoading}
              className={`p-3 rounded-full transition-all shadow-sm flex items-center justify-center min-w-[48px] ${
                isPlaying 
                  ? "bg-[#141414] text-white" 
                  : "bg-white border border-[#141414]/10 text-[#141414] hover:bg-[#141414]/5"
              }`}
            >
              {isTtsLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>

            <button 
              onClick={handleShare}
              className="p-3 bg-white border border-[#141414]/10 rounded-full hover:bg-[#141414]/5 transition-all shadow-sm"
              title={t("share")}
            >
              <Share2 size={20} />
            </button>

            <button 
              onClick={handlePrint}
              className="p-3 bg-white border border-[#141414]/10 rounded-full hover:bg-[#141414]/5 transition-all shadow-sm"
              title={t("print")}
            >
              <Printer size={20} />
            </button>

            <button 
              onClick={() => setViewMode(viewMode === "step" ? "full" : "step")}
              className="p-3 bg-white border border-[#141414]/10 rounded-full hover:bg-[#141414]/5 transition-all shadow-sm flex items-center gap-2 px-4"
              title={viewMode === "step" ? "Show Full Text" : "Show Step by Step"}
            >
              <BookOpen size={20} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                {viewMode === "step" ? "Full Text" : "Step View"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Text Content (Screen only) */}
      <div className="space-y-16 min-h-[40vh] print-hidden">
        {data?.he && data.he.length > 0 ? (
          viewMode === "step" ? (
            (() => {
              const idx = currentVerseIndex;
              const heVerse = data.he[idx];
              const verseNum = startVerse + idx;
              
              const verseCommentary = data.commentary?.filter(comm => {
                if (!comm || !comm.ref) return false;
                
                const isSteinsaltz = (comm.author?.toLowerCase().includes("steinsaltz") || 
                                     comm.heAuthor?.includes("שטיינזלץ") ||
                                     comm.ref.toLowerCase().includes("steinsaltz"));
                
                return isSteinsaltz && new RegExp(`${chapter}:${verseNum}(?:[^0-9]|$)`).test(comm.ref);
              }) || [];

              return (
                <div key={verseNum} className="space-y-8">
                  {/* Verse Navigation Controls */}
                  <div className="flex items-center justify-between bg-[#141414]/5 p-4 rounded-2xl">
                    <button
                      onClick={prevVerse}
                      disabled={currentVerseIndex === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#141414]/10 disabled:opacity-20 transition-all font-bold text-sm"
                    >
                      <ChevronLeft size={20} />
                      <span className="hidden sm:inline">{t("previous")}</span>
                    </button>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">
                      {t("verse")} {verseNum} ({currentVerseIndex + 1} / {data.he.length})
                    </span>
                    <button
                      onClick={nextVerse}
                      disabled={currentVerseIndex === data.he.length - 1}
                      className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#141414]/10 disabled:opacity-20 transition-all font-bold text-sm"
                    >
                      <span className="hidden sm:inline">{t("next")}</span>
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {/* Desktop/Landscape Layout: 2 Columns (Commentary Left, Hebrew Right) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-start">
                    {/* Right Column (Hebrew Original) */}
                    <div className="sm:order-2 space-y-8">
                      {(textLanguage === "he" || textLanguage === "both") && (
                        <div 
                          className="text-right text-3xl leading-relaxed font-serif relative"
                          dir="rtl"
                        >
                          <span className="absolute -right-8 top-1 text-[10px] font-bold text-[#141414]/20">{verseNum}</span>
                          <div dangerouslySetInnerHTML={{ __html: String(heVerse) }} />
                        </div>
                      )}
                      
                      {(textLanguage === "en" || textLanguage === "both") && (
                        <div className="text-xl leading-relaxed text-[#141414]/80 font-sans relative pr-12 border-t border-[#141414]/5 pt-6">
                          <span className="absolute -left-8 top-6 text-[10px] font-bold text-[#141414]/20">{verseNum}</span>
                          <div dangerouslySetInnerHTML={{ __html: String(data.text?.[idx] || "") }} />

                          <button
                            onClick={() => saveToFavorites('verse', String(data.text?.[idx] || ""), `${portion.book} ${chapter}:${verseNum}`, `v_${idx}`)}
                            disabled={savingFav === `v_${idx}`}
                            className="absolute right-0 top-6 p-2 text-[#141414]/20 hover:text-amber-400 transition-colors"
                            title={t("addToFavorites")}
                          >
                            {savingFav === `v_${idx}` ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Left Column (Commentary) */}
                    <div className="sm:order-1 space-y-6">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#141414]/30 mb-4">
                        <MessageSquare size={14} />
                        {t("commentary")}
                      </div>
                      
                      {verseCommentary.length > 0 ? (
                        <div className="space-y-4">
                          {verseCommentary.map((comm, cIdx) => {
                            const commId = `${verseNum}_${cIdx}`;
                            const originalText = comm.text || comm.he || "";
                            // If data came from Firestore, ruText is already stored on the verse
                            const ruText = firestoreVerses?.get(verseNum)?.commentary?.ruText ?? null;

                            return (
                              <div key={commId} className="bg-[#141414]/[0.02] p-6 rounded-[24px] border border-[#141414]/5 relative overflow-hidden group/comm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#141414]/10" />

                                <button
                                  onClick={() => saveToFavorites('commentary', originalText, `${portion.book} ${chapter}:${verseNum} (Commentary)`, `c_${commId}`)}
                                  disabled={savingFav === `c_${commId}`}
                                  className="absolute right-4 top-4 p-2 text-[#141414]/10 hover:text-amber-400 transition-colors opacity-0 group-hover/comm:opacity-100"
                                  title={t("addToFavorites")}
                                >
                                  {savingFav === `c_${commId}` ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                                </button>

                                {ruText ? (
                                  // Curated content: show stored Russian translation directly
                                  <div className="text-base leading-relaxed text-[#141414]/70 font-serif italic"
                                       dangerouslySetInnerHTML={{ __html: ruText }} />
                                ) : isAdmin ? (
                                  // Admin only: translate on-the-fly via Gemini if not in DB
                                  <SharedCommentary
                                    day={day}
                                    index={commId}
                                    originalText={originalText}
                                    isAdmin={isAdmin}
                                  />
                                ) : (
                                  // Regular users: show English text from Sefaria (no dynamic translation)
                                  <div className="text-base leading-relaxed text-[#141414]/70 font-serif italic"
                                       dangerouslySetInnerHTML={{ __html: String(originalText) }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 bg-[#141414]/[0.02] rounded-3xl border border-dashed border-[#141414]/10 text-center">
                          <p className="text-xs italic text-[#141414]/30">{t("noCommentary")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Full Text View Mode */
            <div className="space-y-12">
              {data.he.map((heVerse, idx) => {
                const verseNum = startVerse + idx;

                return (
                  <div key={idx} className="border-b border-[#141414]/5 pb-12 space-y-6">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#141414]/20">
                      <span>{t("verse")} {verseNum}</span>
                      <button
                        onClick={() => handlePlayTts(idx)}
                        className="p-2 hover:bg-[#141414]/5 rounded-full transition-all"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div dir="rtl" className="text-2xl leading-relaxed font-serif text-right">
                        <div dangerouslySetInnerHTML={{ __html: String(heVerse) }} />
                      </div>
                      <div className="text-lg leading-relaxed text-[#141414]/80 font-sans">
                        <div dangerouslySetInnerHTML={{ __html: String(data.text?.[idx] || "") }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-20 bg-white rounded-[40px] border border-[#141414]/5 space-y-4">
            <div className="w-20 h-20 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto text-[#141414]/20">
              <BookOpen size={40} />
            </div>
            <div>
              <p className="text-xl font-bold">{language === "ru" ? "Чтение скоро появится" : "Reading Coming Soon"}</p>
              <p className="text-[#141414]/50 italic">
                {language === "ru" 
                  ? "Администратор еще не подготовил это чтение. Пожалуйста, загляните позже!" 
                  : "The administrator hasn't prepared this reading yet. Please check back later!"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer (Screen only) */}
      {data?.he && data.he.length > 0 && currentVerseIndex === data.he.length - 1 && (
        <footer className="mt-20 flex justify-center pb-10 print-hidden">
          <button 
            onClick={() => setShowConfirm(true)}
            className="px-12 py-4 bg-[#141414] text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-xl"
          >
            {t("completeLesson")}
          </button>
        </footer>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl space-y-8"
            >
              <div className="space-y-4 text-center">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <PartyPopper size={40} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {language === "ru" ? "Отличная работа!" : "Great Work!"}
                </h3>
                <p className="text-[#141414]/60 leading-relaxed">
                  {language === "ru" 
                    ? "Вы завершили чтение на сегодня. Готовы проверить свои знания в коротком тесте?" 
                    : "You've finished today's reading. Ready to test your knowledge with a quick quiz?"}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleComplete}
                  className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {language === "ru" ? "Перейти к тесту" : "Start Quiz"}
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => { setShowConfirm(false); onFinish(); }}
                  className="w-full py-4 bg-[#141414]/5 text-[#141414] rounded-2xl font-bold hover:bg-[#141414]/10 transition-all"
                >
                  {t("finishReading")}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 text-[#141414]/40 text-sm font-bold hover:text-[#141414]/60 transition-all"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
}
