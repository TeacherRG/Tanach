import React from "react";
import { Award, ShieldCheck, BookOpen } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../data/LanguageContext";

interface BadgeProps {
  bookName: string;
  completionDate: string;
  onClose: () => void;
}

export default function Badge({ bookName, completionDate, onClose }: BadgeProps) {
  const { t, language } = useLanguage();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#141414]/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full bg-white p-10 rounded-[40px] border-4 border-[#141414]/5 shadow-2xl relative overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-[#141414]/5 rounded-br-full" />
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#141414]/5 rounded-bl-full" />

        <div className="relative z-10 space-y-8">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-xl animate-bounce">
              <Award size={40} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#141414]/40">
              {language === "ru" ? "Достижение" : "Achievement Unlocked"}
            </h1>
            <h2 className="text-3xl font-bold tracking-tight">
              {language === "ru" ? `Мастер Книги ${bookName}` : `Master of ${bookName}`}
            </h2>
          </div>

          <div className="py-6 border-y border-[#141414]/10">
            <p className="text-[#141414]/50 italic text-sm">
              {language === "ru" 
                ? "Поздравляем! Вы успешно завершили изучение этой книги." 
                : "Congratulations! You have successfully completed the study of this book."}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-[#141414]/20">
              <BookOpen size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">{bookName}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="text-left">
              <p className="text-[8px] uppercase tracking-widest font-bold text-[#141414]/30">{t("date")}</p>
              <p className="font-bold text-xs">{completionDate}</p>
            </div>
            <div className="flex items-center gap-1 text-[#141414]/20">
              <ShieldCheck size={20} />
              <span className="text-[8px] uppercase tracking-widest font-bold">{t("verifiedStudy")}</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all shadow-lg"
          >
            {language === "ru" ? "Продолжить путь" : "Continue Journey"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
