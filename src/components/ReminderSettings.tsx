import React, { useState, useEffect } from "react";
import { Bell, Clock, Mail, Globe, Save, Loader2, CheckCircle2, Send, Smartphone } from "lucide-react";
import { db, auth, doc, getDoc, setDoc, handleFirestoreError, OperationType, messaging, getToken } from "../firebase";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../data/LanguageContext";

export default function ReminderSettings() {
  const { t, language, setLanguage } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("08:00");
  const [type, setType] = useState<"email" | "browser" | "both">("both");
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!auth.currentUser) return;
      
      try {
        const docRef = doc(db, "reminders", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEnabled(data.enabled);
          setTime(data.preferredTime);
          setType(data.type || "both");
          setEmailSubscribed(data.emailSubscribed || false);
          setPushEnabled(!!data.pushToken);
        }
      } catch (error) {
        console.error("Error loading reminder settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    
    setSaving(true);
    setSaved(false);
    
    try {
      let pushToken = null;

      if (pushEnabled && messaging) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            pushToken = await getToken(messaging, {
              vapidKey: "TODO_VAPID_KEY" // Optional: if you have a VAPID key
            });
          }
        } catch (err) {
          console.error("Error getting push token:", err);
        }
      }

      const docRef = doc(db, "reminders", auth.currentUser.uid);
      await setDoc(docRef, {
        userId: auth.currentUser.uid,
        enabled,
        preferredTime: time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        type,
        emailSubscribed,
        pushToken: pushToken || null
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Request browser notification permission if needed
      if (enabled && (type === "browser" || type === "both")) {
        if ("Notification" in window && Notification.permission !== "granted") {
          await Notification.requestPermission();
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reminders/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-[#141414]/20" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      <header className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("studyReminders")}</h2>
        <p className="text-[#141414]/50 italic">{t("remindersSubtitle")}</p>
      </header>

      <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm space-y-8">
        {/* Language Selection */}
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-widest font-bold text-[#141414]/40 flex items-center gap-2">
            <Globe size={14} />
            {t("language")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage("en")}
              className={`py-4 rounded-2xl border-2 font-bold transition-all ${
                language === "en" 
                  ? "bg-[#141414] border-[#141414] text-white" 
                  : "bg-white border-[#141414]/5 text-[#141414]/40 hover:border-[#141414]/20"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ru")}
              className={`py-4 rounded-2xl border-2 font-bold transition-all ${
                language === "ru" 
                  ? "bg-[#141414] border-[#141414] text-white" 
                  : "bg-white border-[#141414]/5 text-[#141414]/40 hover:border-[#141414]/20"
              }`}
            >
              Русский
            </button>
          </div>
        </div>

        <div className="h-px bg-[#141414]/5" />

        {/* Newsletter Subscription */}
        <div className="flex items-center justify-between p-4 bg-[#F5F5F0]/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${emailSubscribed ? "bg-[#141414] text-white" : "bg-[#141414]/5 text-[#141414]/30"}`}>
              <Send size={20} />
            </div>
            <div>
              <p className="font-bold">{t("newsletter")}</p>
              <p className="text-xs text-[#141414]/40">{t("subscribeNewsletter")}</p>
            </div>
          </div>
          <button 
            onClick={() => setEmailSubscribed(!emailSubscribed)}
            className={`w-14 h-8 rounded-full transition-all relative ${emailSubscribed ? "bg-[#141414]" : "bg-[#141414]/10"}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${emailSubscribed ? "left-7" : "left-1 shadow-sm"}`} />
          </button>
        </div>

        {/* Push Notifications Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#F5F5F0]/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${pushEnabled ? "bg-[#141414] text-white" : "bg-[#141414]/5 text-[#141414]/30"}`}>
              <Smartphone size={20} />
            </div>
            <div>
              <p className="font-bold">{t("pushNotifications")}</p>
              <p className="text-xs text-[#141414]/40">{t("enablePush")}</p>
            </div>
          </div>
          <button 
            onClick={() => setPushEnabled(!pushEnabled)}
            className={`w-14 h-8 rounded-full transition-all relative ${pushEnabled ? "bg-[#141414]" : "bg-[#141414]/10"}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${pushEnabled ? "left-7" : "left-1 shadow-sm"}`} />
          </button>
        </div>

        <div className="h-px bg-[#141414]/5" />

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#F5F5F0]/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${enabled ? "bg-[#141414] text-white" : "bg-[#141414]/5 text-[#141414]/30"}`}>
              <Bell size={20} />
            </div>
            <div>
              <p className="font-bold">{t("dailyReminders")}</p>
              <p className="text-xs text-[#141414]/40">{t("receiveNudge")}</p>
            </div>
          </div>
          <button 
            onClick={() => setEnabled(!enabled)}
            className={`w-14 h-8 rounded-full transition-all relative ${enabled ? "bg-[#141414]" : "bg-[#141414]/10"}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${enabled ? "left-7" : "left-1 shadow-sm"}`} />
          </button>
        </div>

        <AnimatePresence>
          {enabled && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 overflow-hidden"
            >
              {/* Time Picker */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest font-bold text-[#141414]/40 flex items-center gap-2">
                  <Clock size={14} />
                  {t("preferredTime")}
                </label>
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-4 bg-[#F5F5F0] rounded-2xl border-2 border-transparent focus:border-[#141414] focus:bg-white transition-all outline-none font-bold text-xl"
                />
              </div>

              {/* Reminder Type */}
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-widest font-bold text-[#141414]/40 flex items-center gap-2">
                  <Mail size={14} />
                  {t("reminderMethod")}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["email", "browser", "both"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setType(method)}
                      className={`py-3 rounded-xl border-2 text-xs font-bold capitalize transition-all ${
                        type === method 
                          ? "bg-[#141414] border-[#141414] text-white" 
                          : "bg-white border-[#141414]/5 text-[#141414]/40 hover:border-[#141414]/20"
                      }`}
                    >
                      {t(method)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone Info */}
              <div className="flex items-center gap-2 text-[10px] text-[#141414]/30 uppercase tracking-widest font-bold">
                <Globe size={12} />
                {t("timezone")}: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
            saved 
              ? "bg-green-500 text-white" 
              : "bg-[#141414] text-white hover:scale-[1.02]"
          }`}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : saved ? (
            <>
              <CheckCircle2 size={20} />
              {t("settingsSaved")}
            </>
          ) : (
            <>
              <Save size={20} />
              {t("savePreferences")}
            </>
          )}
        </button>
      </div>

      <div className="p-6 bg-[#141414]/5 rounded-3xl border border-[#141414]/5">
        <p className="text-xs text-[#141414]/50 leading-relaxed italic">
          {t("reminderNote")}
          <br /><br />
          {t("pushNote")}
        </p>
      </div>
    </div>
  );
}
