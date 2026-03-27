import React, { useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { DaySchedule, TANAKH_SCHEDULE } from "../data/schedule";
import { Calendar, CheckCircle2, Flame, Trophy, ChevronRight, ChevronLeft, BookOpen, Search, Printer } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DateTime } from "luxon";
import { useLanguage } from "../data/LanguageContext";
import JumpToModal from "./JumpToModal";
import PrintPortion from "./PrintPortion";
import { toast } from "sonner";

interface DashboardProps {
  currentDay: number;
  completedPortions: string[];
  onStartLesson: (day: number, portion: any, index: number) => void;
}

export default function Dashboard({
  currentDay,
  completedPortions,
  onStartLesson,
}: DashboardProps) {
  const { language, t } = useLanguage();
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [isPrintingToday, setIsPrintingToday] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const loadedCountRef = useRef(0);
  const todayStr = DateTime.now().toISODate()!;
  const todayPlan = TANAKH_SCHEDULE.find(d => d.date === todayStr);
  const nextStudyDay = TANAKH_SCHEDULE.find(d => d.date >= todayStr && d.isStudyDay);
  const baseDay = (todayPlan && todayPlan.isStudyDay) ? todayPlan : nextStudyDay || TANAKH_SCHEDULE[0];

  const studyDays = TANAKH_SCHEDULE.filter(d => d.isStudyDay);
  const baseDayIdx = studyDays.findIndex(d => d.day === baseDay.day);
  const displayDayIdx = Math.max(0, Math.min(studyDays.length - 1, baseDayIdx + dayOffset));
  const displayDay = studyDays[displayDayIdx];
  const canGoPrev = displayDayIdx > 0;
  const canGoNext = displayDayIdx < studyDays.length - 1;
  const totalPortions = TANAKH_SCHEDULE.filter(d => d.isStudyDay).reduce((acc, d) => acc + d.portions.length, 0);
  const progress = (completedPortions.length / totalPortions) * 100;
  const streak = 12; // Mock streak
  
  const totalPortionsToPrint = displayDay.portions.length;

  const handlePortionLoaded = useCallback(() => {
    loadedCountRef.current += 1;
    if (loadedCountRef.current >= totalPortionsToPrint) {
      // All portions have fetched — trigger print
      window.focus();
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Print error:", err);
          toast.error(language === "ru" ? "Ошибка при печати. Попробуйте Ctrl+P" : "Print failed. Try Ctrl+P");
        } finally {
          setTimeout(() => {
            setIsPrintingToday(false);
            loadedCountRef.current = 0;
          }, 2000);
        }
      }, 300);
    }
  }, [totalPortionsToPrint, language]);

  const handlePrintToday = () => {
    loadedCountRef.current = 0;
    setIsPrintingToday(true);
    toast.info(language === "ru" ? "Загрузка данных для печати..." : "Loading print data...");
  };

  // Dynamic milestones
  const currentStudyDay = TANAKH_SCHEDULE.find(d => d.day === currentDay);
  const nextMilestone = currentStudyDay ? TANAKH_SCHEDULE.find(d => d.day > currentDay && d.isStudyDay && d.portions[0]?.bookName !== currentStudyDay.portions[0]?.bookName) : null;
  const lessonsRemaining = nextMilestone ? nextMilestone.day - currentDay : 0;

  // Get current week's days
  const today = DateTime.now();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = today.plus({ days: i - today.weekday + 1 });
    const dateStr = d.toISODate()!;
    return TANAKH_SCHEDULE.find(s => s.date === dateStr);
  }).filter(Boolean) as DaySchedule[];

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            {language === "ru" ? "Шалом, Гость" : "Shalom, Guest"}
          </h1>
          <p className="text-[#141414]/50 italic text-lg">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsJumpModalOpen(true)}
            className="col-span-2 sm:col-auto bg-white p-4 rounded-3xl border border-[#141414]/5 shadow-sm flex items-center gap-3 hover:bg-[#141414]/5 transition-all"
          >
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <Search size={24} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">{t("browseTanakh")}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#141414]/40 font-bold">
                {language === "ru" ? "Навигация" : "Navigation"}
              </p>
            </div>
          </button>
          <div className="bg-white p-4 rounded-3xl border border-[#141414]/5 shadow-sm flex items-center gap-3 flex-1 sm:flex-none">
            <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#141414]/40 font-bold leading-tight">
                {language === "ru" ? "Дней подряд" : "Day Streak"}
              </p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#141414]/5 shadow-sm flex items-center gap-3 flex-1 sm:flex-none">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedPortions.length}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#141414]/40 font-bold leading-tight">
                {language === "ru" ? "Глав" : "Chapters"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Progress Card */}
      <section className="bg-[#141414] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          {todayPlan && !todayPlan.isStudyDay ? (
            <div className="mb-10">
              <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-2 font-bold">{t("restDay")}</h2>
              <h3 className="text-4xl font-bold mb-1">{todayPlan.reason}</h3>
              <p className="text-white/60 italic">
                {language === "ru" ? "Следующая часть:" : "Next portion:"} {language === "ru" ? nextStudyDay?.portions[0]?.ruBook : nextStudyDay?.portions[0]?.book}
              </p>
            </div>
          ) : (
            <div className="mb-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDayOffset(o => o - 1)}
                        disabled={!canGoPrev}
                        className="p-2 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 hover:text-white transition-all disabled:opacity-20"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h2 className="text-sm uppercase tracking-[0.2em] text-white/50 mb-2 font-bold">
                          {dayOffset === 0
                            ? (language === "ru" ? "Сегодняшние чтения" : "Today's Readings")
                            : (language === "ru" ? "Чтения" : "Readings")}
                        </h2>
                        <h3 className="text-2xl font-bold mb-1">
                          {t("day")} {displayDay.day}
                        </h3>
                      </div>
                      <button
                        onClick={() => setDayOffset(o => o + 1)}
                        disabled={!canGoNext}
                        className="p-2 bg-white/10 text-white/60 rounded-xl hover:bg-white/20 hover:text-white transition-all disabled:opacity-20"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handlePrintToday}
                        className="p-3 bg-white/10 text-white/60 rounded-2xl hover:bg-white/20 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                        title={language === "ru" ? "Печать всех чтений" : "Print all readings"}
                      >
                        <Printer size={18} />
                        <span className="hidden sm:inline">{language === "ru" ? "Печать всех" : "Print All"}</span>
                      </button>
                      <div className="w-16 h-16 rounded-full border-4 border-white/10 flex items-center justify-center text-xl font-bold">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayDay.portions.map((portion, idx) => {
                  const isDone = completedPortions.includes(`${displayDay.day}_${portion.track}`);
                  return (
                    <button 
                      key={idx}
                      onClick={() => onStartLesson(displayDay.day, portion, idx)}
                      className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col justify-between group ${
                        isDone 
                          ? "bg-white/10 border-transparent opacity-60" 
                          : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                            {idx === 0 ? (language === "ru" ? "Невиим" : "Nevi'im") : (language === "ru" ? "Ктувим" : "Ketuvim")}
                          </span>
                          {isDone && <CheckCircle2 size={16} className="text-green-400" />}
                        </div>
                        <h4 className="text-xl font-bold">
                          {language === "ru" ? portion.ruBook : portion.book}
                        </h4>
                        <p className="text-sm text-white/60 italic">
                          {language === "ru" ? portion.ruRef.split(" ").slice(1).join(" ") : portion.ref.split(" ").slice(1).join(" ")}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/80 group-hover:translate-x-1 transition-transform">
                        {isDone ? (language === "ru" ? "Повторить" : "Review") : (language === "ru" ? "Изучать" : "Study")}
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
      </section>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weekly Progress */}
        <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-[#141414]/40" size={20} />
            <h4 className="text-sm uppercase tracking-widest font-bold text-[#141414]/60">Weekly View</h4>
          </div>
          <div className="flex justify-between items-center">
            {weekDays.map(d => {
              const allDone = d.isStudyDay && d.portions.every((_, idx) => completedPortions.includes(`${d.day}_${idx}`));
              const someDone = d.isStudyDay && d.portions.some((_, idx) => completedPortions.includes(`${d.day}_${idx}`));
              
              return (
                <div key={d.date} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    !d.isStudyDay ? "bg-gray-50 border-gray-100 text-gray-300" :
                    allDone ? "bg-[#141414] border-[#141414] text-white" : 
                    someDone ? "border-[#141414] text-[#141414] bg-white" :
                    "border-[#141414]/10 text-[#141414]/30"
                  }`}>
                    {allDone ? <CheckCircle2 size={16} /> : 
                     !d.isStudyDay ? <span className="text-[8px] font-bold">OFF</span> : d.day % 100}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#141414]/30">
                    {DateTime.fromISO(d.date).toFormat('ccc')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-[#141414]/40" size={20} />
            <h4 className="text-sm uppercase tracking-widest font-bold text-[#141414]/60">Milestones</h4>
          </div>
          <div className="space-y-4">
            {nextMilestone && (
              <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#141414]/5 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {language === "ru" ? `Завершить ${currentStudyDay?.portions[0]?.ruBook}` : `Finish ${currentStudyDay?.portions[0]?.book}`}
                  </p>
                  <p className="text-xs text-[#141414]/40 italic">
                    {language === "ru" ? `${lessonsRemaining} чтений осталось` : `${lessonsRemaining} readings remaining`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[#141414]/20 group-hover:text-[#141414]/40" />
              </div>
            )}
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#141414]/5 transition-colors cursor-pointer group opacity-50">
              <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                <Trophy size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">First 50 Days</p>
                <p className="text-xs text-[#141414]/40 italic">Locked</p>
              </div>
              <ChevronRight size={16} className="text-[#141414]/20" />
            </div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {isJumpModalOpen && (
          <JumpToModal 
            isOpen={isJumpModalOpen}
            onClose={() => setIsJumpModalOpen(false)}
            onJump={onStartLesson}
          />
        )}
      </AnimatePresence>

      {/* Print portal — rendered directly in <body> so CSS can isolate it */}
      {isPrintingToday && ReactDOM.createPortal(
        <div className="print-portal">
          <div className="print-doc-title">
            {language === "ru"
              ? `Учёба на День ${displayDay.day} · ${DateTime.fromISO(displayDay.date).setLocale("ru").toFormat("d MMMM yyyy")}`
              : `Study Day ${displayDay.day} · ${DateTime.fromISO(displayDay.date).toFormat("MMMM d, yyyy")}`}
          </div>
          {displayDay.portions.map((portion, idx) => (
            <PrintPortion
              key={`${displayDay.day}_${idx}`}
              portion={portion}
              language={language}
              onLoaded={handlePortionLoaded}
            />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

