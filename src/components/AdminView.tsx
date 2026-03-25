import React, { useState, useEffect } from "react";
import { TANAKH_SCHEDULE } from "../data/schedule";
import { fetchText } from "../services/sefariaService";
import { GoogleGenAI, Type } from "@google/genai";
import { db, doc, setDoc, handleFirestoreError, OperationType, collection, query, where, getDocs, updateDoc } from "../firebase";
import { Loader2, Save, Wand2, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Users, BookOpen, Search, ShieldCheck, Sparkles, Database, Globe } from "lucide-react";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

interface Commentary {
  text?: string;
  he?: string;
  ref: string;
  author?: string;
  heAuthor?: string;
}

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
  commentary?: Commentary[];
}

type DataSource = "db" | "sefaria" | "generated" | null;

export default function AdminView() {
  const { language } = useLanguage();
  const [adminTab, setAdminTab] = useState<"content" | "users">("content");
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [portions, setPortions] = useState<CuratedPortion[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // User Management State
  const [userSearchEmail, setUserSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  const dayData = TANAKH_SCHEDULE.find(d => d.day === selectedDay);

  // Auto-load when selectedDay changes: DB first, fallback to Sefaria
  useEffect(() => {
    if (adminTab !== "content") return;
    if (!dayData?.isStudyDay) {
      setPortions([]);
      setDataSource(null);
      setStatus(null);
      return;
    }

    const autoLoad = async () => {
      setLoading(true);
      setStatus(null);
      setPortions([]);
      setDataSource(null);

      try {
        // 1. Check Firestore
        const snapshot = await getDocs(
          query(collection(db, "curated_lessons"), where("day", "==", selectedDay))
        );

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setPortions(data.portions || []);
          setDataSource("db");
          setStatus({ type: "success", message: "Загружено из базы данных." });
        } else {
          // 2. Fallback: fetch raw text from Sefaria
          const newPortions: CuratedPortion[] = [];
          for (const p of dayData.portions) {
            const sefariaData = await fetchText(p.ref);
            newPortions.push({
              book: p.book,
              ruBook: p.ruBook,
              ref: p.ref,
              ruRef: p.ruRef,
              heText: sefariaData.he,
              ruTranslation: [],
              quiz: [],
              commentary: sefariaData.commentary || []
            });
          }
          setPortions(newPortions);
          setDataSource("sefaria");
          setStatus({ type: "info", message: "Текст загружен из Sefaria. Нажмите «Генерировать» для создания перевода и теста." });
        }
      } catch (err) {
        console.error("Auto-load error:", err);
        setStatus({ type: "error", message: "Ошибка загрузки данных." });
      } finally {
        setLoading(false);
      }
    };

    autoLoad();
  }, [selectedDay, adminTab]);

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
    if (!dayData || !dayData.isStudyDay || portions.length === 0) return;

    setGenerating(true);
    setStatus(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const nextPortions = [...portions];

      for (let i = 0; i < nextPortions.length; i++) {
        const p = nextPortions[i];

        // Re-fetch commentary if not available (e.g. loaded from DB without it)
        let commentary: Commentary[] = p.commentary || [];
        if (commentary.length === 0) {
          const sefariaData = await fetchText(p.ref);
          commentary = sefariaData.commentary || [];
        }

        // Filter Steinsaltz commentary
        const steinsaltzCommentary = commentary.filter(c =>
          c.author?.toLowerCase().includes("steinsaltz") ||
          c.heAuthor?.includes("שטיינזלץ") ||
          c.ref?.toLowerCase().includes("steinsaltz")
        );

        const commentaryText = steinsaltzCommentary
          .map(c => c.text || c.he || "")
          .filter(Boolean)
          .join("\n");

        const heTextStr = p.heText.join("\n");

        const prompt = `
Ты — эксперт по Танаху и иудейской традиции, специализирующийся на русскоязычной православной еврейской терминологии.

Перед тобой отрывок из Танаха и комментарий Рава Адина Штейнзальца (Эвена-Исраэля) к нему.

ЗАДАЧА 1 — ПЕРЕВОД:
Переведи каждый стих на русский язык, опираясь на комментарий Штейнзальца.

ПРАВИЛА ПЕРЕВОДА:
1. СТИЛЬ: Подходящий для русскоязычных религиозных евреев. Точный, естественный, уважительный.
2. ТЕРМИНОЛОГИЯ:
   - Использовать «Вс-вышний», «Г-сподь» или «Ашем» для Б-га. Дефис в именах Б-га (Б-г, Г-сподь).
   - «Танах» вместо «Ветхий Завет».
   - «Бней Исраэль» вместо «сыны Израилевы».
   - «Коэн» вместо «священник».
   - «Мишкан» вместо «Скиния».
   - «Арон а-Кодеш» или «Арон а-Брит» вместо «Ковчег».
3. ИМЕНА: Традиционные еврейские имена: Моше, Йеошуа, Аарон, Йерихо, Шломо, Давид, Авраам, Ицхак, Яаков.

ЗАДАЧА 2 — ТЕСТ:
Составь 3 вопроса с выбором ответа на основе текста и комментария Штейнзальца.
Для каждого вопроса дай краткое объяснение (на русском), почему именно этот ответ правильный.

Текст на иврите:
${heTextStr}

Комментарий Рава Штейнзальца:
${commentaryText || "(комментарий недоступен — используй текст)"}

Верни ответ в формате JSON:
{
  "ruTranslation": ["перевод стиха 1", "перевод стиха 2", ...],
  "quiz": [
    {
      "text": "Текст вопроса?",
      "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
      "correctAnswer": 0,
      "explanation": "Краткое объяснение на русском"
    }
  ]
}
        `;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview",
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

        nextPortions[i] = {
          ...p,
          ruTranslation: result.ruTranslation,
          quiz: result.quiz.map((q: any, idx: number) => ({ ...q, id: `q_${idx}` }))
        };
      }

      setPortions(nextPortions);
      setDataSource("generated");
      setStatus({ type: "success", message: "Контент сгенерирован. Проверьте и нажмите «Сохранить»." });
    } catch (err) {
      console.error("Generation error:", err);
      setStatus({ type: "error", message: "Ошибка генерации контента. Смотрите консоль." });
    } finally {
      setGenerating(false);
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
Ты — эксперт по Танаху, специализирующийся на русскоязычной православной еврейской терминологии.
Улучши существующие переводы стихов — сделай их точнее, естественнее, строго соблюдай еврейский стиль.

ПРАВИЛА:
1. «Вс-вышний», «Г-сподь» или «Ашем» для Б-га. Дефис в именах Б-га (Б-г, Г-сподь).
2. «Танах», «Бней Исраэль», «Коэн», «Мишкан», «Арон а-Кодеш».
3. Традиционные имена: Моше, Йеошуа, Аарон, Йерихо, Шломо, Давид, Авраам, Ицхак, Яаков.

Оригинал на иврите и текущий перевод:
${p.heText.map((he, idx) => `Стих ${idx + 1} ИВР: ${he}\nСтих ${idx + 1} РУС: ${p.ruTranslation[idx] || ""}`).join("\n\n")}

Верни улучшенные переводы:
{
  "refinedTranslations": ["стих 1 улучшенный", "стих 2 улучшенный", ...]
}
        `;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview",
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
        nextPortions[i] = { ...p, ruTranslation: result.refinedTranslations };
      }

      setPortions(nextPortions);
      setStatus({ type: "success", message: "Переводы улучшены." });
    } catch (err) {
      console.error("Refinement error:", err);
      setStatus({ type: "error", message: "Ошибка улучшения переводов." });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (portions.length === 0) return;

    setLoading(true);
    try {
      // Strip commentary before saving (not needed in DB)
      const portionsToSave = portions.map(({ commentary, ...rest }) => rest);
      await setDoc(doc(db, "curated_lessons", selectedDay.toString()), {
        day: selectedDay,
        portions: portionsToSave,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setDataSource("db");
      setStatus({ type: "success", message: "Урок сохранён в базе данных!" });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `curated_lessons/${selectedDay}`);
      setStatus({ type: "error", message: "Ошибка сохранения урока." });
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

  const dataSourceBadge = () => {
    if (!dataSource) return null;
    const config = {
      db: { icon: <Database size={14} />, label: "Из базы данных", cls: "bg-green-100 text-green-700" },
      sefaria: { icon: <Globe size={14} />, label: "Из Sefaria", cls: "bg-blue-100 text-blue-700" },
      generated: { icon: <Sparkles size={14} />, label: "Сгенерировано (не сохранено)", cls: "bg-purple-100 text-purple-700" }
    }[dataSource];
    return (
      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.cls}`}>
        {config.icon}
        {config.label}
      </span>
    );
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
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-[#141414]/5 rounded-full p-1">
              <button
                onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                disabled={loading || generating}
                className="p-2 hover:bg-white rounded-full transition-all disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 font-bold">День {selectedDay}</span>
              <button
                onClick={() => setSelectedDay(selectedDay + 1)}
                disabled={loading || generating}
                className="p-2 hover:bg-white rounded-full transition-all disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={fetchAndGenerate}
              disabled={generating || loading || !dayData?.isStudyDay || portions.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
              Генерировать
            </button>
            <button
              onClick={refineTranslations}
              disabled={generating || loading || portions.length === 0 || !portions[0]?.ruTranslation?.length}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Улучшить
            </button>
            <button
              onClick={handleSave}
              disabled={loading || generating || portions.length === 0 || !portions[0]?.ruTranslation?.length}
              className="flex items-center gap-2 px-6 py-2 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Сохранить
            </button>
          </div>
        )}
      </header>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 ${
            status.type === "success"
              ? "bg-green-50 text-green-700"
              : status.type === "info"
              ? "bg-blue-50 text-blue-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : status.type === "info" ? (
            <Globe size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
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
          {loading ? (
            <div className="p-20 text-center bg-[#141414]/5 rounded-[40px]">
              <Loader2 className="animate-spin mx-auto mb-4 text-[#141414]/30" size={40} />
              <p className="text-[#141414]/30 font-medium">Загрузка данных...</p>
            </div>
          ) : !dayData?.isStudyDay ? (
            <div className="p-20 text-center bg-[#141414]/5 rounded-[40px] border-2 border-dashed border-[#141414]/10">
              <h3 className="text-2xl font-bold text-[#141414]/30">День отдыха (Шабат/Праздник)</h3>
              <p className="text-[#141414]/20 italic">Нет учебного отрывка для этого дня.</p>
            </div>
          ) : portions.length > 0 ? (
            <div className="space-y-12">
              <div className="flex items-center gap-3">
                {dataSourceBadge()}
              </div>
              {portions.map((portion, pIdx) => (
                <div key={pIdx} className="space-y-8 bg-white p-10 rounded-[40px] border border-[#141414]/5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#141414]/5 pb-6">
                    <h2 className="text-2xl font-bold">{portion.ruBook} — {portion.ruRef}</h2>
                    <span className="text-xs uppercase tracking-widest font-bold text-[#141414]/30">
                      {pIdx === 0 ? "Nevi'im" : "Ketuvim"}
                    </span>
                  </div>

                  {/* Hebrew text preview */}
                  <div className="space-y-2">
                    <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Текст (иврит)</h3>
                    <div className="p-4 bg-[#141414]/5 rounded-2xl text-right font-serif text-lg leading-relaxed" dir="rtl">
                      {portion.heText.slice(0, 3).join(" ")}
                      {portion.heText.length > 3 && <span className="text-[#141414]/30"> ...</span>}
                    </div>
                  </div>

                  {portion.ruTranslation.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Translation Section */}
                      <div className="space-y-6">
                        <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Перевод</h3>
                        <div className="space-y-4">
                          {portion.heText.map((he, vIdx) => (
                            <div key={vIdx} className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold text-[#141414]/20">
                                <span>Стих {vIdx + 1}</span>
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
                        <h3 className="text-sm uppercase tracking-widest font-bold text-[#141414]/40">Вопросы теста</h3>
                        <div className="space-y-8">
                          {portion.quiz.map((q, qIdx) => (
                            <div key={q.id} className="p-6 bg-[#141414]/5 rounded-3xl space-y-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Вопрос {qIdx + 1}</label>
                                <input
                                  type="text"
                                  value={q.text}
                                  onChange={(e) => updateQuizQuestion(pIdx, qIdx, "text", e.target.value)}
                                  className="w-full p-3 bg-white rounded-xl text-sm font-bold focus:outline-none"
                                />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Варианты ответов</label>
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
                                <label className="text-[10px] font-bold text-[#141414]/40 uppercase">Объяснение</label>
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
                  ) : (
                    <div className="p-10 text-center bg-[#141414]/5 rounded-3xl border-2 border-dashed border-[#141414]/10">
                      <Wand2 className="mx-auto mb-3 text-[#141414]/20" size={32} />
                      <p className="text-[#141414]/30 font-medium">Нажмите «Генерировать» для создания перевода и теста на основе комментария Штейнзальца.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center bg-[#141414]/5 rounded-[40px] border-2 border-dashed border-[#141414]/10">
              <h3 className="text-2xl font-bold text-[#141414]/30">Нет данных</h3>
              <p className="text-[#141414]/20 italic">Выберите день для загрузки.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
