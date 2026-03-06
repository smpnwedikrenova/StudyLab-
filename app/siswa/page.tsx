"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, Play, Trophy, Star, Zap, History, Users, Diamond, ShoppingBag } from "lucide-react";
import { collection, query, orderBy, getDocs, doc, updateDoc, limit, getCountFromServer, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StudentOnboardingModal from "@/components/StudentOnboardingModal";
import Avatar from "@/components/Avatar";
import { motion } from "motion/react";
import Shop from "@/components/Shop";

export default function SiswaDashboard() {
  const { userData, logout } = useAuth();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [rank, setRank] = useState<number | string>("-");
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"join" | "history" | "leaderboard" | "shop">("join");

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.uid) return;
      try {
        // 1. Fetch Global Leaderboard (Top 10 Siswa who have earned XP)
        const qLeaderboard = query(
          collection(db, "users"), 
          where("role", "==", "Siswa"),
          where("xp", ">", 0),
          orderBy("xp", "desc"), 
          limit(10)
        );
        const snapshotLeaderboard = await getDocs(qLeaderboard);
        const users = snapshotLeaderboard.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGlobalLeaderboard(users);

        // 2. Calculate Actual Global Rank (Siswa only)
        if (userData.xp === undefined || userData.xp === null) {
          setRank("-");
        } else {
          const qRank = query(
            collection(db, "users"), 
            where("role", "==", "Siswa"),
            where("xp", ">", userData.xp)
          );
          const rankSnapshot = await getCountFromServer(qRank);
          const actualRank = rankSnapshot.data().count + 1;
          setRank(`#${actualRank}`);
        }

        // 3. Fetch Quiz History
        const qHistory = query(collection(db, "users", userData.uid, "history"), orderBy("completedAt", "desc"), limit(10));
        const snapshotHistory = await getDocs(qHistory);
        const historyData = snapshotHistory.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuizHistory(historyData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [userData?.uid, userData?.xp, userData?.quizzesPlayed]);

  const xp = userData?.xp || 0;
  const quizzesPlayed = userData?.quizzesPlayed || 0;
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100);
  const progress = (xp % 100);

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      router.push(`/room/siswa/${roomCode}`);
    }
  };

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center">
      <StudentOnboardingModal />
      <div className="w-full max-w-md md:max-w-2xl px-4 py-6 md:py-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-[32px] shadow-sm gap-4 border border-brand-navy/5">
          <div className="flex items-center gap-4">
            <Avatar avatarString={userData.avatar} size="lg" className="border-4 border-white shadow-xl" />
            <div>
              <h1 className="text-xl font-black text-brand-navy tracking-tight">{userData.displayName}</h1>
              <p className="text-brand-navy/60 text-xs font-bold uppercase tracking-wider">
                Level {level} • {userData.studentClass || "Siswa"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="flex-1 md:w-48">
              <div className="flex justify-between text-[10px] font-black text-brand-navy/40 mb-1 uppercase tracking-widest">
                <span>XP: {xp}</span>
                <span>Next: {xpToNextLevel}</span>
              </div>
              <div className="h-2 bg-brand-cream rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-orange transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button onClick={logout} className="p-2 text-brand-navy/40 hover:text-brand-orange transition-colors">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-brand-navy/5 flex flex-col items-center text-center">
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl mb-2">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-1">Rank</div>
            <div className="text-lg font-black text-brand-navy">{rank}</div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-brand-navy/5 flex flex-col items-center text-center">
            <div className="p-2 bg-brand-navy/10 text-brand-navy rounded-xl mb-2">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-1">XP</div>
            <div className="text-lg font-black text-brand-navy">{xp}</div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-brand-navy/5 flex flex-col items-center text-center">
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl mb-2">
              <Star className="w-5 h-5" />
            </div>
            <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-1">Quiz</div>
            <div className="text-lg font-black text-brand-navy">{quizzesPlayed}</div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-brand-navy/5 flex flex-col items-center text-center">
            <div className="p-2 bg-sky-100 text-sky-500 rounded-xl mb-2">
              <Diamond className="w-5 h-5 fill-current" />
            </div>
            <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-1">Diamond</div>
            <div className="text-lg font-black text-brand-navy">{userData.diamonds || 0}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setActiveTab("join")}
            className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "join" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
          >
            Gabung
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
          >
            Riwayat
          </button>
          <button 
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "leaderboard" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
          >
            Global
          </button>
          <button 
            onClick={() => setActiveTab("shop")}
            className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "shop" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
          >
            Toko
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          {activeTab === "join" && (
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full text-center border border-brand-navy/5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-brand-navy text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-navy/20 rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                <Play className="w-10 h-10 ml-1" />
              </div>
              <h2 className="text-2xl font-black text-brand-navy mb-2 tracking-tight">Gabung Kuis</h2>
              <p className="text-brand-navy/60 text-sm mb-8 leading-relaxed font-medium">Masukkan 6 digit kode ruangan yang diberikan oleh guru Anda untuk memulai petualangan!</p>
              
              <form onSubmit={joinRoom} className="space-y-6">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="000000"
                  className="w-full text-center text-4xl md:text-5xl font-mono tracking-[0.4em] p-5 md:p-6 bg-brand-cream/50 border-2 border-transparent rounded-3xl focus:border-brand-orange focus:bg-white focus:ring-8 focus:ring-brand-orange/5 outline-none transition-all uppercase placeholder:text-brand-navy/20 text-brand-navy"
                />
                <button
                  type="submit"
                  disabled={roomCode.length !== 6}
                  className="w-full bg-brand-navy text-white font-black text-lg py-5 rounded-3xl hover:bg-brand-black hover:shadow-xl hover:shadow-brand-navy/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  Masuk Ruangan
                </button>
              </form>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-6 h-6 text-brand-orange" />
                <h2 className="text-xl font-black text-brand-navy tracking-tight">Riwayat Kuis</h2>
              </div>
              
              {quizHistory.length === 0 ? (
                <div className="text-center py-12 bg-brand-cream/30 rounded-3xl border-2 border-dashed border-brand-navy/5">
                  <p className="text-brand-navy/40 font-bold text-sm">Belum ada riwayat kuis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizHistory.map((item) => (
                    <div key={item.id} className="p-4 bg-brand-cream/50 rounded-2xl border border-transparent hover:border-brand-orange/20 transition-all flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-brand-navy text-sm mb-1">{item.quizTitle}</h3>
                        <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest">
                          {item.completedAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • Room: {item.roomCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-brand-orange">+{item.score}</div>
                        <div className="text-[8px] text-brand-navy/40 font-black uppercase tracking-widest">XP</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "shop" && (
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Shop />
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-brand-orange" />
                <h2 className="text-xl font-black text-brand-navy tracking-tight">Peringkat Global</h2>
              </div>

              {/* Podium Section */}
              {globalLeaderboard.length > 0 && (
                <div className="flex items-end justify-center gap-2 mb-10 mt-4 h-48">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center flex-1 max-w-[100px]">
                    {globalLeaderboard[1] ? (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col items-center"
                      >
                        <Avatar avatarString={globalLeaderboard[1].avatar} size="md" className="mb-2 border-2 border-slate-300" />
                        <div className="text-[10px] font-black text-brand-navy truncate w-full text-center mb-1">{globalLeaderboard[1].displayName}</div>
                        <div className="w-full bg-slate-300 h-20 rounded-t-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-black text-white">2</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full bg-brand-cream/50 h-16 rounded-t-2xl border-x border-t border-brand-navy/5" />
                    )}
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center flex-1 max-w-[120px]">
                    {globalLeaderboard[0] ? (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <Trophy className="w-6 h-6 text-yellow-400 mb-1 animate-bounce" />
                        <Avatar avatarString={globalLeaderboard[0].avatar} size="lg" className="mb-2 border-4 border-yellow-400 shadow-xl" />
                        <div className="text-xs font-black text-brand-navy truncate w-full text-center mb-1">{globalLeaderboard[0].displayName}</div>
                        <div className="w-full bg-yellow-400 h-32 rounded-t-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                          <span className="text-4xl font-black text-white relative z-10">1</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full bg-brand-cream/50 h-24 rounded-t-2xl border-x border-t border-brand-navy/5" />
                    )}
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center flex-1 max-w-[100px]">
                    {globalLeaderboard[2] ? (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center"
                      >
                        <Avatar avatarString={globalLeaderboard[2].avatar} size="md" className="mb-2 border-2 border-amber-600" />
                        <div className="text-[10px] font-black text-brand-navy truncate w-full text-center mb-1">{globalLeaderboard[2].displayName}</div>
                        <div className="w-full bg-amber-600 h-16 rounded-t-2xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-black text-white">3</span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full bg-brand-cream/50 h-12 rounded-t-2xl border-x border-t border-brand-navy/5" />
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {globalLeaderboard.length === 0 ? (
                  <div className="text-center py-12 bg-brand-cream/30 rounded-3xl border-2 border-dashed border-brand-navy/10">
                    <Trophy className="w-10 h-10 text-brand-navy/20 mx-auto mb-4" />
                    <p className="text-brand-navy/40 text-sm font-bold">Belum ada siswa yang mengerjakan kuis.</p>
                  </div>
                ) : (
                  globalLeaderboard.map((user, idx) => (
                    <div 
                      key={user.id} 
                      className={`p-4 rounded-2xl flex justify-between items-center transition-all ${user.id === userData.uid ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20 scale-[1.02]" : "bg-brand-cream/50 border border-transparent"}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-600 text-white" : "bg-brand-navy/5 text-brand-navy/40"}`}>
                          {idx + 1}
                        </span>
                        <Avatar avatarString={user.avatar} size="md" className="shadow-sm" />
                        <div>
                          <h3 className={`font-black text-sm ${user.id === userData.uid ? "text-white" : "text-brand-navy"}`}>{user.displayName}</h3>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${user.id === userData.uid ? "text-white/60" : "text-brand-navy/40"}`}>
                            {user.studentClass || "Siswa"} • Level {Math.floor((user.xp || 0) / 100) + 1}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-black ${user.id === userData.uid ? "text-white" : "text-brand-navy"}`}>{user.xp || 0}</div>
                        <div className={`text-[8px] font-black uppercase tracking-widest ${user.id === userData.uid ? "text-white/40" : "text-brand-navy/40"}`}>Total XP</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
