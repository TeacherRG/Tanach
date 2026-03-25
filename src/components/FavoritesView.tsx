import React, { useState, useEffect } from "react";
import { db, collection, query, where, onSnapshot, deleteDoc, doc, handleFirestoreError, OperationType } from "../firebase";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { Star, Trash2, BookOpen, MessageSquare, ExternalLink } from "lucide-react";

interface Favorite {
  id: string;
  userId: string;
  type: 'verse' | 'commentary';
  content: string;
  ref: string;
  day: number;
  createdAt: any;
}

interface FavoritesViewProps {
  user: any;
}

export default function FavoritesView({ user }: FavoritesViewProps) {
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "favorites"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Favorite));
      setFavorites(favs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "favorites");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeFavorite = async (id: string) => {
    try {
      await deleteDoc(doc(db, "favorites", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `favorites/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#141414]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t("favorites")}</h1>
        <p className="text-[#141414]/50 italic">
          {favorites.length} {t("saved")}
        </p>
      </header>

      {favorites.length === 0 ? (
        <div className="p-12 bg-white rounded-[40px] border border-dashed border-[#141414]/10 text-center space-y-4">
          <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto text-[#141414]/20">
            <Star size={32} />
          </div>
          <p className="text-[#141414]/40 italic">{t("noFavorites")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {favorites.map((fav) => (
              <motion.div
                key={fav.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-[40px] border border-[#141414]/5 shadow-sm hover:shadow-md transition-all group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#141414]/5 rounded-full">
                    {fav.type === 'verse' ? (
                      <BookOpen size={14} className="text-[#141414]/40" />
                    ) : (
                      <MessageSquare size={14} className="text-[#141414]/40" />
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">
                      {t(fav.type)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFavorite(fav.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-lg leading-relaxed font-serif text-[#141414]/80">
                    {fav.content}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-[#141414]/5">
                    <span className="font-bold text-sm">{fav.ref}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/30">
                      {t("day")} {fav.day}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
