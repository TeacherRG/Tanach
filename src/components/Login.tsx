import React from "react";
import { auth, googleProvider, signInWithPopup } from "../firebase";
import { LogIn, BookOpen, Globe, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../data/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[48px] shadow-2xl border border-[#141414]/5 text-center space-y-10"
      >
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-[#141414] text-white rounded-full flex items-center justify-center shadow-xl">
            <BookOpen size={48} />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Tanakh365</h1>
          <p className="text-[#141414]/50 italic">{t("loginSubtitle")}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-5 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl group disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
              {t("signInWithGoogle")}
            </>
          )}
        </button>

        <p className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/20">
          {t("secureStudyPortal")}
        </p>
      </motion.div>
    </div>
  );
}
