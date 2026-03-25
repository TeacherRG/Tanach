import React from "react";
import { useLanguage } from "../data/LanguageContext";
import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyView() {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-10">
      <header>
        <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center text-white mb-6">
          <Shield size={24} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {t("privacy")}
        </h1>
        <p className="text-[#141414]/50 italic">
          {language === "ru" ? "Ваша конфиденциальность и безопасность данных." : "Your privacy and data security."}
        </p>
      </header>

      <div className="prose prose-slate max-w-none text-[#141414]/80 space-y-6">
        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-[#141414]/30" size={20} />
            <h2 className="text-2xl font-bold">
              {language === "ru" ? "Защита данных" : "Data Protection"}
            </h2>
          </div>
          <p>
            {language === "ru" 
              ? "Мы используем Firebase Authentication для безопасного входа через Google. Ваши пароли никогда не хранятся на наших серверах. Все данные о вашем прогрессе и настройках хранятся в зашифрованном виде в Google Cloud."
              : "We use Firebase Authentication for secure Google login. Your passwords are never stored on our servers. All your progress and settings data are stored encrypted in Google Cloud."}
          </p>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="text-[#141414]/30" size={20} />
            <h2 className="text-2xl font-bold">
              {language === "ru" ? "Сбор информации" : "Information Collection"}
            </h2>
          </div>
          <p>
            {language === "ru"
              ? "Мы собираем только ту информацию, которая необходима для работы приложения: ваше имя, email и данные о прогрессе в изучении Танаха. Мы никогда не продаем ваши данные третьим лицам."
              : "We collect only the information necessary for the application to function: your name, email, and Tanakh study progress data. We never sell your data to third parties."}
          </p>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-[#141414]/30" size={20} />
            <h2 className="text-2xl font-bold">
              {language === "ru" ? "Ваши права" : "Your Rights"}
            </h2>
          </div>
          <p>
            {language === "ru"
              ? "Вы имеете право в любое время запросить удаление вашего аккаунта и всех связанных с ним данных. Для этого свяжитесь с нашей службой поддержки."
              : "You have the right to request the deletion of your account and all associated data at any time. To do this, please contact our support team."}
          </p>
        </section>
      </div>
    </div>
  );
}
