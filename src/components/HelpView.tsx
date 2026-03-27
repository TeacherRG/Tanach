import React from "react";
import { useLanguage } from "../data/LanguageContext";
import { HelpCircle, Book, CheckCircle, Users, Settings } from "lucide-react";

export default function HelpView() {
  const { t, language } = useLanguage();

  const helpSections = [
    {
      icon: <Home size={20} />,
      title: language === "ru" ? "Панель управления" : "Dashboard",
      content: language === "ru" 
        ? "Здесь вы видите ваш ежедневный план чтения, текущую серию дней (стрик) и прогресс в достижении ежедневной цели."
        : "Here you see your daily reading plan, current streak, and progress towards your daily goal."
    },
    {
      icon: <Book size={20} />,
      title: language === "ru" ? "Чтение и комментарии" : "Reading & Commentary",
      content: language === "ru"
        ? "Нажмите на чтение, чтобы открыть текст. Вы можете переключаться между ивритом и английским, а также включать комментарии Штейнзальца."
        : "Click on a reading to open the text. You can toggle between Hebrew and English, and enable Steinsaltz commentary."
    },
    {
      icon: <CheckCircle size={20} />,
      title: language === "ru" ? "Тесты и прогресс" : "Quizzes & Progress",
      content: language === "ru"
        ? "После каждого чтения доступен тест. Успешное прохождение теста отмечает чтение как завершенное в вашем годовом плане."
        : "After each reading, a quiz is available. Successfully completing the quiz marks the reading as finished in your annual plan."
    },
    {
      icon: <Users size={20} />,
      title: language === "ru" ? "Хеврута (Напарник)" : "Chavruta (Study Partner)",
      content: language === "ru"
        ? "Используйте раздел 'Хеврута', чтобы найти партнера для совместного изучения. Вы можете общаться во встроенном чате."
        : "Use the 'Chavruta' section to find a partner for joint study. You can communicate in the built-in chat."
    },
    {
      icon: <Settings size={20} />,
      title: language === "ru" ? "Настройки и напоминания" : "Settings & Reminders",
      content: language === "ru"
        ? "Настройте ежедневные уведомления (браузерные или email), чтобы не пропускать занятия. Также здесь можно изменить голос и скорость чтения."
        : "Set up daily notifications (browser or email) to never miss a session. You can also change the reading voice and speed here."
    }
  ];

  return (
    <div className="space-y-10">
      <header>
        <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center text-white mb-6">
          <HelpCircle size={24} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {t("help")}
        </h1>
        <p className="text-[#141414]/50 italic">
          {language === "ru" ? "Как пользоваться приложением Tanakh365." : "How to use the Tanakh365 application."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {helpSections.map((section, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm flex gap-6">
            <div className="w-10 h-10 bg-[#141414]/5 rounded-xl flex items-center justify-center text-[#141414]/50 shrink-0">
              {section.icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{section.title}</h3>
              <p className="text-[#141414]/70 leading-relaxed">{section.content}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-amber-50 p-8 rounded-3xl border border-amber-200">
        <h3 className="text-xl font-bold text-amber-900 mb-2">
          {language === "ru" ? "Нужна дополнительная помощь?" : "Need more help?"}
        </h3>
        <p className="text-amber-800">
          {language === "ru" 
            ? "Если у вас возникли технические проблемы или вопросы по содержанию, пожалуйста, свяжитесь с нами по адресу support@tanakh365.com."
            : "If you have technical issues or questions about the content, please contact us at kosherletter@gmail.com."}
        </p>
      </section>
    </div>
  );
}

// Helper to import Home since it's used in helpSections
import { Home } from "lucide-react";
