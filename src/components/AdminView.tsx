import React, { useState, useEffect } from "react";
import { TANAKH_SCHEDULE } from "../data/schedule";
import { fetchText, SefariaResponse } from "../services/sefariaService";
import { GoogleGenAI, Type } from "@google/genai";
import { db, doc, setDoc, handleFirestoreError, OperationType, collection, query, where, getDocs, updateDoc } from "../firebase";
import { Loader2, Save, Wand2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Users, BookOpen, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

interface CuratedPortion {
  book: string;
  ruBook: string;
  ref: string;
  ruRef: string;
  heText: string[];
  ruTranslation: string[];
  quiz: Array<{
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
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
    
    setGenerating(true);
    setStatus(null);
    try {
      const newPortions: CuratedPortion[] = [];
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      for (const p of dayData.portions) {
        const sefariaData = await fetchText(p.ref);
        
        // Prepare prompt for Gemini
        const heTextStr = sefariaData.he.join("\n");
        const prompt = `
          You are an expert in Jewish Tanakh studies and translation, specializing in Russian Jewish Orthodox terminology and style.
          Translate the following Hebrew text into Russian.
          
          CRITICAL RULES FOR TRANSLATION:
          1. STYLE: Use a style appropriate for Russian-speaking Orthodox Jews. The language should be accurate, natural-sounding, and respectful.
          2. TERMINOLOGY:
             - Use "Вс-вышний", "Г-сподь", or "Ашем" for G-d. Use hyphens in G-d's names (Б-г, Г-сподь).
             - Use "Танах" instead of "Ветхий Завет".
             - Use "Бней Исраэль" instead of "сыны Израилевы".
             - Use "Коэн" instead of "священник".
             - Use "Мишкан" instead of "Скиния".
             - Use "Арон а-Кодеш" or "Арон а-Брит" instead of "Ковчег".
          3. NAMES: Use traditional Jewish names:
             - "Моше" instead of "Моисей".
             - "Йеошуа" instead of "Иисус Навин".
             - "Аарон" (with double 'a').
             - "Йерихо" instead of "Иерихон".
             - "Шломо" instead of "Соломон".
             - "Давид", "Авраам", "Ицхак", "Яаков" (not Иаков).
          4. ACCURACY: Ensure the translation captures the nuances of the Hebrew text according to traditional Jewish commentary (like Rashi or Steinsaltz).
          
          Also, generate 3 multiple-choice quiz questions based on the text. For each question, provide a brief explanation (in Russian) of why the correct answer is right, referencing the text or Jewish tradition.
          
          Hebrew Text:
          ${heTextStr}
          
          Return the response in JSON format:
          {
            "ruTranslation": ["verse 1 translation", "verse 2 translation", ...],
            "quiz": [
              {
                "text": "Question text?",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correctAnswer": 0,
                "explanation": "Brief explanation in Russian"
              }
            ]
          }
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
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
        
        newPortions.push({
          book: p.book,
          ruBook: p.ruBook,
          ref: p.ref,
          ruRef: p.ruRef,
          heText: sefariaData.he,
          ruTranslation: result.ruTranslation,
          quiz: result.quiz.map((q: any, i: number) => ({ ...q, id: `q_${i}` }))
        });
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
        setStatus({ type: "error", message: "No curated content found for this day." });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "curated_lessons");
    } finally {
      setLoading(false);
    }
  };

  const refineTranslations = async () => {
    if (portions.length === 0) return;
    
    setGenerating(true);
    setStatus(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const nextPortions = [...portions];

      for (let i = 0; i < nextPortions.length; i++) {
        const p = nextPortions[i];
        const prompt = `
          You are an expert in Jewish Tanakh studies and translation, specializing in Russian Jewish Orthodox terminology and style.
          I have some existing Russian translations of Tanakh verses. Please refine them to be more accurate, natural-sounding, and strictly follow Russian Jewish Orthodox style.
          
          CRITICAL RULES FOR REFINEMENT:
          1. STYLE: Use a style appropriate for Russian-speaking Orthodox Jews. The language should be accurate, natural-sounding, and respectful.
          2. TERMINOLOGY:
             - Use "Вс-вышний", "Г-сподь", or "Ашем" for G-d. Use hyphens in G-d's names (Б-г, Г-сподь).
             - Use "Танах" instead of "Ветхий Завет".
             - Use "Бней Исраэль" instead of "сыны Израилевы".
             - Use "Коэн" instead of "священник".
             - Use "Мишкан" instead of "Скиния".
             - Use "Арон а-Кодеш" or "Арон а-Брит" instead of "Ковчег".
          3. NAMES: Use traditional Jewish names (Моше, Йеошуа, Аарон, Йерихо, Шломо, Давид, Авраам, Ицхак, Яаков).
          4. ACCURACY: Ensure the translation captures the nuances of the Hebrew text.
          
          Original Hebrew and Current Russian:
          ${p.heText.map((he, idx) => `V${idx + 1} HE: ${he}\nV${idx + 1} RU: ${p.ruTranslation[idx]}`).join("\n\n")}
          
          Return the refined translations as a JSON array of strings:
          {
            "refinedTranslations": ["verse 1 refined", "verse 2 refined", ...]
          }
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                refinedTranslations: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["refinedTranslations"]
            }
          }
        });

        const result = JSON.parse(response.text);
        nextPortions[i].ruTranslation = result.refinedTranslations;
      }
      
      setPortions(nextPortions);
      setStatus({ type: "success", message: "Translations refined successfully!" });
    } catch (err) {
      console.error("Refinement error:", err);
      setStatus({ type: "error", message: "Failed to refine translations." });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (portions.length === 0) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, "curated_lessons", selectedDay.toString()), {
        day: selectedDay,
        portions,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setStatus({ type: "success", message: "Lesson saved to Firestore!" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `curated_lessons/${selectedDay}`);
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
              onClick={refineTranslations}
              disabled={generating || portions.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Refine
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Translation Section */}
                <div className="space-y-6">
                  <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Translation</h3>
                  <div className="space-y-4">
                    {portion.heText.map((he, vIdx) => (
                      <div key={vIdx} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-[#141414]/20">
                          <span>Verse {vIdx + 1}</span>
                          <span dir="rtl">{he.substring(0, 20)}...</span>
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

                {/* Quiz Section */}
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
