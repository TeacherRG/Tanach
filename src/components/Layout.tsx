import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  CheckCircle, 
  Home, 
  Settings, 
  User, 
  Shield, 
  Users, 
  Menu, 
  Info, 
  HelpCircle, 
  ShieldAlert,
  X,
  ChevronDown
} from "lucide-react";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin?: boolean;
}

export default function Layout({ children, activeTab, setActiveTab, isAdmin }: LayoutProps) {
  const { t, language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { id: "about", label: t("about"), icon: <Info size={18} /> },
    { id: "help", label: t("help"), icon: <HelpCircle size={18} /> },
    { id: "privacy", label: t("privacy"), icon: <ShieldAlert size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-serif no-print">
      {/* Top Header with Dropdown */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[#141414]/5 z-40 md:pl-20 no-print">
        <div className="max-w-4xl mx-auto h-full px-6 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab("profile")}
            title={t("profile") || "Profile"}
            className={`p-2 rounded-xl transition-colors ${activeTab === "profile" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
          >
            <User size={24} />
          </button>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-[#141414]/5 transition-all font-bold text-sm uppercase tracking-widest text-[#141414]/60"
            >
              {language === "ru" ? "Меню" : "Menu"}
              <ChevronDown size={16} className={`transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-[#141414]/5 overflow-hidden p-2 z-50"
                >
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        activeTab === item.id 
                          ? "bg-[#141414] text-white" 
                          : "text-[#141414]/60 hover:bg-[#141414]/5"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#141414]/10 px-6 py-3 flex justify-between items-center md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-screen md:border-t-0 md:border-r md:py-10 z-50 no-print">
        <div className="hidden md:block mb-10">
          {/* Logo removed */}
        </div>
        
        <button 
          onClick={() => setActiveTab("home")}
          title={t("home")}
          className={`p-2 rounded-xl transition-colors ${activeTab === "home" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
        >
          <Home size={24} />
        </button>
        
        <button 
          onClick={() => setActiveTab("lesson")}
          title={t("lesson")}
          className={`p-2 rounded-xl transition-colors ${activeTab === "lesson" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
        >
          <BookOpen size={24} />
        </button>
        
        <button 
          onClick={() => setActiveTab("progress")}
          title={t("progress")}
          className={`p-2 rounded-xl transition-colors ${activeTab === "progress" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
        >
          <CheckCircle size={24} />
        </button>

        <button 
          onClick={() => setActiveTab("chavruta")}
          title={t("chavruta")}
          className={`p-2 rounded-xl transition-colors ${activeTab === "chavruta" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
        >
          <Users size={24} />
        </button>

        {isAdmin && (
          <button 
            onClick={() => setActiveTab("admin")}
            title="Admin"
            className={`p-2 rounded-xl transition-colors ${activeTab === "admin" ? "bg-blue-500 text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
          >
            <Shield size={24} />
          </button>
        )}
        
        <div className="md:mt-auto flex md:flex-col gap-4">
          <button 
            onClick={() => setActiveTab("settings")}
            title={t("settings")}
            className={`p-2 rounded-xl transition-colors ${activeTab === "settings" ? "bg-[#141414] text-white" : "text-[#141414]/50 hover:bg-[#141414]/5"}`}
          >
            <Settings size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 pb-24 md:pb-0 md:pl-20 min-h-screen flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="max-w-4xl mx-auto px-6 py-10 w-full border-t border-[#141414]/5 text-center">
          <p className="text-xs italic text-[#141414]/20">
            © {new Date().getFullYear()} Tanakh365. {language === "ru" ? "Все права защищены." : "All rights reserved."}
          </p>
        </footer>
      </main>
    </div>
  );
}

