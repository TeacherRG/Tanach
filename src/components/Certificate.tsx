import React from "react";
import { Trophy, Award, Calendar, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../data/LanguageContext";

interface CertificateProps {
  userName: string;
  completionDate: string;
}

export default function Certificate({ userName, completionDate }: CertificateProps) {
  const { t } = useLanguage();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto bg-white p-12 rounded-[40px] border-8 border-[#141414]/5 shadow-2xl relative overflow-hidden text-center"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#141414]/5 rounded-br-full" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#141414]/5 rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#141414]/5 rounded-tr-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#141414]/5 rounded-tl-full" />

      <div className="relative z-10 space-y-10">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-[#141414] text-white rounded-full flex items-center justify-center shadow-xl">
            <Award size={48} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-sm uppercase tracking-[0.4em] font-bold text-[#141414]/40">{t("certificateTitle")}</h1>
          <h2 className="text-5xl font-bold tracking-tight">{t("certificateMastery")}</h2>
        </div>

        <div className="py-10 border-y border-[#141414]/10">
          <p className="text-[#141414]/50 italic mb-4">{t("certifyThat")}</p>
          <h3 className="text-4xl font-serif italic font-bold text-[#141414]">{userName}</h3>
          <p className="text-[#141414]/50 italic mt-4">{t("completedCycle")}</p>
          <p className="text-xl font-bold mt-2">{t("entireTanakh")}</p>
        </div>

        <div className="flex justify-between items-center pt-6">
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/30">{t("dateOfCompletion")}</p>
            <p className="font-bold">{completionDate}</p>
          </div>
          <div className="flex items-center gap-2 text-[#141414]/20">
            <ShieldCheck size={32} />
            <span className="text-[10px] uppercase tracking-widest font-bold">{t("verifiedStudy")}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/30">{t("authorizedBy")}</p>
            <p className="font-serif italic font-bold">Tanakh365 Portal</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
