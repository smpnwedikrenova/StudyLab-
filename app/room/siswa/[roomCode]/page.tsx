"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, increment, addDoc, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Gamepad2, Square, Trophy, Zap, Flame, Diamond, Sparkles, Ghost, Bird, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

// Utility to shuffle array
function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function SiswaRoom() {
  const { roomCode } = useParams();
  const { userData } = useAuth();
  const router = useRouter();
  
  const [room, setRoom] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [roomRank, setRoomRank] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [hiddenWordGuess, setHiddenWordGuess] = useState("");
  const [hiddenWordGuessed, setHiddenWordGuessed] = useState(false);
  const [hiddenWordResult, setHiddenWordResult] = useState<"correct" | "incorrect" | null>(null);
  
  // Item States
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [isGoldenAppleActive, setIsGoldenAppleActive] = useState(false);
  const [phoenixFeatherUsed, setPhoenixFeatherUsed] = useState(0);
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [usedItemsInSession, setUsedItemsInSession] = useState<string[]>([]);

  const playSound = (type: "correct" | "incorrect" | "item") => {
    const audio = new Audio(
      type === "correct" 
        ? "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" 
        : type === "incorrect"
        ? "https://assets.mixkit.co/active_storage/sfx/2959/2959-preview.mp3"
        : "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"
    );
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore if blocked by browser
  };

  useEffect(() => {
    if (!roomCode) return;

    const q = query(collection(db, "rooms"), where("roomCode", "==", roomCode));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const roomData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setRoom(roomData);
        
        // Check if student has already submitted for this room
        if (userData?.uid && roomData.id) {
          const lbDoc = await getDoc(doc(db, "rooms", roomData.id, "leaderboard", userData.uid));
          if (lbDoc.exists()) {
            const lbData = lbDoc.data();
            if (lbData.status === "finished") {
              setScore(lbData.score || 0);
              setSubmitted(true);
            }
          }
        }

        if (roomData.quizId && !quiz) {
          const quizDoc = await getDoc(doc(db, "quizzes", roomData.quizId));
          if (quizDoc.exists()) {
            const quizData = quizDoc.data();
            setQuiz(quizData);
            
            // Set inventory from userData
            if (userData?.inventory) {
              setInventory(userData.inventory);
            }

            // Randomize questions for this specific student
            const shuffled = shuffleArray(quizData.questions.map((q: any, idx: number) => ({ ...q, originalIndex: idx })));
            setQuestions(shuffled);

            // Initialize leaderboard entry for progress tracking
            if (userData?.uid && roomData.id) {
              await setDoc(doc(db, "rooms", roomData.id, "leaderboard", userData.uid), {
                siswaId: userData.uid,
                siswaName: userData.displayName || "Anonymous",
                avatar: userData.avatar || "0:0:0",
                studentClass: userData.studentClass || "-",
                score: 0,
                progress: 0,
                totalQuestions: shuffled.length,
                status: "playing",
                lastUpdate: new Date()
              }, { merge: true });
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, quiz, userData?.uid, userData?.displayName, userData?.avatar, userData?.studentClass, userData?.inventory]);

  const handleAnswer = async (optionIndex: number) => {
    if (isAnswering || feedback) return;
    
    setIsAnswering(true);
    const currentQ = questions[currentQuestionIdx];
    const isCorrect = optionIndex === currentQ.correctAnswerIndex;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIdx]: optionIndex
    }));

    const revealLetters = () => {
      if (quiz?.quizType === "hidden_word" && quiz.hiddenWord) {
        const wordLen = quiz.hiddenWord.length;
        const totalQ = questions.length;
        const lettersPerQ = Math.ceil(wordLen / totalQ);
        
        setRevealedIndices(prev => {
          const unrevealed = Array.from({length: wordLen}, (_, i) => i).filter(i => !prev.includes(i));
          const toReveal = shuffleArray(unrevealed).slice(0, lettersPerQ);
          return [...prev, ...toReveal];
        });
      }
    };

    if (isCorrect) {
      setFeedback("correct");
      setStreak(prev => prev + 1);
      revealLetters();
      playSound("correct");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF5A1F", "#0D1321", "#FFFFFF"]
      });
    } else {
      // Check for Phoenix Feather
      if (phoenixFeatherUsed < 5 && inventory["phoenix_feather"] > 0) {
        setFeedback("correct"); // Treat as correct
        setAnswers(prev => ({ ...prev, [currentQuestionIdx]: currentQ.correctAnswerIndex })); // Fix answer state
        setStreak(prev => prev + 1);
        setPhoenixFeatherUsed(prev => prev + 1);
        setInventory(prev => ({ ...prev, phoenix_feather: prev.phoenix_feather - 1 }));
        setUsedItemsInSession(prev => [...prev, "phoenix_feather"]);
        revealLetters();
        playSound("item");
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#FFFFFF"]
        });
      } else {
        setFeedback("incorrect");
        setStreak(0);
        playSound("incorrect");
      }
    }

    // Wait for feedback animation
    setTimeout(async () => {
      setFeedback(null);
      setIsAnswering(false);
      setRemovedOptions([]); // Reset removed options for next question

      // Update progress in leaderboard
      if (userData?.uid && room?.id) {
        const answeredCount = Object.keys({ ...answers, [currentQuestionIdx]: optionIndex }).length;
        await setDoc(doc(db, "rooms", room.id, "leaderboard", userData.uid), {
          progress: answeredCount,
          lastUpdate: new Date()
        }, { merge: true });
      }

      if (currentQuestionIdx < questions.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
      }
    }, 1500);
  };

  const submitQuiz = async () => {
    if (!room?.id || !userData?.uid) return;
    
    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    // Add phoenix feather saves to correct count for score calculation
    // Actually, phoenix feather already updated the answers state if we used it?
    // Wait, handleAnswer updates answers[currentQuestionIdx] = optionIndex.
    // If phoenix feather is used, optionIndex is WRONG but we set feedback to correct.
    // We should probably update the answers state to be the correct one if phoenix feather is used.
    // Let's adjust handleAnswer.
    
    let calculatedScore = correctCount * 10;
    if (isGoldenAppleActive) calculatedScore *= 2;
    
    // Calculate diamonds: 10 base + 1 per 10 XP
    let awardedDiamonds = 10 + Math.floor(calculatedScore / 10);
    if (isGoldenAppleActive) awardedDiamonds *= 2;

    setScore(calculatedScore);
    setSubmitted(true);

    // Push to leaderboard
    await setDoc(doc(db, "rooms", room.id, "leaderboard", userData.uid), {
      score: calculatedScore,
      status: "finished",
      submittedAt: new Date()
    }, { merge: true });

    // Calculate room rank
    try {
      const lbRef = collection(db, "rooms", room.id, "leaderboard");
      const qRank = query(lbRef, where("score", ">", calculatedScore));
      const rankSnapshot = await getCountFromServer(qRank);
      setRoomRank(rankSnapshot.data().count + 1);
    } catch (e) {
      console.error("Error calculating room rank:", e);
    }

    // Award XP, Diamonds and update inventory
    const userRef = doc(db, "users", userData.uid);
    await updateDoc(userRef, {
      xp: increment(calculatedScore),
      diamonds: increment(awardedDiamonds),
      quizzesPlayed: increment(1),
      inventory: inventory // Save updated inventory (items used)
    });

    // Save to user history
    const historyRef = collection(db, "users", userData.uid, "history");
    await addDoc(historyRef, {
      quizId: room.quizId,
      quizTitle: quiz?.title || "Kuis Tanpa Judul",
      score: calculatedScore,
      roomCode: room.roomCode,
      completedAt: new Date()
    });
  };

  const handleUseItem = (itemId: string) => {
    if (isAnswering || feedback || inventory[itemId] <= 0) return;

    if (itemId === "clear_answers") {
      const currentQ = questions[currentQuestionIdx];
      const wrongOptions = currentQ.options
        .map((_: any, i: number) => i)
        .filter((i: number) => i !== currentQ.correctAnswerIndex);
      
      const toRemove = shuffleArray(wrongOptions).slice(0, 2);
      setRemovedOptions(toRemove);
      setInventory(prev => ({ ...prev, clear_answers: prev.clear_answers - 1 }));
      setUsedItemsInSession(prev => [...prev, "clear_answers"]);
      playSound("item");
    } else if (itemId === "golden_apple") {
      if (isGoldenAppleActive) return;
      setIsGoldenAppleActive(true);
      setInventory(prev => ({ ...prev, golden_apple: prev.golden_apple - 1 }));
      setUsedItemsInSession(prev => [...prev, "golden_apple"]);
      playSound("item");
    }
  };

  if (!room) return <div className="p-8 text-center text-brand-navy/60 bg-brand-cream min-h-screen flex items-center justify-center">Mencari ruangan...</div>;
  
  if (room.status === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-cream text-brand-navy p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-brand-navy/5 p-12 rounded-[48px] shadow-2xl shadow-brand-navy/5 max-w-md w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
          
          <div className="relative mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 border-2 border-dashed border-brand-orange/30 rounded-full mx-auto"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-brand-orange animate-bounce" />
            </div>
          </div>

          <h2 className="text-3xl font-black mb-4 tracking-tight text-brand-navy">Siap-siap!</h2>
          <p className="text-brand-navy/60 mb-8 leading-relaxed">Guru sedang menyiapkan petualangan untukmu. Jangan ke mana-mana ya!</p>
          
          <div className="flex items-center justify-center gap-2 text-brand-orange font-bold text-sm uppercase tracking-widest">
            <div className="w-2 h-2 bg-brand-orange rounded-full animate-ping" />
            Menunggu Guru...
          </div>
        </motion.div>
      </div>
    );
  }

  if (room.status === "finished" && !submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-cream text-brand-navy p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-brand-navy/5 p-12 rounded-[48px] shadow-2xl shadow-brand-navy/5 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-brand-navy/10 text-brand-navy rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Square className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black mb-4 text-brand-navy">Kuis Berakhir</h2>
          <p className="text-brand-navy/60 mb-8 leading-relaxed">Guru telah mengakhiri petualangan ini. Sampai jumpa di kuis berikutnya!</p>
          <button 
            onClick={() => router.push("/siswa")} 
            className="w-full bg-brand-navy text-white font-bold py-4 rounded-2xl hover:bg-brand-black transition-all"
          >
            Kembali ke Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    if (quiz?.quizType === "hidden_word" && !hiddenWordGuessed && quiz.hiddenWord) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-brand-cream text-brand-navy p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-brand-navy/5 p-8 md:p-12 rounded-[48px] shadow-2xl shadow-brand-navy/5 max-w-2xl w-full text-center relative overflow-hidden flex flex-col"
          >
            <h2 className="text-3xl font-black mb-6 text-brand-navy">Tebak Kata Rahasia!</h2>
            <p className="text-brand-navy/60 mb-8 font-medium">Tebak kata rahasia ini untuk mendapatkan bonus XP dan Diamond!</p>
            
            <div className="mb-8 flex justify-center gap-2 flex-wrap">
              {quiz.hiddenWord.split("").map((char: string, i: number) => (
                <div key={i} className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center text-2xl md:text-3xl font-black rounded-xl border-b-4 ${revealedIndices.includes(i) ? "bg-brand-orange text-white border-brand-orange/50" : "bg-brand-cream text-transparent border-brand-navy/10"}`}>
                  {revealedIndices.includes(i) ? char : "_"}
                </div>
              ))}
            </div>
            
            <input 
              type="text"
              value={hiddenWordGuess}
              onChange={(e) => setHiddenWordGuess(e.target.value.toUpperCase())}
              placeholder="Masukkan tebakanmu..."
              className="w-full text-center p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-black text-brand-navy text-xl mb-6 uppercase tracking-widest"
            />
            
            {hiddenWordResult === "incorrect" && (
              <p className="text-red-500 font-bold mb-4">Tebakan salah! Coba lagi atau lewati.</p>
            )}
            {hiddenWordResult === "correct" && (
              <p className="text-emerald-500 font-bold mb-4">Tebakan Benar! +50 XP & +20 Diamond</p>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => setHiddenWordGuessed(true)}
                disabled={hiddenWordResult === "correct"}
                className="flex-1 bg-brand-cream text-brand-navy font-black py-4 rounded-2xl hover:bg-brand-navy/5 transition-all disabled:opacity-50"
              >
                Lewati
              </button>
              <button 
                onClick={async () => {
                  if (hiddenWordGuess === quiz.hiddenWord) {
                    setHiddenWordResult("correct");
                    const bonusXP = 50;
                    const bonusDiamond = 20;
                    setScore(prev => prev + bonusXP);
                    if (userData?.uid && room?.id) {
                      await updateDoc(doc(db, "users", userData.uid), {
                        xp: increment(bonusXP),
                        diamonds: increment(bonusDiamond)
                      });
                      await updateDoc(doc(db, "rooms", room.id, "leaderboard", userData.uid), {
                        score: increment(bonusXP)
                      });
                    }
                    setTimeout(() => setHiddenWordGuessed(true), 2000);
                  } else {
                    setHiddenWordResult("incorrect");
                  }
                }}
                disabled={hiddenWordResult === "correct" || !hiddenWordGuess}
                className="flex-1 bg-brand-orange text-white font-black py-4 rounded-2xl hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/20 disabled:opacity-50"
              >
                Tebak!
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-cream text-brand-navy p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-brand-navy/5 p-8 md:p-12 rounded-[48px] shadow-2xl shadow-brand-navy/5 max-w-2xl w-full text-center relative overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
          
          {!showReview ? (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-24 h-24 bg-brand-orange/10 text-brand-orange rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-orange/10">
                <Trophy className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight text-brand-navy">Luar Biasa!</h2>
              <p className="text-brand-navy/60 mb-10 font-medium">Kamu telah menyelesaikan tantangan ini.</p>
              
              <div className="relative mb-12">
                <div className="text-7xl font-black text-brand-navy mb-2">{score}</div>
                <div className="text-brand-orange font-black uppercase tracking-widest text-sm mb-4">Total XP Didapat</div>
                
                {roomRank && (
                  <div className="mb-6 flex items-center justify-center gap-2 text-brand-navy/40 font-black text-[10px] uppercase tracking-widest">
                    <Trophy className="w-4 h-4" />
                    Peringkat #{roomRank} di Ruangan Ini
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 bg-sky-50 text-sky-600 px-6 py-3 rounded-2xl mx-auto w-fit border border-sky-100">
                  <Diamond className="w-5 h-5 fill-current" />
                  <span className="text-2xl font-black">+{10 + Math.floor(score / 10)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowReview(true)} 
                  className="w-full bg-brand-cream text-brand-navy font-black text-lg py-5 rounded-3xl hover:bg-brand-navy/5 transition-all border border-brand-navy/5"
                >
                  Tinjau Jawaban
                </button>
                <button 
                  onClick={() => router.push("/siswa")} 
                  className="w-full bg-brand-navy text-white font-black text-lg py-5 rounded-3xl hover:bg-brand-black transition-all shadow-xl shadow-brand-navy/20"
                >
                  Lanjutkan ke Dashboard
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-full max-h-[70vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-brand-navy tracking-tight">Tinjauan Jawaban</h2>
                <button 
                  onClick={() => setShowReview(false)}
                  className="text-brand-navy/40 hover:text-brand-navy font-black text-xs uppercase tracking-widest"
                >
                  Kembali
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 text-left">
                {questions.map((q, idx) => {
                  const studentAnswer = answers[idx];
                  const isCorrect = studentAnswer === q.correctAnswerIndex;
                  
                  return (
                    <div key={idx} className="p-6 bg-brand-cream/30 rounded-3xl border border-brand-navy/5 space-y-4">
                      <div className="flex gap-4">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-brand-navy text-lg leading-tight">{q.question}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 pl-12">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isStudentChoice = studentAnswer === oIdx;
                          const isCorrectChoice = oIdx === q.correctAnswerIndex;
                          
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
                            <div key={oIdx} className={`p-3 rounded-xl text-sm font-medium border flex items-center justify-between ${borderClass} ${bgClass} ${textClass}`}>
                              <div className="flex items-center">
                                <span className="font-black mr-2 opacity-40">{String.fromCharCode(65 + oIdx)}.</span>
                                {opt}
                              </div>
                              {isCorrectChoice && <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">Benar</span>}
                              {isStudentChoice && !isCorrectChoice && <span className="text-[8px] font-black uppercase tracking-widest bg-red-500 text-white px-1.5 py-0.5 rounded">Pilihanmu</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowReview(false)} 
                className="mt-8 w-full bg-brand-navy text-white font-black text-lg py-5 rounded-3xl hover:bg-brand-black transition-all"
              >
                Selesai Meninjau
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  };

  const duckPaths = [
    { x: ["5%", "50%", "10%", "55%", "5%"], y: ["10%", "40%", "15%", "45%", "10%"] },
    { x: ["55%", "5%", "50%", "10%", "55%"], y: ["45%", "10%", "40%", "15%", "45%"] },
    { x: ["10%", "55%", "5%", "50%", "10%"], y: ["40%", "15%", "45%", "10%", "40%"] },
    { x: ["50%", "10%", "55%", "5%", "50%"], y: ["15%", "45%", "10%", "40%", "15%"] },
  ];

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-md md:max-w-2xl px-4 py-6 md:py-10">
        {/* Item Bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {["clear_answers", "phoenix_feather", "golden_apple"].map((itemId) => {
            const count = inventory[itemId] || 0;
            const isActive = itemId === "golden_apple" && isGoldenAppleActive;
            const icon = itemId === "clear_answers" ? "🧹" : itemId === "phoenix_feather" ? "🪶" : "🍎";
            const name = itemId === "clear_answers" ? "Clear" : itemId === "phoenix_feather" ? "Phoenix" : "Golden";
            
            return (
              <button
                key={itemId}
                onClick={() => handleUseItem(itemId)}
                disabled={count <= 0 || (itemId === "phoenix_feather") || isActive || feedback !== null || (itemId === "clear_answers" && quiz?.quizType === "true_false")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                  isActive 
                    ? "bg-brand-orange text-white border-brand-orange shadow-lg" 
                    : count > 0 
                    ? "bg-white text-brand-navy border-brand-navy/5 hover:border-brand-orange shadow-sm" 
                    : "bg-brand-cream text-brand-navy/20 border-transparent opacity-50 cursor-not-allowed"
                }`}
              >
                <span className="text-base">{icon}</span>
                <span>{name} ({count})</span>
                {itemId === "phoenix_feather" && phoenixFeatherUsed > 0 && (
                  <span className="bg-brand-navy text-white px-1.5 py-0.5 rounded-md text-[8px]">{phoenixFeatherUsed}/5</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-brand-navy/5">
          <div className="flex flex-col">
            <span className="font-black text-brand-navy/40 uppercase tracking-widest text-[10px]">Pertanyaan {currentQuestionIdx + 1} dari {questions.length}</span>
            <div className="flex items-center gap-2 mt-1">
              {streak > 1 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 bg-orange-100 text-brand-orange px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                >
                  <Flame className="w-3 h-3 fill-current" />
                  {streak} Streak!
                </motion.div>
              )}
            </div>
          </div>
          <span className="font-mono bg-brand-navy text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">RUANGAN: {roomCode}</span>
        </div>

        <motion.div 
          key={currentQuestionIdx}
          initial={{ x: 50, opacity: 0 }}
          animate={feedback === "incorrect" ? shakeAnimation : { x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          className={`bg-white p-8 md:p-12 rounded-[40px] shadow-sm mb-6 border-4 transition-colors duration-300 ${
            feedback === "correct" ? "border-emerald-500" : 
            feedback === "incorrect" ? "border-red-500" : 
            "border-transparent"
          }`}
        >
          {quiz?.quizType === "hidden_word" && quiz.hiddenWord && (
            <div className="mb-8 flex justify-center gap-1.5 md:gap-2 flex-wrap">
              {quiz.hiddenWord.split("").map((char: string, i: number) => (
                <div key={i} className={`w-8 h-10 md:w-10 md:h-12 flex items-center justify-center text-xl md:text-2xl font-black rounded-xl border-b-4 ${revealedIndices.includes(i) ? "bg-brand-orange text-white border-brand-orange/50" : "bg-brand-cream text-transparent border-brand-navy/10"}`}>
                  {revealedIndices.includes(i) ? char : "_"}
                </div>
              ))}
            </div>
          )}

          <h2 className="text-xl md:text-3xl font-black text-brand-navy mb-8 md:mb-10 leading-tight tracking-tight text-center">
            {currentQ.question}
          </h2>

          {quiz?.quizType === "duck_hunt" ? (
            <div className="relative w-full h-[400px] md:h-[500px] bg-[#5c94fc] rounded-3xl overflow-hidden border-8 border-black shadow-inner" style={{ imageRendering: 'pixelated' }}>
              {/* Pixel Clouds */}
              <div className="absolute top-12 left-12 w-16 h-8 bg-white" style={{ boxShadow: '8px 8px 0 0 white, 16px 0 0 0 white, -8px 8px 0 0 white' }} />
              <div className="absolute top-24 right-24 w-16 h-8 bg-white" style={{ boxShadow: '8px 8px 0 0 white, 16px 0 0 0 white, -8px 8px 0 0 white' }} />
              
              {/* Ground / Bushes */}
              <div className="absolute bottom-0 left-0 w-full h-20 bg-[#8bdc00] border-t-8 border-[#00a800] z-20 flex items-end">
                 <div className="w-full h-6 bg-[#00a800] opacity-50 mb-2" style={{ clipPath: 'polygon(0 100%, 5% 0, 10% 100%, 15% 0, 20% 100%, 25% 0, 30% 100%, 35% 0, 40% 100%, 45% 0, 50% 100%, 55% 0, 60% 100%, 65% 0, 70% 100%, 75% 0, 80% 100%, 85% 0, 90% 100%, 95% 0, 100% 100%)' }}></div>
              </div>
              
              {currentQ.options.map((opt: string, idx: number) => {
                const isSelected = answers[currentQuestionIdx] === idx;
                const isCorrect = idx === currentQ.correctAnswerIndex;
                const isRemoved = removedOptions.includes(idx);

                if (isRemoved) return null; // Duck flies away or disappears

                const path = duckPaths[idx % 4];
                
                let btnClass = "bg-white text-black border-4 border-black";
                if (feedback && isCorrect) btnClass = "bg-[#4ade80] text-black border-4 border-black";
                else if (feedback && isSelected && !isCorrect) btnClass = "bg-[#f87171] text-black border-4 border-black";
                else if (isSelected) btnClass = "bg-[#facc15] text-black border-4 border-black";

                return (
                  <motion.button
                    key={idx}
                    disabled={isAnswering || feedback !== null}
                    onClick={() => handleAnswer(idx)}
                    animate={{
                      left: path.x,
                      top: path.y,
                    }}
                    transition={{
                      duration: 15 + (idx % 2) * 5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className={`absolute flex flex-col items-center justify-center gap-2 active:scale-95 transition-colors z-10`}
                    style={{ width: '140px' }}
                  >
                    {/* Pixel Duck SVG */}
                    <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: idx % 2 === 0 ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.3))' }}>
                      <path d="M24 10h6v4h-6z" fill="#FC9838"/>
                      <path d="M14 6h10v8H14z" fill="#00A800"/>
                      <path d="M20 8h2v2h-2z" fill="#000"/>
                      <path d="M12 14h8v4h-8z" fill="#FFF"/>
                      <path d="M6 16h14v10H6z" fill="#000"/>
                      <path d="M8 18h8v6H8z" fill="#FFF"/>
                      <path d="M2 18h4v4H2z" fill="#000"/>
                    </svg>
                    
                    {/* The Box */}
                    <div className={`w-full p-2 font-mono text-[10px] md:text-xs font-black uppercase leading-tight ${btnClass}`} style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
                      {opt}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className={`grid gap-3 md:gap-4 ${quiz?.quizType === "true_false" ? "grid-cols-2" : "grid-cols-1"}`}>
              {currentQ.options.map((opt: string, idx: number) => {
                const isSelected = answers[currentQuestionIdx] === idx;
                const isCorrect = idx === currentQ.correctAnswerIndex;
                
                let buttonClass = "border-brand-navy/5 hover:border-brand-orange/30 hover:bg-brand-cream text-brand-navy/70";
                const isRemoved = removedOptions.includes(idx);

                if (isRemoved) {
                  buttonClass = "opacity-20 grayscale pointer-events-none border-transparent";
                } else if (feedback && isCorrect) {
                  buttonClass = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10";
                } else if (feedback && isSelected && !isCorrect) {
                  buttonClass = "border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-500/10";
                } else if (isSelected) {
                  buttonClass = "border-brand-orange bg-brand-orange/5 text-brand-orange shadow-lg shadow-brand-orange/10";
                }

                if (quiz?.quizType === "true_false") {
                  // Buzzer style for True/False
                  const isBenar = opt.toLowerCase() === "benar";
                  const baseColor = isBenar ? "emerald" : "red";
                  
                  let tfClass = `border-${baseColor}-500 text-${baseColor}-600 hover:bg-${baseColor}-50 hover:shadow-${baseColor}-500/20`;
                  if (feedback && isCorrect) tfClass = `bg-${baseColor}-500 text-white border-${baseColor}-600 shadow-xl shadow-${baseColor}-500/30`;
                  else if (feedback && isSelected && !isCorrect) tfClass = `bg-slate-200 text-slate-400 border-slate-300`;
                  else if (isSelected) tfClass = `bg-${baseColor}-100 border-${baseColor}-500 text-${baseColor}-700 shadow-inner`;
                  else if (feedback) tfClass = `opacity-50 grayscale`;

                  return (
                    <button
                      key={idx}
                      disabled={isAnswering || feedback !== null}
                      onClick={() => handleAnswer(idx)}
                      className={`p-8 md:p-12 rounded-[32px] text-center font-black text-2xl md:text-4xl transition-all border-4 active:scale-95 uppercase tracking-widest shadow-lg ${tfClass}`}
                    >
                      {opt}
                    </button>
                  );
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswering || feedback !== null || isRemoved}
                    onClick={() => handleAnswer(idx)}
                    className={`p-5 md:p-6 rounded-2xl text-left font-bold text-base md:text-lg transition-all border-2 active:scale-95 ${buttonClass}`}
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <span className={`w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-xs md:text-sm font-black transition-colors ${
                        isSelected ? "bg-brand-orange text-white" : 
                        feedback && isCorrect ? "bg-emerald-500 text-white" :
                        isRemoved ? "bg-transparent" :
                        "bg-brand-navy/5 text-brand-navy/40"
                      }`}>
                        {isRemoved ? <Ghost className="w-4 h-4 opacity-20" /> : String.fromCharCode(65 + idx)}
                      </span>
                      <span className="line-clamp-2">{isRemoved ? "???" : opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Skor Saat Ini</span>
              <span className="text-xl font-black text-brand-navy">{Object.values(answers).reduce((acc, val, i) => acc + (val === questions[i].correctAnswerIndex ? 10 : 0), 0)} XP</span>
            </div>
          </div>
          
          {isLastQuestion && feedback === null && (
            <button
              onClick={submitQuiz}
              disabled={answers[currentQuestionIdx] === undefined || isAnswering}
              className="bg-brand-orange text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50 active:scale-95"
            >
              Kumpulkan
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`px-8 py-4 rounded-2xl font-black text-white shadow-2xl flex items-center gap-3 ${feedback === "correct" ? "bg-emerald-500" : "bg-red-500"}`}>
              {feedback === "correct" ? (
                <>
                  <Trophy className="w-6 h-6" />
                  BENAR! +10 XP
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  KURANG TEPAT!
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
