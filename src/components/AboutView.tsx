import React from "react";
import { useLanguage } from "../data/LanguageContext";
import { Info } from "lucide-react";

export default function AboutView() {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-10">
      <header>
        <div className="w-12 h-12 bg-[#141414] rounded-full flex items-center justify-center text-white mb-6">
          <Info size={24} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          {t("about")}
        </h1>
        <p className="text-[#141414]/50 italic">
          {language === "ru" ? "Узнайте больше о миссии и видении Tanakh365." : "Learn more about the mission and vision of Tanakh365."}
        </p>
      </header>

      <div className="prose prose-slate max-w-none text-[#141414]/80 space-y-6">
        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            {language === "ru" ? "Наша Миссия" : "Our Mission"}
          </h2>
          <p>
            {language === "ru" 
              ? "Tanakh365 — это цифровая платформа, созданная для того, чтобы сделать ежедневное изучение Танаха доступным, последовательным и глубоким для каждого. Мы верим, что священные тексты должны быть частью повседневной жизни, обогащая наш разум и душу."
              : "Tanakh365 is a digital platform designed to make daily Tanakh study accessible, consistent, and profound for everyone. We believe that sacred texts should be part of everyday life, enriching our minds and souls."}
          </p>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            {language === "ru" ? "Интеграция с Sefaria" : "Sefaria Integration"}
          </h2>
          <p>
            {language === "ru"
              ? "Мы используем открытый API Sefaria для предоставления точных текстов и классических комментариев, включая труды раввина Адина Штейнзальца. Это позволяет нам предлагать богатый учебный опыт с использованием проверенных источников."
              : "We utilize the Sefaria Open API to provide accurate texts and classic commentaries, including the works of Rabbi Adin Steinsaltz. This allows us to offer a rich study experience using trusted sources."}
          </p>
        </section>

        <section className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            {language === "ru" ? "Для кого этот проект?" : "Who is this for?"}
          </h2>
          <p>
            {language === "ru"
              ? "Будь вы опытным ученым или только начинаете свое знакомство с Танахом, наше приложение предлагает структурированный путь через Невиим (Пророки) и Кетувим (Писания), помогая вам завершить цикл изучения за один год."
              : "Whether you are a seasoned scholar or just beginning your journey with Tanakh, our app offers a structured path through the Nevi'im (Prophets) and Ketuvim (Writings), helping you complete the study cycle in one year."}
          </p>
        </section>
      </div>
    </div>
  );
}
