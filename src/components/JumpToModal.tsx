import React, { useState } from "react";
import { X, Search, ChevronRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../data/LanguageContext";
import { TORAH_METADATA, NEVIIM_METADATA, KETUVIM_METADATA, BookMetadata } from "../data/tanakhMetadata";
import { TANAKH_SCHEDULE, DaySchedule } from "../data/schedule";

interface JumpToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJump: (day: number, portion: any, index: number) => void;
}

export default function JumpToModal({ isOpen, onClose, onJump }: JumpToModalProps) {
  const { language, t } = useLanguage();
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    { title: language === "ru" ? "Пророки" : "Nevi'im", books: NEVIIM_METADATA },
    { title: language === "ru" ? "Писания" : "Ketuvim", books: KETUVIM_METADATA },
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    books: section.books.filter(book => 
      book.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.ruName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.heName.includes(searchQuery)
    )
  })).filter(section => section.books.length > 0);

  const handleChapterSelect = (chapter: number) => {
    if (!selectedBook) return;

    // Find the first study day that includes this chapter in any of its portions
    let foundDay: number | null = null;
    let foundPortion: any = null;
    let foundIndex: number = -1;

    for (const d of TANAKH_SCHEDULE) {
      if (!d.isStudyDay) continue;
      
      const pIdx = d.portions.findIndex(p => {
        if (p.bookName !== selectedBook.name) return false;
        const chapterPattern = new RegExp(` ${chapter}:`);
        return chapterPattern.test(p.ref);
      });

      if (pIdx !== -1) {
        foundDay = d.day;
        foundPortion = d.portions[pIdx];
        foundIndex = pIdx;
        break;
      }
    }

    if (foundDay !== null) {
      onJump(foundDay, foundPortion, foundIndex);
      onClose();
    } else {
      // Fallback: just find the first day of that book
      for (const d of TANAKH_SCHEDULE) {
        if (!d.isStudyDay) continue;
        const pIdx = d.portions.findIndex(p => p.bookName === selectedBook.name);
        if (pIdx !== -1) {
          onJump(d.day, d.portions[pIdx], pIdx);
          onClose();
          return;
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#141414]/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <header className="p-8 border-b border-[#141414]/5 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {selectedBook ? (language === "ru" ? selectedBook.ruName : selectedBook.displayName) : t("browseTanakh")}
            </h2>
            <p className="text-sm text-[#141414]/40 italic">
              {selectedBook ? t("selectChapter") : t("selectBook")}
            </p>
          </div>
          <button 
            onClick={selectedBook ? () => setSelectedBook(null) : onClose}
            className="p-3 bg-[#141414]/5 rounded-full hover:bg-[#141414]/10 transition-all"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {!selectedBook ? (
              <motion.div 
                key="books"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-10"
              >
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20" size={20} />
                  <input 
                    type="text"
                    placeholder={language === "ru" ? "Поиск книги..." : "Search books..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-[#141414]/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
                  />
                </div>

                {/* Sections */}
                {filteredSections.map(section => (
                  <div key={section.title} className="space-y-4">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#141414]/30 px-2">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {section.books.map(book => (
                        <button
                          key={book.name}
                          onClick={() => setSelectedBook(book)}
                          className="p-4 bg-white border border-[#141414]/5 rounded-2xl hover:border-[#141414]/20 hover:shadow-sm transition-all text-left group"
                        >
                          <p className="font-bold text-sm group-hover:text-[#141414] transition-colors">
                            {language === "ru" ? book.ruName : book.displayName}
                          </p>
                          <p className="text-[10px] text-[#141414]/40 font-serif" dir="rtl">
                            {book.heName}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="chapters"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3"
              >
                {selectedBook.chapters.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChapterSelect(idx + 1)}
                    className="aspect-square flex items-center justify-center bg-[#141414]/5 rounded-xl font-bold hover:bg-[#141414] hover:text-white transition-all text-lg"
                  >
                    {idx + 1}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="p-6 bg-[#141414]/5 flex justify-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/30">
            {language === "ru" ? "Выберите главу для перехода к чтению" : "Select a chapter to jump to the reading"}
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
