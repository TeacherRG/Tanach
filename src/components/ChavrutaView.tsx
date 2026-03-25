import React, { useState, useEffect, useRef } from "react";
import { db, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, handleFirestoreError, OperationType, serverTimestamp, orderBy } from "../firebase";
import { useLanguage } from "../data/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { Users, Clock, Calendar, Plus, Trash2, MessageCircle, AlertCircle, User as UserIcon, X, Send, ChevronLeft, CheckCircle2 } from "lucide-react";

interface ChavrutaRequest {
  id: string;
  userId: string;
  userName: string;
  gender: 'male' | 'female';
  preferredTime: string;
  days: string[];
  status: 'open' | 'matched' | 'closed';
  createdAt: any;
  expiresAt: any;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: { [uid: string]: string };
  lastMessage?: string;
  updatedAt: any;
  requestId: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

interface ChavrutaViewProps {
  user: any;
  userProfile: any;
}

export default function ChavrutaView({ user, userProfile }: ChavrutaViewProps) {
  const { t, language } = useLanguage();
  const [requests, setRequests] = useState<ChavrutaRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ChavrutaRequest[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const daysOfWeek = [
    { id: 'mon', en: 'Mon', ru: 'Пн' },
    { id: 'tue', en: 'Tue', ru: 'Вт' },
    { id: 'wed', en: 'Wed', ru: 'Ср' },
    { id: 'thu', en: 'Thu', ru: 'Чт' },
    { id: 'fri', en: 'Fri', ru: 'Пт' },
    { id: 'sun', en: 'Sun', ru: 'Вс' },
  ];

  useEffect(() => {
    if (!userProfile?.gender) {
      setLoading(false);
      return;
    }

    // Listen to requests
    const qReq = query(
      collection(db, "chavruta_requests"),
      where("gender", "==", userProfile.gender),
      where("status", "==", "open")
    );

    const unsubReq = onSnapshot(qReq, (snapshot) => {
      const allReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChavrutaRequest));
      setRequests(allReqs.filter(r => r.userId !== user.uid));
      setMyRequests(allReqs.filter(r => r.userId === user.uid));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chavruta_requests");
    });

    // Listen to chats
    const qChat = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubChat = onSnapshot(qChat, (snapshot) => {
      const allChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(allChats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chats");
    });

    return () => {
      unsubReq();
      unsubChat();
    };
  }, [user.uid, userProfile?.gender]);

  useEffect(() => {
    if (!activeChat) return;

    const qMsg = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(allMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubMsg();
  }, [activeChat?.id]);

  const handleCreateRequest = async () => {
    if (!userProfile?.gender) return;
    
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Active for 7 days

      await addDoc(collection(db, "chavruta_requests"), {
        userId: user.uid,
        userName: user.displayName || user.email,
        gender: userProfile.gender,
        preferredTime,
        days: selectedDays,
        status: 'open',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
      });
      setIsCreating(false);
      setSelectedDays([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "chavruta_requests");
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteDoc(doc(db, "chavruta_requests", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chavruta_requests/${id}`);
    }
  };

  const handleStartChat = async (req: ChavrutaRequest) => {
    // Check if chat already exists
    const existingChat = chats.find(c => c.requestId === req.id && c.participants.includes(req.userId));
    if (existingChat) {
      setActiveChat(existingChat);
      return;
    }

    try {
      const chatData = {
        participants: [user.uid, req.userId],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [req.userId]: req.userName
        },
        updatedAt: serverTimestamp(),
        requestId: req.id
      };
      const docRef = await addDoc(collection(db, "chats"), chatData);
      setActiveChat({ id: docRef.id, ...chatData } as Chat);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "chats");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${activeChat.id}/messages`);
    }
  };

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const getPartnerName = (chat: Chat) => {
    const partnerId = chat.participants.find(p => p !== user.uid);
    return partnerId ? chat.participantNames[partnerId] : "Unknown";
  };

  if (!userProfile?.gender) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
          <AlertCircle size={40} />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">
            {t("selectGender")}
          </h3>
          <p className="text-[#141414]/50 italic">
            {language === "ru" ? "Для поиска хевруты необходимо указать ваш пол в профиле." : "To find a chavruta, you must specify your gender in your profile."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {t("findChavruta")}
          </h1>
          <p className="text-[#141414]/50 italic">
            {t("chavrutaSubtitle")} ({userProfile.gender === 'male' ? t("male") : t("female")})
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 bg-[#141414] text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
        >
          <Plus size={20} />
          {t("createRequest")}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* My Requests */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserIcon size={20} className="text-[#141414]/30" />
              {t("myRequests")}
            </h2>
            <div className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="p-8 bg-white rounded-[32px] border border-dashed border-[#141414]/10 text-center">
                  <p className="text-[#141414]/40 italic text-sm">
                    {language === "ru" ? "У вас пока нет активных запросов." : "You don't have any active requests yet."}
                  </p>
                </div>
              ) : (
                myRequests.map(req => (
                  <motion.div 
                    layout
                    key={req.id}
                    className="bg-white p-6 rounded-[32px] border border-[#141414]/5 shadow-sm flex items-center justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs font-bold text-[#141414]/40 uppercase tracking-widest">
                          <Clock size={12} />
                          {req.preferredTime}
                        </div>
                        <div className="flex gap-1">
                          {req.days.map(d => (
                            <span key={d} className="text-[10px] px-2 py-0.5 bg-[#141414]/5 rounded-full font-bold uppercase">
                              {daysOfWeek.find(day => day.id === d)?.[language as 'en' | 'ru']}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{t("studyTogether")}</p>
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-tighter">
                          {req.status === 'open' ? t("searching") : req.status === 'matched' ? t("matched") : t("closed")}
                        </span>
                      </div>
                      {req.expiresAt && (
                        <p className="text-[10px] text-[#141414]/30 font-bold uppercase tracking-widest">
                          {t("activeUntil")}: {new Date(req.expiresAt.seconds * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteRequest(req.id)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Available Partners */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} className="text-[#141414]/30" />
              {t("availablePartners")}
            </h2>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="p-8 bg-white rounded-[32px] border border-dashed border-[#141414]/10 text-center">
                  <p className="text-[#141414]/40 italic text-sm">
                    {t("noRequests")}
                  </p>
                </div>
              ) : (
                requests.map(req => (
                  <motion.div 
                    layout
                    key={req.id}
                    className="bg-white p-6 rounded-[32px] border border-[#141414]/5 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#141414]/5 rounded-full flex items-center justify-center font-bold text-[#141414]/40">
                          {req.userName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold">{req.userName}</p>
                          <p className="text-[10px] text-[#141414]/40 uppercase tracking-widest font-bold">
                            {req.gender === 'male' ? t("male") : t("female")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-bold text-[#141414]/40 uppercase tracking-widest">
                          <Clock size={12} />
                          {req.preferredTime}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {req.days.map(d => (
                            <span key={d} className="text-[10px] px-2 py-0.5 bg-[#141414]/5 rounded-full font-bold uppercase">
                              {daysOfWeek.find(day => day.id === d)?.[language as 'en' | 'ru']}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleStartChat(req)}
                      className="w-full py-3 bg-[#141414]/5 text-[#141414] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/10 transition-all"
                    >
                      <MessageCircle size={18} />
                      {t("contactPartner")}
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Chats Sidebar */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle size={20} className="text-[#141414]/30" />
            {t("chats")}
          </h2>
          <div className="space-y-4">
            {chats.length === 0 ? (
              <div className="p-8 bg-white rounded-[32px] border border-dashed border-[#141414]/10 text-center">
                <p className="text-[#141414]/40 italic text-sm">
                  {t("noChats")}
                </p>
              </div>
            ) : (
              chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full p-4 rounded-3xl border transition-all text-left space-y-1 ${
                    activeChat?.id === chat.id 
                      ? "bg-[#141414] text-white border-[#141414]" 
                      : "bg-white border-[#141414]/5 hover:border-[#141414]/20"
                  }`}
                >
                  <p className="font-bold">{getPartnerName(chat)}</p>
                  {chat.lastMessage && (
                    <p className={`text-xs truncate ${activeChat?.id === chat.id ? "text-white/60" : "text-[#141414]/40"}`}>
                      {chat.lastMessage}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t("createRequest")}</h2>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-[#141414]/5 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/30 ml-2">
                    {t("preferredTime")}
                  </label>
                  <input 
                    type="time" 
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full p-4 bg-[#141414]/5 rounded-2xl font-bold focus:outline-none focus:ring-2 ring-[#141414]/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-[#141414]/30 ml-2">
                    {t("preferredDays")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {daysOfWeek.map(day => (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`p-3 rounded-xl font-bold text-xs transition-all ${
                          selectedDays.includes(day.id)
                            ? "bg-[#141414] text-white"
                            : "bg-[#141414]/5 text-[#141414]/40 hover:bg-[#141414]/10"
                        }`}
                      >
                        {day[language as 'en' | 'ru']}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleCreateRequest}
                  className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold shadow-lg hover:bg-opacity-90 transition-all"
                >
                  {t("createRequest")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window Modal */}
      <AnimatePresence>
        {activeChat && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChat(null)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg h-[80vh] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-[#141414]/5 rounded-full md:hidden">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="w-10 h-10 bg-[#141414] text-white rounded-full flex items-center justify-center font-bold">
                    {getPartnerName(activeChat)[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold">{getPartnerName(activeChat)}</h3>
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">{t("searching")}</p>
                  </div>
                </div>
                <button onClick={() => setActiveChat(null)} className="p-2 hover:bg-[#141414]/5 rounded-full">
                  <X size={24} />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F5F5F0]/30">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.senderId === user.uid ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-3xl text-sm ${
                      msg.senderId === user.uid 
                        ? "bg-[#141414] text-white rounded-tr-none" 
                        : "bg-white border border-[#141414]/5 rounded-tl-none shadow-sm"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[8px] mt-1 font-bold uppercase tracking-tighter ${msg.senderId === user.uid ? "text-white/40" : "text-[#141414]/30"}`}>
                        {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-[#141414]/5 flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("typeMessage")}
                  className="flex-1 p-4 bg-[#141414]/5 rounded-2xl font-medium focus:outline-none focus:ring-2 ring-[#141414]/10"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-4 bg-[#141414] text-white rounded-2xl shadow-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
