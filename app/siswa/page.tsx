"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, Play, Trophy, Star, Zap, RefreshCcw, History, Users, Diamond, ShoppingBag, Home, FileText, BookOpen, X, CheckCircle, Sparkles, ChevronRight, Target, Timer, Link as LinkIcon } from "lucide-react";
import { collection, query, orderBy, getDocs, doc, updateDoc, limit, getCountFromServer, where, setDoc, getDoc, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StudentOnboardingModal from "@/components/StudentOnboardingModal";
import Avatar from "@/components/Avatar";
import { motion, AnimatePresence } from "motion/react";
import Shop from "@/components/Shop";

interface Material {
  id: string;
  guruId: string;
  subject: string;
  title: string;
  description: string;
  content?: string;
  points?: string[];
  fileUrl?: string;
  fileName?: string;
  order: number;
  createdAt: any;
}

interface Assignment {
  id: string;
  guruId: string;
  subject: string;
  title: string;
  description: string;
  content: string;
  deadline?: any;
  targetClass: string;
  createdAt: any;
}

export default function SiswaDashboard() {
  const { userData, logout } = useAuth();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [rank, setRank] = useState<number | string>("-");
  const [isResetting, setIsResetting] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [useTimer, setUseTimer] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any>>({});

  const [mainTab, setMainTab] = useState<"beranda" | "kuis" | "tugas" | "materi">("beranda");
  const [berandaTab, setBerandaTab] = useState<"history" | "leaderboard" | "shop">("history");

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.uid) return;
      try {
        // 1. Fetch Global Leaderboard (All Siswa)
        // Mengambil semua siswa lalu di-sort di memory untuk menghindari error missing index di Firestore
        const qLeaderboard = query(
          collection(db, "users"),
          where("role", "==", "Siswa")
        );
        const snapshotLeaderboard = await getDocs(qLeaderboard);
        let users = snapshotLeaderboard.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Urutkan berdasarkan XP tertinggi
        users.sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));

        // Ambil top 20 untuk ditampilkan di leaderboard yang memiliki XP > 0
        const topUsers = users.filter((u: any) => (u.xp || 0) > 0).slice(0, 20);
        setGlobalLeaderboard(topUsers);

        // 2. Calculate Actual Global Rank
        if (!userData.xp || userData.xp === 0) {
          setRank("-");
        } else {
          const userIndex = users.findIndex((u) => u.id === userData.uid);
          setRank(userIndex !== -1 ? `#${userIndex + 1}` : "-");
        }

        // 3. Fetch Quiz History
        const qHistory = query(
          collection(db, "users", userData.uid, "history"),
          orderBy("completedAt", "desc"),
          limit(10),
        );
        const snapshotHistory = await getDocs(qHistory);
        const historyData = snapshotHistory.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuizHistory(historyData);
        
        // 4. Fetch Materials
        const qMaterials = query(
          collection(db, "materials"),
          orderBy("order", "asc"),
        );
        const snapshotMaterials = await getDocs(qMaterials);
        const materialsData = snapshotMaterials.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Material,
        );
        setMaterials(materialsData);

        // 5. Fetch Assignments
        if (userData.studentClass) {
          const qAssignments = query(
            collection(db, "assignments"),
            where("targetClass", "in", ["Semua Kelas", userData.studentClass]),
            orderBy("createdAt", "desc"),
          );
          const snapshotAssignments = await getDocs(qAssignments);
          const assignmentsData = snapshotAssignments.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Assignment,
          );
          setAssignments(assignmentsData);

          // 6. Fetch User Submissions
          const submissions: Record<string, any> = {};
          for (const asg of assignmentsData) {
            const subRef = doc(
              db,
              "assignments",
              asg.id,
              "submissions",
              userData.uid,
            );
            const subSnap = await getDoc(subRef);
            if (subSnap.exists()) {
              submissions[asg.id] = subSnap.data();
            }
          }
          setUserSubmissions(submissions);
        }

        // Fetch Quizzes (Available for all students)
        const qQuizzes = query(
          collection(db, "quizzes"),
          orderBy("createdAt", "desc"),
        );
        const snapshotQuizzes = await getDocs(qQuizzes);
        const quizzesData = snapshotQuizzes.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() })
        );
        setAvailableQuizzes(quizzesData);

        // Listen for active multiplayer rooms
        const qRooms = query(
          collection(db, "rooms"),
          where("status", "==", "waiting"),
          where("mode", "==", "multiplayer")
        );
        const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
          const roomsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          // Filter out rooms that are not for this student's class (if restricted)
          const filteredRooms = roomsData.filter((room: any) => {
            return room.targetClass === "Semua Kelas" || room.targetClass === userData?.studentClass;
          });
          setActiveRooms(filteredRooms);
        });

        return () => {
          unsubscribeRooms();
        };
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    const cleanup = fetchData();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [
    userData?.uid,
    userData?.xp,
    userData?.quizzesPlayed,
    userData?.studentClass,
  ]);

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

  const createRoomWithFriends = async (quizId: string, quizTitle: string) => {
    if (!userData?.uid) return;
    try {
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
      await addDoc(collection(db, "rooms"), {
        roomCode,
        quizId,
        quizTitle,
        hostId: userData.uid,
        status: "waiting",
        mode: "multiplayer",
        targetClass: userData.studentClass || "Semua Kelas",
        useTimer: useTimer,
        createdAt: new Date(),
      });
      router.push(`/room/siswa/${roomCode}`);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Gagal membuat ruangan. Pastikan koneksi internet stabil.");
    }
  };

  const createAiRoom = async (quizId: string, quizTitle: string) => {
    if (!userData?.uid) return;
    try {
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const roomRef = await addDoc(collection(db, "rooms"), {
        roomCode,
        quizId,
        quizTitle,
        hostId: userData.uid,
        status: "playing",
        mode: "ai",
        targetClass: userData.studentClass || "Semua Kelas",
        useTimer: useTimer,
        createdAt: new Date(),
      });
      
      // Add AI bot to leaderboard
      await setDoc(doc(db, "rooms", roomRef.id, "leaderboard", "ai_bot"), {
        siswaName: "🤖 AI Bot",
        avatar: "bot",
        score: 0,
        status: "playing",
        joinedAt: new Date(),
      });

      router.push(`/room/siswa/${roomCode}`);
    } catch (error) {
      console.error("Error creating AI room:", error);
      alert("Gagal membuat ruangan AI. Pastikan koneksi internet stabil.");
    }
  };

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center pb-24">
      <StudentOnboardingModal />
      <div className="w-full max-w-md md:max-w-2xl px-4 py-6 md:py-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-[32px] shadow-sm gap-4 border border-brand-navy/5">
          <div className="flex items-center gap-4">
            <Avatar
              avatarString={userData.avatar}
              size="lg"
              className="border-4 border-white shadow-xl"
            />
            <div>
              <h1 className="text-xl font-black text-brand-navy tracking-tight">
                {userData.displayName}
              </h1>
              <p className="text-brand-navy/60 text-xs font-bold uppercase tracking-wider">
                Level {level} • {userData.studentClass || "Siswa"}{" "}
                {userData.studentAbsen
                  ? `• No Absen ${userData.studentAbsen}`
                  : ""}
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
            <button
              onClick={logout}
              className="p-2 text-brand-navy/40 hover:text-brand-orange transition-colors"
              title="Keluar"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </header>

        {mainTab === "beranda" && (
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar snap-x">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-brand-navy/5 flex items-center gap-3 min-w-[140px] snap-start group hover:border-brand-orange transition-all">
              <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl group-hover:scale-110 transition-transform">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-0.5">
                  Peringkat
                </div>
                <div className="text-base font-black text-brand-navy leading-none">{rank}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-brand-navy/5 flex items-center gap-3 min-w-[140px] snap-start group hover:border-brand-orange transition-all">
              <div className="p-2 bg-brand-navy/10 text-brand-navy rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-0.5">
                  Total XP
                </div>
                <div className="text-base font-black text-brand-navy leading-none">{xp}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-brand-navy/5 flex items-center gap-3 min-w-[140px] snap-start group hover:border-brand-orange transition-all">
              <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl group-hover:scale-110 transition-transform">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-0.5">
                  Quiz
                </div>
                <div className="text-base font-black text-brand-navy leading-none">{quizzesPlayed}</div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-brand-navy/5 flex items-center gap-3 min-w-[140px] snap-start group hover:border-brand-orange transition-all">
              <div className="p-2 bg-sky-100 text-sky-500 rounded-xl group-hover:scale-110 transition-transform">
                <Diamond className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-0.5">
                  Diamond
                </div>
                <div className="text-base font-black text-brand-navy leading-none">{userData.diamonds || 0}</div>
              </div>
            </div>
          </div>
        )}

        {mainTab === "beranda" && (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setBerandaTab("history")}
                className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${berandaTab === "history" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
              >
                Riwayat
              </button>
              <button
                onClick={() => setBerandaTab("leaderboard")}
                className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${berandaTab === "leaderboard" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
              >
                Global
              </button>
              <button
                onClick={() => setBerandaTab("shop")}
                className={`flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${berandaTab === "shop" ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20" : "bg-white text-brand-navy/40 hover:bg-brand-navy/5"}`}
              >
                Toko
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              {berandaTab === "history" && (
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="w-6 h-6 text-brand-orange" />
                    <h2 className="text-xl font-black text-brand-navy tracking-tight">
                      Riwayat Kuis
                    </h2>
                  </div>

                  {quizHistory.length === 0 ? (
                    <div className="text-center py-12 bg-brand-cream/30 rounded-3xl border-2 border-dashed border-brand-navy/5">
                      <p className="text-brand-navy/40 font-bold text-sm">
                        Belum ada riwayat kuis.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizHistory.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setViewingHistory(item)}
                          className="w-full p-4 bg-brand-cream/50 rounded-2xl border border-transparent hover:border-brand-orange/20 hover:bg-white transition-all flex justify-between items-center group text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-orange shadow-sm group-hover:scale-110 transition-transform">
                              <History className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-black text-brand-navy text-sm mb-1">
                                {item.quizTitle}
                              </h3>
                              <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest">
                                {item.completedAt
                                  ?.toDate()
                                  .toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                • Room: {item.roomCode}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-black text-brand-orange">
                                +{item.score}
                              </div>
                              <div className="text-[8px] text-brand-navy/40 font-black uppercase tracking-widest">
                                XP
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-brand-navy/20 group-hover:text-brand-orange transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {berandaTab === "shop" && (
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <Shop />
                </div>
              )}

              {berandaTab === "leaderboard" && (
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full border border-brand-navy/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-brand-orange" />
                      <h2 className="text-xl font-black text-brand-navy tracking-tight">
                        Peringkat Global
                      </h2>
                    </div>
                    <div className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">
                      Peringkatmu:{" "}
                      <span className="text-brand-orange">{rank}</span>
                    </div>
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
                            <Avatar
                              avatarString={globalLeaderboard[1].avatar}
                              size="md"
                              className="mb-2 border-2 border-slate-300"
                            />
                            <div className="text-[10px] font-black text-brand-navy truncate w-full text-center mb-1">
                              {globalLeaderboard[1].displayName}
                            </div>
                            <div className="w-full bg-slate-300 h-20 rounded-t-2xl flex items-center justify-center shadow-lg">
                              <span className="text-2xl font-black text-white">
                                2
                              </span>
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
                            <Avatar
                              avatarString={globalLeaderboard[0].avatar}
                              size="lg"
                              className="mb-2 border-4 border-yellow-400 shadow-xl"
                            />
                            <div className="text-xs font-black text-brand-navy truncate w-full text-center mb-1">
                              {globalLeaderboard[0].displayName}
                            </div>
                            <div className="w-full bg-yellow-400 h-32 rounded-t-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                              <span className="text-4xl font-black text-white relative z-10">
                                1
                              </span>
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
                            <Avatar
                              avatarString={globalLeaderboard[2].avatar}
                              size="md"
                              className="mb-2 border-2 border-amber-600"
                            />
                            <div className="text-[10px] font-black text-brand-navy truncate w-full text-center mb-1">
                              {globalLeaderboard[2].displayName}
                            </div>
                            <div className="w-full bg-amber-600 h-16 rounded-t-2xl flex items-center justify-center shadow-lg">
                              <span className="text-2xl font-black text-white">
                                3
                              </span>
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
                        <p className="text-brand-navy/40 text-sm font-bold">
                          Belum ada siswa yang mengerjakan kuis.
                        </p>
                      </div>
                    ) : (
                      globalLeaderboard.map((user, idx) => (
                        <div
                          key={user.id}
                          className={`p-4 rounded-2xl flex justify-between items-center transition-all ${user.id === userData.uid ? "bg-brand-navy text-white shadow-lg shadow-brand-navy/20 scale-[1.02]" : "bg-brand-cream/50 border border-transparent"}`}
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-xs ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-600 text-white" : "bg-brand-navy/5 text-brand-navy/40"}`}
                            >
                              {idx + 1}
                            </span>
                            <Avatar
                              avatarString={user.avatar}
                              size="md"
                              className="shadow-sm"
                            />
                            <div>
                              <h3
                                className={`font-black text-sm ${user.id === userData.uid ? "text-white" : "text-brand-navy"}`}
                              >
                                {user.displayName}
                              </h3>
                              <p
                                className={`text-[10px] font-black uppercase tracking-widest ${user.id === userData.uid ? "text-white/60" : "text-brand-navy/40"}`}
                              >
                                {user.studentClass || "Siswa"} • Level{" "}
                                {Math.floor((user.xp || 0) / 100) + 1}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-lg font-black ${user.id === userData.uid ? "text-white" : "text-brand-navy"}`}
                            >
                              {user.xp || 0}
                            </div>
                            <div
                              className={`text-[8px] font-black uppercase tracking-widest ${user.id === userData.uid ? "text-white/40" : "text-brand-navy/40"}`}
                            >
                              Total XP
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {mainTab === "kuis" && (
          <div className="flex flex-col items-center justify-center py-4 space-y-6">
            <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-xl shadow-brand-navy/5 w-full text-center border border-brand-navy/5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-brand-navy text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-navy/20 rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                <Play className="w-10 h-10 ml-1" />
              </div>
              <h2 className="text-2xl font-black text-brand-navy mb-2 tracking-tight">
                Gabung Kuis
              </h2>
              <p className="text-brand-navy/60 text-sm mb-8 leading-relaxed font-medium">
                Masukkan 6 digit kode ruangan yang diberikan oleh guru atau teman Anda
                untuk memulai petualangan!
              </p>

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

            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
              {activeRooms.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-6 px-2">
                    <Users className="w-6 h-6 text-brand-orange" />
                    <h2 className="text-xl font-black text-brand-navy tracking-tight">
                      Ruangan Mabar Tersedia
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {activeRooms.map((room) => (
                      <div key={room.id} className="bg-brand-cream/30 p-6 rounded-[32px] shadow-sm border border-brand-orange/20 flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                          Mabar
                        </div>
                        <div>
                          <h3 className="font-black text-brand-navy text-lg mb-1">{room.quizTitle}</h3>
                          <p className="text-xs text-brand-navy/60 font-medium">Kode Ruangan: <span className="font-mono font-bold text-brand-orange">{room.roomCode}</span></p>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => router.push(`/room/siswa/${room.roomCode}`)}
                            className="flex-1 bg-brand-orange text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4" /> Gabung Mabar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-brand-orange" />
                  <h2 className="text-xl font-black text-brand-navy tracking-tight">
                    Kuis Tersedia
                  </h2>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-brand-navy/5 shadow-sm">
                  <Timer className="w-4 h-4 text-brand-navy/60" />
                  <span className="text-sm font-bold text-brand-navy">Gunakan Timer</span>
                  <button
                    onClick={() => setUseTimer(!useTimer)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useTimer ? "bg-brand-orange" : "bg-brand-navy/20"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useTimer ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {availableQuizzes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[40px] shadow-sm border border-brand-navy/5">
                  <p className="text-brand-navy/40 font-bold text-sm">
                    Belum ada kuis yang tersedia.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {availableQuizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-brand-navy/5 flex flex-col gap-4">
                      <div>
                        <h3 className="font-black text-brand-navy text-lg mb-1">{quiz.title}</h3>
                        <p className="text-xs text-brand-navy/60 font-medium">{quiz.description || "Tidak ada deskripsi"}</p>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => createRoomWithFriends(quiz.id, quiz.title)}
                          className="flex-1 bg-brand-cream text-brand-navy py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-navy/5 transition-colors flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4" /> Mabar
                        </button>
                        <button
                          onClick={() => createAiRoom(quiz.id, quiz.title)}
                          className="flex-1 bg-brand-orange text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Target className="w-4 h-4" /> Lawan AI
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mainTab === "tugas" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy flex items-center gap-3 tracking-tight">
                  <FileText className="w-6 h-6 md:w-7 md:h-7 text-brand-orange" />
                  Tugas Saya
                </h2>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-brand-cream/30 rounded-[32px] border-2 border-dashed border-brand-navy/10">
                  <FileText className="w-10 h-10 md:w-12 md:h-12 text-brand-navy/20 mx-auto mb-4" />
                  <p className="text-brand-navy/40 text-sm font-bold">
                    Belum ada tugas untuk kelas kamu.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((asg) => (
                    <button
                      key={asg.id}
                      onClick={() => setViewingAssignment(asg)}
                      className="w-full p-6 bg-white border-2 border-brand-navy/5 rounded-3xl hover:border-brand-orange hover:shadow-xl hover:shadow-brand-orange/5 transition-all text-left group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-1 bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest rounded-md">
                          {asg.subject}
                        </span>
                        {asg.deadline && (
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                            Deadline:{" "}
                            {asg.deadline.toDate().toLocaleDateString("id-ID")}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-brand-navy text-lg mb-1 group-hover:text-brand-orange transition-colors">
                        {asg.title}
                      </h3>
                      <p className="text-xs text-brand-navy/40 font-medium line-clamp-2">
                        {asg.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {mainTab === "materi" && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy flex items-center gap-3 tracking-tight">
                  <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-brand-orange" />
                  Materi Pembelajaran
                </h2>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-brand-cream/30 rounded-[32px] border-2 border-dashed border-brand-navy/10">
                  <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-brand-navy/20 mx-auto mb-4" />
                  <p className="text-brand-navy/40 text-sm font-bold">
                    Belum ada materi yang tersedia.
                  </p>
                </div>
              ) : (
                <div className="relative py-10">
                  {/* Duolingo-like path line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-3 bg-brand-cream -translate-x-1/2 rounded-full hidden md:block" />

                  <div className="space-y-12 relative z-10">
                    {materials.map((mat, idx) => {
                      // Zig-zag logic
                      const positions = [
                        "md:-translate-x-24",
                        "md:translate-x-24",
                        "md:translate-x-0",
                      ];
                      const posClass = positions[idx % 3];

                      return (
                        <div
                          key={mat.id}
                          className={`flex flex-col items-center transition-all ${posClass}`}
                        >
                          <div className="relative group">
                            <button
                              onClick={() => setViewingMaterial(mat)}
                              className="w-20 h-20 md:w-24 md:h-24 rounded-[32px] bg-white border-4 border-brand-cream flex items-center justify-center shadow-xl hover:scale-110 hover:border-brand-orange transition-all relative z-20 group"
                            >
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-brand-navy flex items-center justify-center text-white font-black text-xl md:text-2xl group-hover:bg-brand-orange transition-colors">
                                {idx + 1}
                              </div>

                              {/* Tooltip-like label */}
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-brand-navy text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                {mat.title}
                              </div>
                            </button>

                            {mat.fileUrl && (
                              <a
                                href={mat.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 bg-white text-brand-navy rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-orange"
                                title="Buka File Eksternal"
                              >
                                <LinkIcon className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          <div className="mt-4 text-center max-w-[200px]">
                            <h3 className="font-black text-brand-navy text-sm mb-1 truncate">
                              {mat.title}
                            </h3>
                            <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">
                              {mat.subject}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* View Assignment Modal */}
      <AnimatePresence>
        {viewingAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 md:p-8 border-b border-brand-navy/5 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="px-2 py-1 bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest rounded-md">
                      {viewingAssignment.subject}
                    </span>
                    {viewingAssignment.deadline && (
                      <span className="px-2 py-1 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-md">
                        Deadline:{" "}
                        {viewingAssignment.deadline
                          .toDate()
                          .toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                    {viewingAssignment.title}
                  </h2>
                </div>
                <button
                  onClick={() => setViewingAssignment(null)}
                  className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center text-brand-navy/40 hover:text-brand-navy transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div
                  className="prose prose-sm md:prose-base max-w-none text-brand-navy/80 mb-8"
                  dangerouslySetInnerHTML={{
                    __html: viewingAssignment.content,
                  }}
                />

                <div className="mt-8 pt-8 border-t border-brand-navy/5">
                  <h3 className="text-lg font-black text-brand-navy mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-brand-orange" />
                    Pengumpulan Tugas
                  </h3>

                  {userSubmissions[viewingAssignment.id] ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Sudah Dikumpulkan
                      </div>
                      <p className="text-sm text-emerald-800 font-medium mb-4">
                        {userSubmissions[viewingAssignment.id].content}
                      </p>
                      <div className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest">
                        Dikumpulkan pada:{" "}
                        {userSubmissions[viewingAssignment.id].submittedAt
                          ?.toDate()
                          .toLocaleString("id-ID")}
                      </div>
                      {userSubmissions[viewingAssignment.id].grade !==
                        undefined && (
                        <div className="mt-4 pt-4 border-t border-emerald-100">
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                            Nilai:
                          </div>
                          <div className="text-3xl font-black text-emerald-700">
                            {userSubmissions[viewingAssignment.id].grade}
                          </div>
                          {userSubmissions[viewingAssignment.id].feedback && (
                            <div className="mt-2 text-xs text-emerald-800 italic">
                              &quot;
                              {userSubmissions[viewingAssignment.id].feedback}
                              &quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        placeholder="Tuliskan jawaban atau link tugas kamu di sini..."
                        className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none font-medium text-brand-navy transition-all min-h-[150px]"
                      />
                      <button
                        onClick={async () => {
                          if (!submissionContent.trim() || isSubmitting) return;
                          setIsSubmitting(true);
                          try {
                            const subRef = doc(
                              db,
                              "assignments",
                              viewingAssignment.id,
                              "submissions",
                              userData.uid,
                            );
                            const submissionData = {
                              studentId: userData.uid,
                              studentName: userData.displayName,
                              studentClass: userData.studentClass,
                              content: submissionContent,
                              submittedAt: new Date(),
                              status: "submitted",
                            };
                            await setDoc(subRef, submissionData);
                            setUserSubmissions((prev) => ({
                              ...prev,
                              [viewingAssignment.id]: submissionData,
                            }));
                            setSubmissionContent("");
                            alert("Tugas berhasil dikumpulkan!");
                          } catch (err) {
                            console.error(err);
                            alert("Gagal mengumpulkan tugas.");
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={!submissionContent.trim() || isSubmitting}
                        className="w-full bg-brand-orange text-white font-black py-4 rounded-2xl hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20 disabled:opacity-50"
                      >
                        {isSubmitting ? "Mengirim..." : "Kumpulkan Tugas"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Review Modal */}
      <AnimatePresence>
        {viewingHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 md:p-8 border-b border-brand-navy/5 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                    Tinjauan Kuis
                  </h2>
                  <p className="text-xs text-brand-navy/40 font-black uppercase tracking-widest mt-1">
                    {viewingHistory.quizTitle}
                  </p>
                </div>
                <button
                  onClick={() => setViewingHistory(null)}
                  className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center text-brand-navy/40 hover:text-brand-navy transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {!viewingHistory.questions ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-brand-navy/10 mx-auto mb-4" />
                    <p className="text-brand-navy/40 font-bold">
                      Maaf, data pertanyaan untuk kuis ini tidak tersedia.
                    </p>
                    <p className="text-[10px] text-brand-navy/20 uppercase tracking-widest mt-2">
                      Hanya kuis yang diselesaikan setelah pembaruan ini yang
                      dapat ditinjau.
                    </p>
                  </div>
                ) : (
                  viewingHistory.questions.map((q: any, idx: number) => {
                    const studentAnswer = viewingHistory.answers?.[String(idx)];
                    const isCorrect = studentAnswer === q.correctAnswerIndex;

                    return (
                      <div
                        key={idx}
                        className="p-6 bg-brand-cream/30 rounded-3xl border border-brand-navy/5 space-y-4"
                      >
                        <div className="flex gap-4">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
                          >
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-brand-navy text-lg leading-tight">
                            {q.question}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-2 pl-12">
                          {q.options.map((opt: string, oIdx: number) => {
                            const isStudentChoice = studentAnswer === oIdx;
                            const isCorrectChoice =
                              oIdx === q.correctAnswerIndex;

                            let borderClass = "border-brand-navy/5";
                            let bgClass = "bg-white";
                            let textClass = "text-brand-navy/60";

                            if (isCorrectChoice) {
                              borderClass = "border-emerald-500";
                              bgClass = "bg-emerald-50";
                              textClass = "text-emerald-700";
                            } else if (isStudentChoice && !isCorrectChoice) {
                              borderClass = "border-red-500";
                              bgClass = "bg-red-50";
                              textClass = "text-red-700";
                            }

                            return (
                              <div
                                key={oIdx}
                                className={`p-3 rounded-xl text-sm font-medium border flex items-center justify-between ${borderClass} ${bgClass} ${textClass}`}
                              >
                                <div className="flex items-center flex-1 break-words pr-2">
                                  <span className="font-black mr-2 opacity-40 flex-shrink-0">
                                    {String.fromCharCode(65 + oIdx)}.
                                  </span>
                                  <span>{opt}</span>
                                </div>
                                {isCorrectChoice && (
                                  <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                    Benar
                                  </span>
                                )}
                                {isStudentChoice && !isCorrectChoice && (
                                  <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-1.5 py-0.5 rounded">
                                    Pilihanmu
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 md:p-8 bg-brand-cream/30 border-t border-brand-navy/5">
                <button
                  onClick={() => setViewingHistory(null)}
                  className="w-full bg-brand-navy text-white font-black py-4 rounded-2xl hover:bg-brand-black transition-all shadow-lg shadow-brand-navy/20"
                >
                  Tutup Tinjauan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Material Modal */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-brand-navy/5 flex justify-between items-center bg-brand-cream/30">
              <div>
                <span className="inline-block px-2 py-1 bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest rounded-md mb-2">
                  {viewingMaterial.subject}
                </span>
                <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">
                  {viewingMaterial.title}
                </h2>
              </div>
              <button
                onClick={() => setViewingMaterial(null)}
                className="p-2 hover:bg-brand-navy/5 rounded-full transition-colors text-brand-navy/40 hover:text-brand-navy"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {viewingMaterial.points && viewingMaterial.points.length > 0 ? (
                <div className="space-y-8 relative py-4">
                  <div className="absolute left-6 top-0 bottom-0 w-1 bg-brand-cream rounded-full" />
                  {viewingMaterial.points.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex gap-6 relative z-10 animate-in slide-in-from-left duration-500"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-brand-navy text-white flex items-center justify-center font-black text-lg shadow-lg shadow-brand-navy/20 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 p-6 bg-brand-cream/30 rounded-3xl border border-brand-navy/5 font-medium text-brand-navy leading-relaxed">
                        {point}
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewingMaterial.content ? (
                <div
                  className="prose prose-sm md:prose-base max-w-none text-brand-navy/80"
                  dangerouslySetInnerHTML={{ __html: viewingMaterial.content }}
                />
              ) : viewingMaterial.fileUrl ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-16 h-16 text-brand-orange mb-4" />
                  <p className="text-brand-navy font-bold mb-6">
                    Materi ini berupa file dokumen.
                  </p>
                  <a
                    href={viewingMaterial.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-brand-navy text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-brand-black transition-colors"
                  >
                    Buka File {viewingMaterial.fileName}
                  </a>
                </div>
              ) : (
                <p className="text-center text-brand-navy/40">
                  Konten tidak tersedia.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-navy/10 flex justify-around items-center p-4 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl">
        <button
          onClick={() => setMainTab("beranda")}
          className={`flex flex-col items-center gap-1 transition-colors ${mainTab === "beranda" ? "text-brand-orange" : "text-brand-navy/40 hover:text-brand-navy/60"}`}
        >
          <Home
            className={`w-6 h-6 ${mainTab === "beranda" ? "fill-current" : ""}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Beranda
          </span>
        </button>
        <button
          onClick={() => setMainTab("kuis")}
          className={`flex flex-col items-center gap-1 transition-colors ${mainTab === "kuis" ? "text-brand-orange" : "text-brand-navy/40 hover:text-brand-navy/60"}`}
        >
          <Play
            className={`w-6 h-6 ${mainTab === "kuis" ? "fill-current" : ""}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Kuis
          </span>
        </button>
        <button
          onClick={() => setMainTab("tugas")}
          className={`flex flex-col items-center gap-1 transition-colors ${mainTab === "tugas" ? "text-brand-orange" : "text-brand-navy/40 hover:text-brand-navy/60"}`}
        >
          <FileText
            className={`w-6 h-6 ${mainTab === "tugas" ? "fill-current" : ""}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Tugas
          </span>
        </button>
        <button
          onClick={() => setMainTab("materi")}
          className={`flex flex-col items-center gap-1 transition-colors ${mainTab === "materi" ? "text-brand-orange" : "text-brand-navy/40 hover:text-brand-navy/60"}`}
        >
          <BookOpen
            className={`w-6 h-6 ${mainTab === "materi" ? "fill-current" : ""}`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Materi
          </span>
        </button>
      </nav>
    </div>
  );
}
