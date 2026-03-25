import React, { useState, useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import LessonView from "./components/LessonView";
import Quiz from "./components/Quiz";
import Certificate from "./components/Certificate";
import Login from "./components/Login";
import ReminderSettings from "./components/ReminderSettings";
import AdminView from "./components/AdminView";
import ProfileView from "./components/ProfileView";
import ChavrutaView from "./components/ChavrutaView";
import FavoritesView from "./components/FavoritesView";
import QuizHistoryView from "./components/QuizHistoryView";
import Badge from "./components/Badge";
import AboutView from "./components/AboutView";
import HelpView from "./components/HelpView";
import PrivacyView from "./components/PrivacyView";
import { TANAKH_SCHEDULE, DaySchedule } from "./data/schedule";
import { ALL_METADATA, NEVIIM_METADATA, KETUVIM_METADATA } from "./data/tanakhMetadata";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "./data/LanguageContext";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  handleFirestoreError, 
  OperationType,
  User,
  getDoc
} from "./firebase";
import { Loader2, CheckCircle2, BookOpen } from "lucide-react";
import { DateTime } from "luxon";
import { toast } from "sonner";

import { STATIC_CURATED_LESSONS } from "./data/curatedLessons";

export default function App() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [currentDay, setCurrentDay] = useState(1);
  const [completedPortions, setCompletedPortions] = useState<string[]>([]);
  const [viewingPortion, setViewingPortion] = useState<{ day: number, portion: any, index: number } | null>(null);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reminderSettings, setReminderSettings] = useState<any>(null);
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [versesReadToday, setVersesReadToday] = useState<number>(0);
  const [curatedLessons, setCuratedLessons] = useState<Record<number, any>>(STATIC_CURATED_LESSONS);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [earnedBadges, setEarnedBadges] = useState<{ en: string, ru: string }[]>([]);
  const [newBadge, setNewBadge] = useState<{ bookName: string, date: string } | null>(null);

  const TOTAL_DAYS = TANAKH_SCHEDULE.length;
  const isAdmin = user?.email === "ryvgrin@gmail.com" || user?.email === "roman.grinberg.at@gmail.com" || userProfile?.role === "admin";

  const isGuest = user?.isAnonymous === true;

  // Sync User Profile
  useEffect(() => {
    if (!user?.uid || isGuest) {
      setUserProfile(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsubscribe();
  }, [user?.uid, isGuest]);

  // Sync Curated Lessons
  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribe = onSnapshot(collection(db, "curated_lessons"), (snapshot) => {
      const lessons: Record<number, any> = { ...STATIC_CURATED_LESSONS };
      snapshot.docs.forEach(doc => {
        lessons[parseInt(doc.id)] = doc.data();
      });
      setCuratedLessons(lessons);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "curated_lessons");
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      if (!reminderSettings?.enabled || !reminderSettings?.preferredTime) return;
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime === reminderSettings.preferredTime) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Tanakh365 Study Time", {
            body: language === "ru" ? "Время для вашего ежедневного изучения Танаха! Откройте приложение, чтобы продолжить." : "It's time for your daily study portion! Open the app to continue your journey.",
            icon: "/favicon.ico"
          });
        }
      }
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminderSettings, language]);

  // Sync Reminder Settings
  useEffect(() => {
    if (!user || !isAuthReady || isGuest) return;

    const unsubscribe = onSnapshot(doc(db, "reminders", user.uid), (doc) => {
      if (doc.exists()) {
        setReminderSettings(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `reminders/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Sync Earned Badges
  useEffect(() => {
    if (!user || !isAuthReady || isGuest) return;

    const unsubscribe = onSnapshot(collection(db, "badges"), (snapshot) => {
      const badges = snapshot.docs
        .filter(doc => doc.data().userId === user.uid)
        .map(doc => ({
          en: doc.data().bookName,
          ru: doc.data().ruBookName || doc.data().bookName
        }));
      setEarnedBadges(badges);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "badges");
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Check for new badges when completedPortions changes
  useEffect(() => {
    if (!user || !isAuthReady || completedPortions.length === 0 || isGuest) return;

    const checkNewBadges = async () => {
      // Group portions by book
      const bookPortions: Record<string, string[]> = {};
      
      TANAKH_SCHEDULE.forEach(day => {
        if (day.isStudyDay) {
          day.portions.forEach((p, idx) => {
            if (!bookPortions[p.book]) {
              bookPortions[p.book] = [];
            }
            bookPortions[p.book].push(`${day.day}_${idx}`);
          });
        }
      });

      for (const [bookName, portions] of Object.entries(bookPortions)) {
        if (earnedBadges.some(b => b.en === bookName)) continue;

        const isCompleted = portions.every(pId => completedPortions.includes(pId));
        
        if (isCompleted) {
          // Earn new badge!
          const badgeId = `${user.uid}_${bookName.replace(/\s+/g, '_')}`;
          const date = new Date().toLocaleDateString();
          
          // Find Russian name
          const bookMeta = ALL_METADATA.find(m => m.displayName === bookName);
          const ruBookName = bookMeta?.ruName || bookName;
          
          try {
            await setDoc(doc(db, "badges", badgeId), {
              userId: user.uid,
              bookName: bookName,
              ruBookName: ruBookName,
              earnedAt: new Date()
            });
            
            // Show the badge modal
            setNewBadge({ bookName: language === "ru" ? ruBookName : bookName, date });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `badges/${badgeId}`);
          }
        }
      }
    };

    checkNewBadges();
  }, [completedPortions, earnedBadges, user, isAuthReady]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Progress from Firestore
  useEffect(() => {
    if (!user || !isAuthReady || isGuest) {
      if (isGuest) setLoading(false);
      return;
    }

    const q = query(collection(db, "progress"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const completed = snapshot.docs.map(doc => doc.data().portionId);
      setCompletedPortions(completed);
      
      // Calculate verses read today using local timezone
      const todayStr = DateTime.now().toISODate();
      const todayVerses = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          if (!data.completedAt) return false;
          // Convert Firestore Timestamp to local date string
          const date = DateTime.fromJSDate(data.completedAt.toDate()).toISODate();
          return date === todayStr;
        })
        .reduce((acc, doc) => {
          const data = doc.data();
          const day = TANAKH_SCHEDULE.find(d => d.day === data.day);
          // Fallback to portionIndex for older data
          const portion = day?.portions.find(p => p.track === data.track) || day?.portions[data.portionIndex];
          return acc + (portion?.verseCount || 0);
        }, 0);
      setVersesReadToday(todayVerses);

      // Calculate current day based on today's local date
      const todayPlan = TANAKH_SCHEDULE.find(d => d.date === todayStr);
      
      if (todayPlan && todayPlan.isStudyDay) {
        setCurrentDay(todayPlan.day);
      } else {
        // If today is not a study day, find the next study day
        const nextStudyDay = TANAKH_SCHEDULE.find(d => d.date >= todayStr && d.isStudyDay);
        if (nextStudyDay) {
          setCurrentDay(nextStudyDay.day);
        } else {
          // Fallback to first uncompleted day
          let next = 1;
          for (let i = 1; i <= TOTAL_DAYS; i++) {
            const day = TANAKH_SCHEDULE.find(d => d.day === i);
            const allPortionsDone = day?.portions.every(p => completed.includes(`${i}_${p.track}`));
            if (!allPortionsDone) {
              next = i;
              break;
            }
          }
          setCurrentDay(next);
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "progress");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, TOTAL_DAYS]);

  // Sync User Profile and Goal to Firestore
  useEffect(() => {
    if (!user || isGuest) return;

    const syncUser = async () => {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        try {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            joinedAt: new Date(),
            role: 'user',
            dailyGoal: 20
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        setDailyGoal(userDoc.data().dailyGoal || 20);
      }
    };
    syncUser();
  }, [user]);

  const handleSetGoal = async (goal: number) => {
    if (!user) return;
    setDailyGoal(goal);
    try {
      await setDoc(doc(db, "users", user.uid), { dailyGoal: goal }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleStartLesson = (day: number, portion: any, index: number) => {
    setViewingPortion({ day, portion, index });
    setActiveTab("lesson");
  };

  const handleCompleteLesson = () => {
    setIsTakingQuiz(true);
  };

  const handleCompleteQuiz = async (score: number) => {
    if (viewingPortion && user && !isGuest) {
      const portionId = `${viewingPortion.day}_${viewingPortion.portion.track}`;
      const progressId = `${user.uid}_${portionId}`;
      try {
        await setDoc(doc(db, "progress", progressId), {
          userId: user.uid,
          day: viewingPortion.day,
          track: viewingPortion.portion.track,
          portionId: portionId,
          completedAt: new Date(),
          quizScore: score
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `progress/${progressId}`);
      }
    }
    if (score / (viewingPortion?.portion.verseCount || 1) >= 0.7) {
      toast.success(language === "ru" ? "Отличный результат! Чтение завершено." : "Excellent score! Reading completed.", {
        description: language === "ru" ? "Ваш прогресс сохранен." : "Your progress has been saved.",
        duration: 5000,
      });
    } else {
      toast.info(language === "ru" ? "Чтение завершено." : "Reading completed.", {
        description: language === "ru" ? "Попробуйте улучшить результат в следующий раз!" : "Try to improve your score next time!",
      });
    }
    setIsTakingQuiz(false);
    setViewingPortion(null);
    setActiveTab("home");
  };

  if (!isAuthReady || (user && loading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F0] space-y-4">
        <Loader2 className="animate-spin text-[#141414]/50" size={48} />
        <p className="text-[#141414]/50 italic">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin}>
      <AnimatePresence>
        {newBadge && (
          <Badge 
            bookName={newBadge.bookName} 
            completionDate={newBadge.date} 
            onClose={() => setNewBadge(null)} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {showCertificate ? (
          <motion.div
            key="certificate"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10"
          >
            <Certificate 
              userName={user.displayName || "Roman Grinberg"} 
              completionDate={new Date().toLocaleDateString()} 
            />
            <div className="mt-10 flex justify-center">
              <button 
                onClick={() => setShowCertificate(false)}
                className="px-8 py-3 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all"
              >
                {language === "ru" ? "Вернуться к панели управления" : "Return to Dashboard"}
              </button>
            </div>
          </motion.div>
        ) : activeTab === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Dashboard 
              currentDay={currentDay} 
              completedPortions={completedPortions}
              onStartLesson={handleStartLesson}
              dailyGoal={dailyGoal}
              versesReadToday={versesReadToday}
              onSetGoal={handleSetGoal}
            />
          </motion.div>
        ) : activeTab === "lesson" ? (
          <motion.div
            key="lesson"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {isTakingQuiz && viewingPortion ? (
              <Quiz 
                day={viewingPortion.day}
                portion={viewingPortion.portion}
                onComplete={handleCompleteQuiz} 
                curatedQuestions={curatedLessons[viewingPortion.day]?.portions[viewingPortion.index]?.quiz}
                isAdmin={isAdmin}
              />
            ) : viewingPortion ? (
              <LessonView 
                day={viewingPortion.day}
                portion={viewingPortion.portion}
                onComplete={handleCompleteLesson} 
                curatedData={curatedLessons[viewingPortion.day]?.portions[viewingPortion.index]}
                isAdmin={isAdmin}
                userProfile={userProfile}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                <div className="w-20 h-20 bg-[#141414]/5 rounded-full flex items-center justify-center text-[#141414]/30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {language === "ru" ? "Нет активного чтения" : "No active reading"}
                  </h3>
                  <p className="text-[#141414]/50 italic">
                    {language === "ru" ? "Выберите чтение на панели управления, чтобы начать." : "Select a reading from the dashboard to begin."}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab("home")}
                  className="px-8 py-3 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all"
                >
                  {language === "ru" ? "Перейти к панели управления" : "Go to Dashboard"}
                </button>
              </div>
            )}
          </motion.div>
        ) : activeTab === "progress" ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-10"
          >
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">
                  {language === "ru" ? "Ваш прогресс" : "Your Progress"}
                </h1>
                <p className="text-[#141414]/50 italic">
                  {language === "ru" ? "Отслеживание вашего пути через Танах." : "Tracking your journey through the Tanakh."}
                </p>
              </div>
              {completedPortions.length === TOTAL_DAYS * 2 && (
                <button 
                  onClick={() => setShowCertificate(true)}
                  className="px-6 py-2 bg-[#141414] text-white rounded-full font-bold hover:bg-opacity-90 transition-all text-sm flex items-center gap-2"
                >
                  {language === "ru" ? "Посмотреть сертификат" : "View Certificate"}
                </button>
              )}
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {TANAKH_SCHEDULE.map(day => {
                const allDone = day.isStudyDay && day.portions.every(p => completedPortions.includes(`${day.day}_${p.track}`));
                const someDone = day.isStudyDay && day.portions.some(p => completedPortions.includes(`${day.day}_${p.track}`));

                return (
                  <div 
                    key={day.date}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[120px] ${
                      allDone 
                        ? "bg-[#141414] border-[#141414] text-white shadow-md" 
                        : day.day === currentDay
                        ? "border-[#141414] text-[#141414] bg-white shadow-lg ring-2 ring-[#141414]/10"
                        : someDone
                        ? "border-[#141414]/40 text-[#141414] bg-white"
                        : "border-[#141414]/5 text-[#141414]/40 bg-white/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold uppercase tracking-widest ${allDone ? "text-white/40" : "text-[#141414]/20"}`}>
                        {day.isStudyDay ? `${t("day")} ${day.day}` : "Rest"}
                      </span>
                      {allDone && <CheckCircle2 size={14} className="text-white/60" />}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center gap-1">
                      {day.isStudyDay ? (
                        day.portions.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between">
                            <div className="overflow-hidden">
                              <h4 className={`font-bold text-[10px] truncate ${allDone ? "text-white" : "text-[#141414]"}`}>
                                {language === "ru" ? p.ruBook : p.book}
                              </h4>
                              <p className={`text-[8px] italic truncate ${allDone ? "text-white/60" : "text-[#141414]/50"}`}>
                                {language === "ru" ? p.ruRef.split(" ").slice(1).join(" ") : p.ref.split(" ").slice(1).join(" ")}
                              </p>
                            </div>
                            {completedPortions.includes(`${day.day}_${p.track}`) && !allDone && (
                              <CheckCircle2 size={10} className="text-green-500" />
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] italic opacity-50">{day.reason}</p>
                      )}
                    </div>

                    <div className={`mt-2 text-[8px] font-bold uppercase tracking-tighter ${allDone ? "text-white/30" : "text-[#141414]/20"}`}>
                      {DateTime.fromISO(day.date).toFormat('dd MMM yyyy')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Track-based Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Nevi'im Progress */}
              <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="text-[#141414]/40" size={20} />
                  <h4 className="text-sm uppercase tracking-widest font-bold text-[#141414]/60">
                    {language === "ru" ? "Пророки (Невиим)" : "Nevi'im"}
                  </h4>
                </div>
                <div className="space-y-4">
                  {NEVIIM_METADATA.map(book => {
                    const bookPortions = TANAKH_SCHEDULE.flatMap(d => d.portions.filter(p => p.bookName === book.name).map(p => ({ ...p, day: d.day })));
                    const completedCount = bookPortions.filter(p => completedPortions.includes(`${p.day}_${p.track}`)).length;
                    const progress = bookPortions.length > 0 ? (completedCount / bookPortions.length) * 100 : 0;
                    
                    return (
                      <div key={book.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{language === "ru" ? book.ruName : book.displayName}</span>
                          <span className="text-[#141414]/40">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#141414]/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-[#141414]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ketuvim Progress */}
              <div className="bg-white p-8 rounded-[32px] border border-[#141414]/5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="text-[#141414]/40" size={20} />
                  <h4 className="text-sm uppercase tracking-widest font-bold text-[#141414]/60">
                    {language === "ru" ? "Писания (Ктувим)" : "Ketuvim"}
                  </h4>
                </div>
                <div className="space-y-4">
                  {KETUVIM_METADATA.map(book => {
                    const bookPortions = TANAKH_SCHEDULE.flatMap(d => d.portions.filter(p => p.bookName === book.name).map(p => ({ ...p, day: d.day })));
                    const completedCount = bookPortions.filter(p => completedPortions.includes(`${p.day}_${p.track}`)).length;
                    const progress = bookPortions.length > 0 ? (completedCount / bookPortions.length) * 100 : 0;
                    
                    return (
                      <div key={book.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{language === "ru" ? book.ruName : book.displayName}</span>
                          <span className="text-[#141414]/40">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#141414]/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-[#141414]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === "settings" ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ReminderSettings />
          </motion.div>
        ) : activeTab === "chavruta" ? (
          <motion.div
            key="chavruta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ChavrutaView user={user} userProfile={userProfile} />
          </motion.div>
        ) : activeTab === "profile" ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ProfileView user={user} userProfile={userProfile} isAdmin={isAdmin} setActiveTab={setActiveTab} earnedBadges={earnedBadges} />
          </motion.div>
        ) : activeTab === "favorites" ? (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FavoritesView user={user} />
          </motion.div>
        ) : activeTab === "quiz_history" ? (
          <motion.div
            key="quiz_history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <QuizHistoryView user={user} />
          </motion.div>
        ) : activeTab === "admin" && isAdmin ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AdminView />
          </motion.div>
        ) : activeTab === "about" ? (
          <motion.div
            key="about"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AboutView />
          </motion.div>
        ) : activeTab === "help" ? (
          <motion.div
            key="help"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <HelpView />
          </motion.div>
        ) : activeTab === "privacy" ? (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PrivacyView />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Layout>
  );
}
