import React, { useState } from "react";
import { auth, db, doc, setDoc, handleFirestoreError, OperationType, googleProvider, signInWithPopup } from "../firebase";
import { LogOut, User, Mail, Calendar, ShieldCheck, Check, Languages, Volume2, Gauge, Star, History, Award, LogIn } from "lucide-react";
import { useLanguage } from "../data/LanguageContext";
import { motion } from "motion/react";
import { VOICES, SPEEDS } from "../constants";

interface ProfileViewProps {
  user: any;
  userProfile: any;
  isAdmin: boolean;
  setActiveTab: (tab: string) => void;
  earnedBadges: { en: string, ru: string }[];
}

export default function ProfileView({ user, userProfile, isAdmin, setActiveTab, earnedBadges }: ProfileViewProps) {
  const { t, language } = useLanguage();
  const [isUpdating, setIsUpdating] = useState(false);

  const isGuest = user?.isAnonymous;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign in failed:", error);
    }
  };

  const updateGender = async (gender: 'male' | 'female') => {
    if (!user?.uid) return;
    setIsUpdating(true);
    try {
      await setDoc(doc(db, "users", user.uid), { gender }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!user?.uid) return;
    setIsUpdating(true);
    try {
      await setDoc(doc(db, "users", user.uid), { [key]: value }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {t("profile")}
        </h1>
        <p className="text-[#141414]/50 italic text-sm">
          {language === "ru" ? "Управление вашей учетной записью." : "Manage your account information."}
        </p>
      </header>

      {isGuest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-amber-800">{t("guestBannerTitle")}</h3>
            <p className="text-sm text-amber-700/80">{t("guestBannerDesc")}</p>
          </div>
          <button
            onClick={handleSignIn}
            className="flex-shrink-0 px-5 py-3 bg-[#141414] text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all text-sm"
          >
            <LogIn size={16} />
            {t("signInWithGoogle")}
          </button>
        </motion.div>
      )}

      <div className="bg-white p-10 rounded-[40px] border border-[#141414]/5 shadow-sm space-y-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-[#141414]/5 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden border-4 border-white shadow-xl">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : isGuest ? (
              <User size={48} className="text-[#141414]/20" />
            ) : (
              user.displayName?.[0] || user.email?.[0]?.toUpperCase()
            )}
          </div>

          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
              {isGuest
                ? (language === "ru" ? "Гость" : "Guest")
                : user.displayName || (language === "ru" ? "Анонимный пользователь" : "Anonymous User")}
              {isAdmin && <ShieldCheck className="text-blue-500" size={24} />}
            </h2>
            {!isGuest && (
              <div className="flex items-center justify-center md:justify-start gap-2 text-[#141414]/50">
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
            )}
            {isGuest && (
              <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 text-[10px] uppercase tracking-widest font-bold rounded-full">
                {t("guestMode")}
              </span>
            )}
            {isAdmin && (
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] uppercase tracking-widest font-bold rounded-full">
                Administrator
              </span>
            )}
          </div>
        </div>

        {/* Account Links */}
        <div className="pt-10 border-t border-[#141414]/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setActiveTab("favorites")}
            className="p-6 bg-[#141414]/5 rounded-3xl flex items-center gap-4 hover:bg-[#141414]/10 transition-all group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-110 transition-transform">
              <Star size={24} fill="currentColor" />
            </div>
            <div className="text-left">
              <h4 className="font-bold">{t("favorites")}</h4>
              <p className="text-[10px] text-[#141414]/40 uppercase tracking-widest">{language === "ru" ? "Ваши сохраненные стихи" : "Your saved verses"}</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("quiz_history")}
            className="p-6 bg-[#141414]/5 rounded-3xl flex items-center gap-4 hover:bg-[#141414]/10 transition-all group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
              <History size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold">{t("quizHistory")}</h4>
              <p className="text-[10px] text-[#141414]/40 uppercase tracking-widest">{language === "ru" ? "Результаты ваших тестов" : "Your quiz results"}</p>
            </div>
          </button>
        </div>

        {/* Mastery Badges */}
        {earnedBadges.length > 0 && (
          <div className="pt-10 border-t border-[#141414]/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#141414]/30">
              {language === "ru" ? "Знаки Мастерства" : "Mastery Badges"}
            </h3>
            <div className="flex flex-wrap gap-4">
              {earnedBadges.map((badge) => (
                <div 
                  key={badge.en}
                  className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-full flex items-center gap-2 text-amber-700 shadow-sm"
                >
                  <Award size={16} />
                  <span className="text-xs font-bold">
                    {language === "ru" ? `Мастер ${badge.ru}` : `Master of ${badge.en}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gender Selection */}
        <div className="pt-10 border-t border-[#141414]/5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#141414]/30">
            {t("gender")}
          </h3>
          <div className="flex gap-4">
            <button
              disabled={isUpdating}
              onClick={() => updateGender('male')}
              className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                userProfile?.gender === 'male'
                  ? "bg-[#141414] text-white shadow-lg"
                  : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
              }`}
            >
              {userProfile?.gender === 'male' && <Check size={18} />}
              {t("male")}
            </button>
            <button
              disabled={isUpdating}
              onClick={() => updateGender('female')}
              className={`flex-1 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                userProfile?.gender === 'female'
                  ? "bg-[#141414] text-white shadow-lg"
                  : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
              }`}
            >
              {userProfile?.gender === 'female' && <Check size={18} />}
              {t("female")}
            </button>
          </div>
          <p className="text-[10px] text-[#141414]/30 italic">
            {language === "ru" 
              ? "* Пол используется для поиска хевруты (партнера по учебе) в соответствии с еврейской традицией." 
              : "* Gender is used for finding a chavruta (study partner) in accordance with Jewish tradition."}
          </p>
        </div>

        {/* Text & Reading Settings */}
        <div className="pt-10 border-t border-[#141414]/5 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#141414]/5 rounded-full flex items-center justify-center text-[#141414]/40">
              <Languages size={20} />
            </div>
            <h3 className="text-xl font-bold">{t("textSettings")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Text Display Language */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#141414]/30 flex items-center gap-2">
                <Languages size={14} />
                {t("textLanguage")}
              </h4>
              <div className="flex gap-2">
                {(['he', 'en', 'both'] as const).map((l) => (
                  <button
                    key={l}
                    disabled={isUpdating}
                    onClick={() => updateSetting('textLanguage', l)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      (userProfile?.textLanguage || 'both') === l
                        ? "bg-[#141414] text-white"
                        : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
                    }`}
                  >
                    {t(l === 'he' ? 'hebrew' : l === 'en' ? 'english' : 'both')}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Voice */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#141414]/30 flex items-center gap-2">
                <Volume2 size={14} />
                {t("readingVoice")}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    disabled={isUpdating}
                    onClick={() => updateSetting('readingVoice', v.id)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                      (userProfile?.readingVoice || 'Zephyr') === v.id
                        ? "bg-[#141414] text-white"
                        : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Speed */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#141414]/30 flex items-center gap-2">
                <Gauge size={14} />
                {t("readingSpeed")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    disabled={isUpdating}
                    onClick={() => updateSetting('readingSpeed', s)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                      (userProfile?.readingSpeed || 1) === s
                        ? "bg-[#141414] text-white"
                        : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-[#141414]/5">
          <div className="p-6 bg-[#141414]/5 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-[#141414]/30">
              <User size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">User ID</span>
            </div>
            <p className="font-mono text-xs truncate">{user.uid}</p>
          </div>
          
          <div className="p-6 bg-[#141414]/5 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-[#141414]/30">
              <Calendar size={16} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Account Status</span>
            </div>
            <p className="text-sm font-bold">Active</p>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row gap-4">
          {isGuest ? (
            <button
              onClick={handleSignIn}
              className="flex-1 px-10 py-4 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#141414]/90 transition-all"
            >
              <LogIn size={20} />
              {t("signInToSave")}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex-1 px-10 py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-100 transition-all"
            >
              <LogOut size={20} />
              {language === "ru" ? "Выйти из системы" : "Sign Out"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

