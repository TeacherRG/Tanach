import React, { useState, useEffect } from "react";
import { TANAKH_SCHEDULE } from "../data/schedule";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { generateLesson } from "../services/geminiService";
import { db, doc, setDoc, handleFirestoreError, OperationType, collection, query, where, getDocs, updateDoc, writeBatch } from "../firebase";
import { Loader2, Save, Wand2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Users, BookOpen, Search, ShieldCheck } from "lucide-react";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

interface CuratedPortion {
  book: string;
  ruBook: string;
  ref: string;
  ruRef: string;
  heText: string[];
  enText?: string[];
  enCommentary?: Array<{ ref: string; text: string; author?: string }>;
  ruTranslation: string[];
  quiz: Array<{
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}

// Parse chapter and verse range from a ref like "Joshua 1:1-18" or "Kings 2:5"
function parseVerseRange(ref: string): { chapter: number; startVerse: number; endVerse: number } {
  const match = ref.match(/(\d+):(\d+)(?:-(\d+))?/);
  if (!match) return { chapter: 1, startVerse: 1, endVerse: 1 };
  const chapter = parseInt(match[1]);
  const startVerse = parseInt(match[2]);
  const endVerse = match[3] ? parseInt(match[3]) : startVerse;
  return { chapter, startVerse, endVerse };
}

// Extract the first verse number mentioned in a Sefaria ref
// e.g., "Steinsaltz on Joshua 1:5" → 5, "Joshua 1:5-7" → 5
function parseVerseFromRef(ref: string): number | null {
  const match = ref.match(/:(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export default function AdminView() {
  const { language } = useLanguage();
  const [adminTab, setAdminTab] = useState<"content" | "users">("content");
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [portions, setPortions] = useState<CuratedPortion[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // User Management State
  const [userSearchEmail, setUserSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  const dayData = TANAKH_SCHEDULE.find(d => d.day === selectedDay);

  const searchUser = async () => {
    if (!userSearchEmail) return;
    setSearchingUser(true);
    setFoundUser(null);
    setStatus(null);
    try {
      const q = query(collection(db, "users"), where("email", "==", userSearchEmail.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFoundUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setStatus({ type: "error", message: "User not found." });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "users");
    } finally {
      setSearchingUser(false);
    }
  };

  const toggleAdminRole = async (uid: string, currentRole: string) => {
    setLoading(true);
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setFoundUser((prev: any) => ({ ...prev, role: newRole }));
      setStatus({ type: "success", message: `User role updated to ${newRole}!` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAndGenerate = async () => {
    if (!dayData || !dayData.isStudyDay) return;

    if (portions.length === 0) {
      setStatus({ type: "error", message: "Please click Load first to load the Hebrew text." });
      return;
    }

    const alreadyGenerated = portions.every(p => p.ruTranslation.length > 0 && p.quiz.length > 0);
    if (alreadyGenerated) {
      setStatus({ type: "error", message: "Content already loaded from database. Edit manually or reload and regenerate." });
      return;
    }

    setGenerating(true);
    setStatus(null);
    try {
      const newPortions: CuratedPortion[] = [...portions];
      for (let i = 0; i < newPortions.length; i++) {
        const result = await generateLesson((newPortions[i].enCommentary ?? []).map(c => c.text));
        newPortions[i] = { ...newPortions[i], ...result };
      }
      setPortions(newPortions);
      setStatus({ type: "success", message: "Content generated successfully!" });
    } catch (err) {
      console.error("Generation error:", err);
      setStatus({ type: "error", message: "Failed to generate content. Please check console." });
    } finally {
      setGenerating(false);
    }
  };

  const loadExisting = async () => {
    if (!dayData || !dayData.isStudyDay) return;

    setLoading(true);
    setStatus(null);
    try {
      const snapshot = await getDocs(query(collection(db, "curated_lessons"), where("day", "==", selectedDay)));

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setPortions(data.portions || []);
        setStatus({ type: "success", message: "Existing content loaded!" });
      } else {
        // Not in DB — fetch Hebrew text + Steinsaltz commentary from Sefaria
        const newPortions: CuratedPortion[] = [];
        for (const p of dayData.portions) {
          const sefariaData = await fetchText(p.ref);
          newPortions.push({
            book: p.book,
            ruBook: p.ruBook,
            ref: p.ref,
            ruRef: p.ruRef,
            heText: sefariaData.he,
            enText: sefariaData.text,
            enCommentary: (sefariaData.commentary || [])
              .filter(c => {
                const isSteinsaltz =
                  c.author?.toLowerCase().includes("steinsaltz") ||
                  c.heAuthor?.includes("שטיינזלץ") ||
                  c.ref?.toLowerCase().includes("steinsaltz");
                const hasText = (typeof c.text === "string" ? c.text : Array.isArray(c.text) ? c.text.join(" ") : "").trim();
                const hasHe = (typeof c.he === "string" ? c.he : Array.isArray(c.he) ? c.he.join(" ") : "").trim();
                return isSteinsaltz && (hasText || hasHe);
              })
              .map(c => ({
                ref: c.ref,
                text: typeof c.text === "string" ? c.text : Array.isArray(c.text) ? c.text.join(" ") : typeof c.he === "string" ? c.he : Array.isArray(c.he) ? c.he.join(" ") : "",
                author: c.author || c.heAuthor || "Steinsaltz"
              })),
            ruTranslation: [],
            quiz: []
          });
        }
        setPortions(newPortions);
        const hasCommentary = newPortions.some(p => (p.enCommentary?.length ?? 0) > 0);
        setStatus({
          type: "success",
          message: hasCommentary
            ? "Loaded from Sefaria with Steinsaltz commentary. Translation and quiz not yet generated."
            : "Loaded from Sefaria. No Steinsaltz commentary found. Translation and quiz not yet generated."
        });
      }
    } catch (err) {
      console.error("Load error:", err);
      setStatus({ type: "error", message: `Failed to load: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (portions.length === 0) return;

    setLoading(true);
    try {
      const tracks = ["neviim", "ketuvim"] as const;
      const batch = writeBatch(db);

      for (let pIdx = 0; pIdx < portions.length; pIdx++) {
        const portion = portions[pIdx];
        const track = tracks[pIdx] ?? `portion_${pIdx}`;
        const lessonId = `${selectedDay}_${track}`;
        const { chapter, startVerse, endVerse } = parseVerseRange(portion.ref);

        // Build a map: absolute verse number → commentary + Russian translation
        // Commentary ref from Sefaria looks like "Steinsaltz on Joshua 1:5"
        const commentaryByVerse = new Map<number, {
          ref: string;
          enText: string;
          ruText: string;
          author: string;
        }>();

        // Ensure ruTranslation has exactly one entry per enCommentary item.
        // Gemini may return fewer translations than requested, which would shift
        // all subsequent indices and map wrong Russian text to wrong verses.
        const enCommentaryList = portion.enCommentary ?? [];
        const ruTranslations = [...(portion.ruTranslation ?? [])];
        if (ruTranslations.length !== enCommentaryList.length) {
          console.warn(
            `[AdminView] ruTranslation length (${ruTranslations.length}) does not match ` +
            `enCommentary length (${enCommentaryList.length}) for "${portion.ref}". ` +
            `Padding with empty strings to prevent index shift.`
          );
          while (ruTranslations.length < enCommentaryList.length) {
            ruTranslations.push("");
          }
        }

        enCommentaryList.forEach((c, cIdx) => {
          const verseNum = parseVerseFromRef(c.ref);
          if (verseNum !== null) {
            commentaryByVerse.set(verseNum, {
              ref: c.ref,
              enText: c.text,
              ruText: ruTranslations[cIdx] ?? "",
              author: c.author ?? "Steinsaltz"
            });
          }
        });

        // 1. Lesson-level document: metadata only, no text arrays, no quiz
        const lessonRef = doc(db, "lessons", lessonId);
        batch.set(lessonRef, {
          day: selectedDay,
          track,
          book: portion.book,
          ruBook: portion.ruBook,
          ref: portion.ref,
          ruRef: portion.ruRef,
          chapter,
          startVerse,
          endVerse,
          verseCount: portion.heText.length,
          updatedAt: new Date()
        });

        // 2. One document per verse in subcollection verses/
        // Document ID = absolute verse number (e.g., "5" for verse 5)
        for (let vIdx = 0; vIdx < portion.heText.length; vIdx++) {
          const absVerse = startVerse + vIdx;
          const verseRef = doc(db, "lessons", lessonId, "verses", String(absVerse));
          const commentary = commentaryByVerse.get(absVerse) ?? null;

          batch.set(verseRef, {
            verseNumber: absVerse,
            chapter,
            heText: portion.heText[vIdx] ?? "",
            enText: portion.enText?.[vIdx] ?? "",
            // commentary is null if Steinsaltz has no note for this verse
            commentary
          });
        }

        // 3. Quiz questions — separate collection, each question knows its verse range
        // Document ID: {day}_{track}_{qIdx} for deterministic overwrite on re-save
        portion.quiz.forEach((q, qIdx) => {
          const quizRef = doc(db, "quiz_questions", `${selectedDay}_${track}_${qIdx}`);
          batch.set(quizRef, {
            day: selectedDay,
            track,
            book: portion.book,
            ruBook: portion.ruBook,
            chapter,
            verseStart: startVerse,
            verseEnd: endVerse,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            updatedAt: new Date()
          });
        });
      }

      await batch.commit();
      setStatus({ type: "success", message: "Lesson saved to Firestore!" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `lessons/${selectedDay}`);
      setStatus({ type: "error", message: "Failed to save lesson." });
    } finally {
      setLoading(false);
    }
  };

  const updateTranslation = (pIdx: number, vIdx: number, val: string) => {
    const next = [...portions];
    next[pIdx].ruTranslation[vIdx] = val;
    setPortions(next);
  };

  const updateQuizQuestion = (pIdx: number, qIdx: number, field: string, val: any) => {
    const next = [...portions];
    (next[pIdx].quiz[qIdx] as any)[field] = val;
    setPortions(next);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Admin Panel</h1>
          <p className="text-[#141414]/50 italic">Manage content and users.</p>
        </div>
        
        <div className="flex bg-[#141414]/5 p-1 rounded-2xl">
          <button 
            onClick={() => setAdminTab("content")}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${adminTab === "content" ? "bg-white shadow-sm" : "text-[#141414]/40 hover:text-[#141414]"}`}
          >
            <BookOpen size={18} />
            Content
          </button>
          <button 
            onClick={() => setAdminTab("users")}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${adminTab === "users" ? "bg-white shadow-sm" : "text-[#141414]/40 hover:text-[#141414]"}`}
          >
            <Users size={18} />
            Users
          </button>
        </div>

        {adminTab === "content" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#141414]/5 rounded-full p-1">
              <button 
                onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                className="p-2 hover:bg-white rounded-full transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 font-bold">Day {selectedDay}</span>
              <button 
                onClick={() => setSelectedDay(selectedDay + 1)}
                className="p-2 hover:bg-white rounded-full transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button 
              onClick={loadExisting}
              disabled={loading || !dayData?.isStudyDay}
              className="flex items-center gap-2 px-6 py-2 bg-gray-100 text-[#141414] rounded-full font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <BookOpen size={18} />}
              Load
            </button>
            <button 
              onClick={fetchAndGenerate}
              disabled={generating || !dayData?.isStudyDay}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
              Generate
            </button>
            <button 
              onClick={handleSave}
              disabled={loading || portions.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save
            </button>
          </div>
        )}
      </header>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 ${
            status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-medium">{status.message}</p>
        </motion.div>
      )}

      {adminTab === "users" ? (
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[40px] border border-[#141414]/5 shadow-sm space-y-8">
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-bold">User Management</h2>
              <p className="text-sm text-[#141414]/50">Search for a user by email to grant or revoke admin privileges.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/30" size={18} />
                  <input 
                    type="email"
                    placeholder="user@example.com"
                    value={userSearchEmail}
                    onChange={(e) => setUserSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUser()}
                    className="w-full pl-12 pr-4 py-3 bg-[#141414]/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                  />
                </div>
                <button 
                  onClick={searchUser}
                  disabled={searchingUser || !userSearchEmail}
                  className="px-6 py-3 bg-[#141414] text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                  {searchingUser ? <Loader2 className="animate-spin" size={20} /> : "Search"}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {foundUser && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 bg-[#141414]/5 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#141414]/10 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden">
                      {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        foundUser.displayName?.[0] || foundUser.email[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {foundUser.displayName || "Anonymous User"}
                        {foundUser.role === "admin" && <ShieldCheck className="text-blue-500" size={20} />}
                      </h3>
                      <p className="text-[#141414]/50">{foundUser.email}</p>
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${foundUser.role === "admin" ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-600"}`}>
                        {foundUser.role || "user"}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => toggleAdminRole(foundUser.id, foundUser.role)}
                    disabled={loading || foundUser.email === "ryvgrin@gmail.com"}
                    className={`px-8 py-3 rounded-2xl font-bold transition-all ${
                      foundUser.role === "admin" 
                        ? "bg-red-50 text-red-600 hover:bg-red-100" 
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    } disabled:opacity-50`}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (foundUser.role === "admin" ? "Revoke Admin" : "Make Admin")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <>
          {!dayData?.isStudyDay ? (
        <div className="p-20 text-center bg-[#141414]/5 rounded-[40px] border-2 border-dashed border-[#141414]/10">
          <h3 className="text-2xl font-bold text-[#141414]/30">Rest Day (Shabbat/Holiday)</h3>
          <p className="text-[#141414]/20 italic">No study portion for this day.</p>
        </div>
      ) : portions.length > 0 ? (
        <div className="space-y-12">
          {portions.map((portion, pIdx) => (
            <div key={pIdx} className="space-y-8 bg-white p-10 rounded-[40px] border border-[#141414]/5 shadow-sm">
              <div className="flex justify-between items-center border-b border-[#141414]/5 pb-6">
                <h2 className="text-2xl font-bold">{portion.ruBook} - {portion.ruRef}</h2>
                <span className="text-xs uppercase tracking-widest font-bold text-[#141414]/30">
                  {pIdx === 0 ? "Nevi'im" : "Ketuvim"}
                </span>
              </div>

              {/* Hebrew Text Section */}
              <div className="space-y-4 mb-8">
                <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Hebrew Original</h3>
                <div className="space-y-2 bg-[#141414]/3 rounded-3xl p-6">
                  {portion.heText.map((he, vIdx) => (
                    <div key={vIdx} className="flex gap-3 items-start border-b border-[#141414]/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-[10px] font-bold text-[#141414]/30 mt-1 min-w-[2rem]">{vIdx + 1}</span>
                      <p className="text-right flex-1 font-serif text-lg leading-relaxed" dir="rtl"
                         dangerouslySetInnerHTML={{ __html: he }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Translation Section — only when loaded from DB */}
                {portion.ruTranslation.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Translation</h3>
                    <div className="space-y-4">
                      {(portion.enCommentary ?? []).map((c, vIdx) => (
                        <div key={vIdx} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-[#141414]/20">
                            <span>{c.ref}</span>
                          </div>
                          <textarea
                            value={portion.ruTranslation[vIdx] || ""}
                            onChange={(e) => updateTranslation(pIdx, vIdx, e.target.value)}
                            className="w-full p-4 bg-[#141414]/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all min-h-[80px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Right Column: Commentary + Quiz */}
                <div className={`space-y-10 ${portion.ruTranslation.length === 0 ? "lg:col-span-2" : ""}`}>
                  {/* Steinsaltz Commentary Section */}
                  {portion.enCommentary && portion.enCommentary.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Steinsaltz Commentary (English)</h3>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {portion.enCommentary.map((c, cIdx) => (
                          <div key={cIdx} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-1">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{c.ref}</p>
                            <p className="text-sm text-[#141414]/80 leading-relaxed"
                               dangerouslySetInnerHTML={{ __html: c.text }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Quiz Section — only when loaded from DB */}
                {portion.quiz.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Quiz Questions</h3>
                  <div className="space-y-8">
                    {portion.quiz.map((q, qIdx) => (
                      <div key={q.id} className="p-6 bg-[#141414]/5 rounded-3xl space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Question {qIdx + 1}</label>
                          <input 
                            type="text"
                            value={q.text}
                            onChange={(e) => updateQuizQuestion(pIdx, qIdx, "text", e.target.value)}
                            className="w-full p-3 bg-white rounded-xl text-sm font-bold focus:outline-none"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Options</label>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-3">
                              <input 
                                type="radio"
                                name={`q_${pIdx}_${qIdx}`}
                                checked={q.correctAnswer === oIdx}
                                onChange={() => updateQuizQuestion(pIdx, qIdx, "correctAnswer", oIdx)}
                                className="accent-[#141414]"
                              />
                              <input 
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[oIdx] = e.target.value;
                                  updateQuizQuestion(pIdx, qIdx, "options", newOpts);
                                }}
                                className="flex-1 p-2 bg-white rounded-lg text-xs focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Explanation</label>
                          <textarea 
                            value={q.explanation || ""}
                            onChange={(e) => updateQuizQuestion(pIdx, qIdx, "explanation", e.target.value)}
                            className="w-full p-3 bg-white rounded-xl text-xs focus:outline-none min-h-[60px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-20 text-center bg-[#141414]/5 rounded-[40px] border-2 border-dashed border-[#141414]/10">
          <h3 className="text-2xl font-bold text-[#141414]/30">No Content Loaded</h3>
          <p className="text-[#141414]/20 italic">Select a day and click "Generate" to start curating.</p>
        </div>
      )}
        </>
      )}
    </div>
  );
}
