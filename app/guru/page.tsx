"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Play, History, LogOut, Sparkles, BookOpen, Trash2, X, Eye, Trophy, Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { GoogleGenAI, Type } from "@google/genai";
import Avatar from "@/components/Avatar";

interface Quiz {
  id: string;
  title: string;
  subject: string;
  questions: any[];
  quizType?: string;
  hiddenWord?: string;
}

interface Room {
  id: string;
  roomCode: string;
  quizId: string;
  status: string;
  createdAt: any;
}

export default function GuruDashboard() {
  const { userData, logout } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizType, setQuizType] = useState<"multiple_choice" | "true_false" | "duck_hunt" | "hidden_word">("multiple_choice");
  const [viewingQuiz, setViewingQuiz] = useState<Quiz | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [isViewingLeaderboard, setIsViewingLeaderboard] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState("");
  const [fullLeaderboard, setFullLeaderboard] = useState<any[]>([]);
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);

  const fetchQuizzes = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      const q = query(collection(db, "quizzes"), where("guruId", "==", userData.uid));
      const snapshot = await getDocs(q);
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz)));
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  }, [userData?.uid]);

  const fetchRooms = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      const q = query(collection(db, "rooms"), where("guruId", "==", userData.uid));
      const snapshot = await getDocs(q);
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room)));
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  }, [userData?.uid]);

  const fetchTopStudents = useCallback(async () => {
    try {
      const q = query(
        collection(db, "users"), 
        where("role", "==", "Siswa"),
        orderBy("xp", "desc"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      setTopStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching top students:", error);
    }
  }, []);

  const fetchFullLeaderboard = useCallback(async (classFilter: string) => {
    setIsFetchingLeaderboard(true);
    try {
      let q;
      if (classFilter) {
        q = query(
          collection(db, "users"), 
          where("role", "==", "Siswa"),
          where("studentClass", "==", classFilter),
          orderBy("xp", "desc")
        );
      } else {
        q = query(
          collection(db, "users"), 
          where("role", "==", "Siswa"),
          orderBy("xp", "desc"),
          limit(50)
        );
      }
      const snapshot = await getDocs(q);
      setFullLeaderboard(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching full leaderboard:", error);
    } finally {
      setIsFetchingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    if (isViewingLeaderboard) {
      fetchFullLeaderboard(leaderboardFilter);
    }
  }, [isViewingLeaderboard, leaderboardFilter, fetchFullLeaderboard]);

  useEffect(() => {
    const loadData = async () => {
      if (userData?.uid) {
        setIsLoading(true);
        await Promise.all([fetchQuizzes(), fetchRooms(), fetchTopStudents()]);
        setIsLoading(false);
      }
    };
    loadData();
  }, [userData, fetchQuizzes, fetchRooms, fetchTopStudents]);

  const generateQuizWithAI = async () => {
    if (!topic || !userData?.subject) return;
    
    // Collect all available Gemini API keys for rotation
    const apiKeys = [
      process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_3,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_4,
      process.env.NEXT_PUBLIC_GEMINI_API_KEY_5,
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      alert("API Key Gemini belum dikonfigurasi. Silakan hubungi administrator.");
      return;
    }

    setIsGenerating(true);
    
    let lastError = "";
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        const ai = new GoogleGenAI({ apiKey });
      
      let prompt = "";
      let optionsDescription = "";
      
      if (quizType === "true_false") {
        prompt = `Buatlah kuis Benar/Salah tentang ${topic} untuk kelas ${userData.subject} dalam Bahasa Indonesia. Sertakan ${numQuestions} pernyataan. Untuk setiap pertanyaan, berikan sebuah pernyataan. Pilihan jawaban (options) HARUS selalu ["Benar", "Salah"]. correctAnswerIndex adalah 0 jika pernyataan itu benar, dan 1 jika pernyataan itu salah.`;
        optionsDescription = 'Exactly 2 options: ["Benar", "Salah"]';
      } else if (quizType === "hidden_word") {
        prompt = `Buatlah kuis pilihan ganda tentang ${topic} untuk kelas ${userData.subject} dalam Bahasa Indonesia. Sertakan ${numQuestions} pertanyaan. Berikan 4 pilihan jawaban untuk setiap pertanyaan. SELAIN ITU, berikan satu KATA RAHASIA (hiddenWord) yang berkaitan erat dengan topik ${topic}. Kata rahasia ini sebaiknya terdiri dari 5 hingga 10 huruf tanpa spasi, gunakan huruf kapital semua.`;
        optionsDescription = "Exactly 4 options";
      } else {
        // Both multiple_choice and duck_hunt use 4 options
        prompt = `Buatlah kuis pilihan ganda tentang ${topic} untuk kelas ${userData.subject} dalam Bahasa Indonesia. Sertakan ${numQuestions} pertanyaan. Berikan 4 pilihan jawaban untuk setiap pertanyaan.`;
        optionsDescription = "Exactly 4 options";
      }
      
      const schemaProperties: any = {
        title: { type: Type.STRING, description: "A catchy title for the quiz" },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: optionsDescription
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "Index of the correct option" }
            },
            required: ["question", "options", "correctAnswerIndex"]
          }
        }
      };
      const schemaRequired = ["title", "questions"];

      if (quizType === "hidden_word") {
        schemaProperties.hiddenWord = { type: Type.STRING, description: "A secret word related to the topic, 5-10 letters, no spaces, uppercase" };
        schemaRequired.push("hiddenWord");
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: schemaProperties,
            required: schemaRequired
          }
        }
      });

      const generatedData = JSON.parse(response.text || "{}");
      
        if (generatedData.title && generatedData.questions) {
          const quizData: any = {
            guruId: userData.uid,
            subject: userData.subject,
            title: generatedData.title,
            quizType: quizType, // Save the mode
            questions: generatedData.questions,
            createdAt: new Date()
          };
          if (quizType === "hidden_word" && generatedData.hiddenWord) {
            quizData.hiddenWord = generatedData.hiddenWord;
          }
          await addDoc(collection(db, "quizzes"), quizData);
          await fetchQuizzes();
          setTopic("");
          setIsGenerating(false);
          return; // Success! Exit the function
        }
      } catch (error: any) {
        console.error(`Error with API Key ${i + 1}:`, error);
        lastError = error.message || "Unknown error";
        
        // If it's a rate limit error (429), try the next key
        if (lastError.includes("429") || lastError.toLowerCase().includes("quota") || lastError.toLowerCase().includes("limit")) {
          if (i < apiKeys.length - 1) {
            console.warn(`API Key ${i + 1} hit rate limit. Trying next key...`);
            continue;
          }
        }
        
        // If it's not a rate limit error, or we're out of keys, break and show error
        break;
      }
    }

    setIsGenerating(false);
    alert(`Gagal membuat kuis: ${lastError}. Silakan coba lagi nanti.`);
  };

  const createRoom = async (quizId: string) => {
    const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const roomRef = await addDoc(collection(db, "rooms"), {
      roomCode,
      quizId,
      guruId: userData?.uid,
      status: "waiting",
      createdAt: new Date()
    });
    router.push(`/room/guru/${roomCode}`);
  };

  const deleteRoom = async (roomId: string) => {
    if (deletingRoomId !== roomId) {
      setDeletingRoomId(roomId);
      setTimeout(() => setDeletingRoomId(null), 3000); // Reset after 3s
      return;
    }
    
    try {
      setDeletingRoomId(null);
      
      // 1. Bersihkan sub-koleksi leaderboard di dalam ruangan
      const leaderboardRef = collection(db, "rooms", roomId, "leaderboard");
      const leaderboardSnap = await getDocs(leaderboardRef);
      const deletePromises = leaderboardSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. Hapus dokumen ruangan utama
      const roomRef = doc(db, "rooms", roomId);
      await deleteDoc(roomRef);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (error: any) {
      console.error("Error deleting room:", error);
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (deletingQuizId !== quizId) {
      setDeletingQuizId(quizId);
      setTimeout(() => setDeletingQuizId(null), 3000); // Reset after 3s
      return;
    }
    
    try {
      setDeletingQuizId(null);
      const quizRef = doc(db, "quizzes", quizId);
      await deleteDoc(quizRef);
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  if (!userData) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-cream">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-brand-navy font-medium">Memuat Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center">
      <div className="w-full max-w-md md:max-w-4xl px-4 py-6 md:py-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 md:p-8 rounded-[32px] shadow-sm gap-4 border border-brand-navy/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-navy rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-navy/10">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">Dashboard Guru</h1>
              <p className="text-brand-navy/60 text-[10px] md:text-sm font-black uppercase tracking-widest">AksaraPlay • {userData.subject}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-brand-navy/40 hover:text-brand-orange transition-colors font-black text-[10px] md:text-xs uppercase tracking-widest">
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* AI Quiz Generator */}
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-orange/10 transition-colors" />
              
              <div className="flex items-center gap-4 mb-6 md:mb-8">
                <div className="p-3 md:p-4 bg-brand-orange text-white rounded-2xl shadow-lg shadow-brand-orange/20">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">Buat Kuis AI</h2>
                  <p className="text-brand-navy/60 text-xs md:text-sm font-medium">Gunakan AI untuk membuat kuis instan</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Topik Pembelajaran</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="misal: Fotosintesis..."
                    className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none transition-all font-bold text-brand-navy text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Jumlah Soal</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none transition-all font-bold text-brand-navy text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Mode Permainan</label>
                  <select 
                    value={quizType}
                    onChange={(e) => setQuizType(e.target.value as "multiple_choice" | "true_false" | "duck_hunt" | "hidden_word")}
                    className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none transition-all font-bold text-brand-navy text-sm cursor-pointer appearance-none"
                  >
                    <option value="multiple_choice">Pilihan Ganda (Classic)</option>
                    <option value="true_false">Benar / Salah (Buzzer)</option>
                    <option value="duck_hunt">Berburu Bebek (Duck Hunt)</option>
                    <option value="hidden_word">Tebak Kata Tersembunyi</option>
                  </select>
                </div>
              </div>
              
              <button 
                onClick={generateQuizWithAI}
                disabled={isGenerating || !topic}
                className="w-full bg-brand-navy text-white font-black text-base md:text-lg py-4 md:py-5 rounded-2xl hover:bg-brand-black hover:shadow-xl hover:shadow-brand-navy/20 transition-all disabled:opacity-50 flex justify-center items-center gap-3 active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Meracik Soal...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                    Buat Kuis Sekarang
                  </>
                )}
              </button>
            </section>

            {/* My Quizzes */}
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy flex items-center gap-3 tracking-tight">
                  <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-brand-orange" />
                  Koleksi Kuis
                </h2>
                <span className="bg-brand-cream text-brand-navy/60 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{quizzes.length} Kuis</span>
              </div>

              {quizzes.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-brand-cream/30 rounded-[32px] border-2 border-dashed border-brand-navy/10">
                  <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-brand-navy/20 mx-auto mb-4" />
                  <p className="text-brand-navy/40 text-sm font-bold">Belum ada kuis. Mulai dengan AI!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quizzes.map(quiz => (
                    <div key={quiz.id} className="group p-5 md:p-6 bg-white border-2 border-brand-navy/5 rounded-3xl hover:border-brand-orange hover:shadow-xl hover:shadow-brand-orange/5 transition-all relative">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteQuiz(quiz.id);
                          }}
                          className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-20 ${
                            deletingQuizId === quiz.id 
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-110" 
                              : "text-brand-navy/10 hover:text-red-500"
                          }`}
                          title={deletingQuizId === quiz.id ? "Klik lagi untuk konfirmasi" : "Hapus Kuis"}
                        >
                          {deletingQuizId === quiz.id ? (
                            <span className="text-[8px] font-black uppercase px-1">Yakin?</span>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      <div className="mb-4 md:mb-6">
                        <h3 className="font-black text-lg md:text-xl text-brand-navy mb-1 group-hover:text-brand-orange transition-colors line-clamp-1">{quiz.title}</h3>
                        <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-widest mb-1">
                          {quiz.questions.length} Pertanyaan • {quiz.quizType === "true_false" ? "Benar/Salah" : quiz.quizType === "duck_hunt" ? "Duck Hunt" : quiz.quizType === "hidden_word" ? "Kata Tersembunyi" : "Pilihan Ganda"}
                        </p>
                        {quiz.quizType === "hidden_word" && quiz.hiddenWord && (
                          <p className="text-[10px] text-brand-orange font-black uppercase tracking-widest">
                            Kata: {quiz.hiddenWord}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setViewingQuiz(quiz)}
                          className="w-full bg-brand-orange text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-brand-orange/90 transition-colors shadow-lg shadow-brand-orange/20 active:scale-95"
                        >
                          <Eye className="w-4 h-4" />
                          Lihat Soal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Room History & Student Ranking */}
          <div className="space-y-6">
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5">
              <h2 className="text-xl md:text-2xl font-black text-brand-navy mb-6 md:mb-8 flex items-center gap-3 tracking-tight">
                <History className="w-6 h-6 md:w-7 md:h-7 text-brand-orange" />
                Ruangan
              </h2>
              {rooms.length === 0 ? (
                <p className="text-brand-navy/40 text-center py-8 text-sm font-bold">Belum ada ruangan.</p>
              ) : (
                <div className="space-y-4">
                  {rooms.map(room => (
                    <div key={room.id} className="p-5 bg-brand-cream/50 rounded-3xl border border-transparent hover:border-brand-orange/20 transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono font-black text-xl md:text-2xl tracking-widest text-brand-navy">{room.roomCode}</span>
                        <span className={`text-[8px] md:text-[10px] px-2 md:px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                          room.status === 'active' ? 'bg-brand-orange text-white' : 
                          room.status === 'waiting' ? 'bg-brand-navy text-white' : 
                          'bg-brand-navy/20 text-brand-navy'
                        }`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <button 
                          onClick={() => router.push(`/room/guru/${room.roomCode}`)}
                          className="flex-1 text-center py-2 text-xs font-black text-brand-orange hover:text-brand-orange/80 transition-colors uppercase tracking-widest"
                        >
                          Pantau &rarr;
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRoom(room.id);
                          }}
                          className={`p-2 rounded-xl transition-all z-10 ${
                            deletingRoomId === room.id 
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20 scale-110" 
                              : "text-brand-navy/20 hover:text-red-500"
                          }`}
                          title={deletingRoomId === room.id ? "Klik lagi untuk konfirmasi" : "Hapus Ruangan"}
                        >
                          {deletingRoomId === room.id ? (
                            <span className="text-[8px] font-black uppercase px-1">Yakin?</span>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Student Ranking Monitoring */}
            <section className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-brand-navy/5">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-black text-brand-navy flex items-center gap-3 tracking-tight">
                  <Trophy className="w-6 h-6 md:w-7 md:h-7 text-brand-orange" />
                  Peringkat Siswa
                </h2>
                <button 
                  onClick={() => setIsViewingLeaderboard(true)}
                  className="text-[10px] font-black text-brand-orange uppercase tracking-widest hover:underline"
                >
                  Lihat Semua
                </button>
              </div>
              {topStudents.length === 0 ? (
                <p className="text-brand-navy/40 text-center py-8 text-sm font-bold">Belum ada data peringkat.</p>
              ) : (
                <div className="space-y-4">
                  {topStudents.map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-brand-cream/30 rounded-3xl border border-transparent hover:border-brand-orange/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                          index === 0 ? "bg-yellow-400 text-white" : 
                          index === 1 ? "bg-slate-300 text-white" : 
                          index === 2 ? "bg-amber-600 text-white" : 
                          "bg-brand-navy/10 text-brand-navy"
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar avatarString={student.avatar} size="sm" />
                        <div>
                          <p className="font-black text-brand-navy text-sm leading-tight">{student.displayName}</p>
                          <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">{student.studentClass || "Siswa"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-brand-orange text-sm">{student.xp} XP</p>
                        <p className="text-[8px] font-bold text-brand-navy/30 uppercase tracking-widest">Level {Math.floor((student.xp || 0) / 100) + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Full Leaderboard Modal */}
      {isViewingLeaderboard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-brand-navy/5 flex items-center justify-between bg-brand-cream/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-orange rounded-2xl flex items-center justify-center shadow-lg shadow-brand-orange/20">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-navy tracking-tight">Papan Peringkat Global</h2>
                  <p className="text-xs font-bold text-brand-navy/40 uppercase tracking-widest">Pantau kemajuan seluruh siswa</p>
                </div>
              </div>
              <button 
                onClick={() => setIsViewingLeaderboard(false)}
                className="p-3 bg-white rounded-2xl text-brand-navy/20 hover:text-brand-orange transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 bg-white border-b border-brand-navy/5 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20" />
                <select 
                  value={leaderboardFilter}
                  onChange={(e) => setLeaderboardFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-brand-navy font-bold transition-all appearance-none cursor-pointer"
                >
                  <option value="">Semua Kelas</option>
                  {["7A", "7B", "7C", "7D", "7E", "7F", "7G", "7H", 
                    "8A", "8B", "8C", "8D", "8E", "8F", "8G", "8H", 
                    "9A", "9B", "9C", "9D", "9E", "9F", "9G", "9H"].map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center px-6 py-4 bg-brand-orange/5 rounded-2xl border border-brand-orange/10">
                <p className="text-xs font-black text-brand-orange uppercase tracking-widest">
                  Total: {fullLeaderboard.length} Siswa
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isFetchingLeaderboard ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-black text-brand-navy/40 uppercase tracking-widest animate-pulse">Memuat Data...</p>
                </div>
              ) : fullLeaderboard.length === 0 ? (
                <div className="text-center py-20">
                  <Trophy className="w-16 h-16 text-brand-navy/10 mx-auto mb-4" />
                  <p className="text-brand-navy/40 font-bold">Tidak ada data untuk filter ini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fullLeaderboard.map((student, index) => (
                    <div key={student.id} className="flex items-center justify-between p-5 bg-brand-cream/20 rounded-[32px] border border-transparent hover:border-brand-orange/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                          index === 0 ? "bg-yellow-400 text-white shadow-lg shadow-yellow-400/20" : 
                          index === 1 ? "bg-slate-300 text-white shadow-lg shadow-slate-300/20" : 
                          index === 2 ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20" : 
                          "bg-white text-brand-navy/40 shadow-sm"
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar avatarString={student.avatar} size="md" />
                        <div>
                          <p className="font-black text-brand-navy text-lg leading-tight">{student.displayName}</p>
                          <p className="text-[10px] font-bold text-brand-navy/40 uppercase tracking-widest">Kelas {student.studentClass || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-brand-orange" />
                          <p className="font-black text-brand-orange text-xl">{student.xp}</p>
                          <span className="text-[10px] font-black text-brand-orange/40 uppercase">XP</span>
                        </div>
                        <p className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">Level {Math.floor((student.xp || 0) / 100) + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Details Modal */}
      {viewingQuiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 border-b border-brand-navy/5 flex justify-between items-center bg-brand-cream/30">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-brand-navy tracking-tight">{viewingQuiz.title}</h2>
                <p className="text-brand-navy/40 text-[10px] font-black uppercase tracking-widest">{viewingQuiz.questions.length} Pertanyaan • {viewingQuiz.subject}</p>
              </div>
              <button 
                onClick={() => setViewingQuiz(null)}
                className="p-2 hover:bg-brand-navy/5 rounded-full transition-colors text-brand-navy/40 hover:text-brand-navy"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {viewingQuiz.questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-4 p-6 bg-brand-cream/30 rounded-3xl border border-brand-navy/5">
                  <div className="flex gap-4">
                    <span className="w-8 h-8 bg-brand-navy text-white rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0">{qIdx + 1}</span>
                    <h3 className="font-bold text-brand-navy text-lg leading-tight">{q.question}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div 
                        key={oIdx} 
                        className={`p-3 rounded-xl text-sm font-medium border ${
                          oIdx === q.correctAnswerIndex 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-white border-brand-navy/5 text-brand-navy/60"
                        }`}
                      >
                        <span className="font-black mr-2 opacity-40">{String.fromCharCode(65 + oIdx)}.</span>
                        {opt}
                        {oIdx === q.correctAnswerIndex && <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">Benar</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 md:p-8 border-t border-brand-navy/5 bg-white">
              <button 
                onClick={() => {
                  createRoom(viewingQuiz.id);
                  setViewingQuiz(null);
                }}
                className="w-full bg-brand-orange text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-brand-orange/90 shadow-xl shadow-brand-orange/20 transition-all active:scale-95"
              >
                <Play className="w-6 h-6 fill-current" />
                Buka Kelas Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
