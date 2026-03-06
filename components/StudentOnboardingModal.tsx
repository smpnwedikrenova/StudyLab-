"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { User, GraduationCap, Check, Sparkles, Palette, Smile, Crown } from "lucide-react";
import Avatar, { BASES, FACES, HATS } from "./Avatar";

export default function StudentOnboardingModal() {
  const { userData, updateProfile } = useAuth();
  const [name, setName] = useState(userData?.displayName || "");
  const [studentClass, setStudentClass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Character Creator State
  const [baseIdx, setBaseIdx] = useState(0);
  const [faceIdx, setFaceIdx] = useState(0);
  const [hatIdx, setHatIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"base" | "face" | "hat">("base");

  // If profile is already completed, don't show
  if (userData?.profileCompleted) return null;

  const avatarString = `${baseIdx}:${faceIdx}:${hatIdx}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentClass) return;

    setIsSubmitting(true);
    try {
      await updateProfile({
        displayName: name,
        avatar: avatarString,
        studentClass: studentClass
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-navy/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col md:flex-row"
        >
          {/* Left Side: Preview */}
          <div className="bg-brand-navy p-8 md:w-1/3 flex flex-col items-center justify-center text-center relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-4 left-4 rotate-12"><Sparkles className="w-8 h-8 text-white" /></div>
              <div className="absolute bottom-4 right-4 -rotate-12"><GraduationCap className="w-8 h-8 text-white" /></div>
            </div>
            
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-brand-orange/20 rounded-full blur-2xl animate-pulse" />
              <Avatar avatarString={avatarString} size="xl" className="relative z-10 border-4 border-white shadow-2xl" />
            </div>
            
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Karaktermu</h2>
            <p className="text-white/60 text-xs font-medium">Tunjukkan gayamu di papan peringkat!</p>
          </div>

          {/* Right Side: Controls */}
          <div className="flex-1 p-8 md:p-10 flex flex-col h-[80vh] md:h-auto overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest mb-2 ml-1">
                    Nama Panggilan
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi"
                      className="w-full pl-12 pr-4 py-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-brand-navy font-bold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-brand-navy/40 uppercase tracking-widest mb-2 ml-1">
                    Kelas
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20" />
                    <select
                      required
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-brand-navy font-bold transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Pilih Kelas</option>
                      {["7A", "7B", "7C", "7D", "7E", "7F", "7G", "7H", 
                        "8A", "8B", "8C", "8D", "8E", "8F", "8G", "8H", 
                        "9A", "9B", "9C", "9D", "9E", "9F", "9G", "9H"].map(cls => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Character Creator Tabs */}
              <div className="bg-brand-cream/30 p-1 rounded-2xl flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("base")}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "base" ? "bg-white text-brand-orange shadow-sm" : "text-brand-navy/40 hover:text-brand-navy"}`}
                >
                  <Palette className="w-4 h-4" /> Warna
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("face")}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "face" ? "bg-white text-brand-orange shadow-sm" : "text-brand-navy/40 hover:text-brand-navy"}`}
                >
                  <Smile className="w-4 h-4" /> Wajah
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("hat")}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "hat" ? "bg-white text-brand-orange shadow-sm" : "text-brand-navy/40 hover:text-brand-navy"}`}
                >
                  <Crown className="w-4 h-4" /> Aksesoris
                </button>
              </div>

              {/* Options Grid */}
              <div className="h-48 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === "base" && (
                  <div className="grid grid-cols-5 gap-3">
                    {BASES.map((color, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBaseIdx(idx)}
                        className={`aspect-square rounded-xl transition-all hover:scale-110 active:scale-95 border-4 ${color} ${baseIdx === idx ? "border-brand-orange shadow-lg" : "border-transparent"}`}
                      />
                    ))}
                  </div>
                )}
                {activeTab === "face" && (
                  <div className="grid grid-cols-6 gap-2">
                    {FACES.map((face, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFaceIdx(idx)}
                        className={`text-2xl aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 ${faceIdx === idx ? "bg-brand-orange/10 border-2 border-brand-orange shadow-sm" : "bg-brand-cream/50 hover:bg-brand-cream"}`}
                      >
                        {face}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === "hat" && (
                  <div className="grid grid-cols-6 gap-2">
                    {HATS.map((hat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setHatIdx(idx)}
                        className={`text-2xl aspect-square flex items-center justify-center rounded-xl transition-all hover:scale-110 active:scale-95 ${hatIdx === idx ? "bg-brand-orange/10 border-2 border-brand-orange shadow-sm" : "bg-brand-cream/50 hover:bg-brand-cream"}`}
                      >
                        {hat || "❌"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !name || !studentClass}
                className="w-full bg-brand-navy text-white font-black text-lg py-5 rounded-3xl hover:bg-brand-black transition-all shadow-xl shadow-brand-navy/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    Selesai & Masuk!
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
