"use client";

import { useState } from "react";
import { useAuth, Role } from "@/contexts/AuthContext";
import { GraduationCap, BookOpen } from "lucide-react";

const SUBJECTS = ["Prakarya","Matematika", "IPA", "IPS", "Bahasa Indonesia", "Informatika", "Bahasa Inggris", "PJOK", "Bahasa Jawa", "Pendidikan Pancasila" , "Pendidikan Agama"];

export default function Onboarding() {
  const { setRole, userData } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const handleComplete = async () => {
    if (!selectedRole) return;
    if (selectedRole === "Guru" && !selectedSubject) return;
    
    await setRole(selectedRole, selectedSubject);
  };

  if (userData?.role) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">Mengalihkan...</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-brand-cream">
      <div className="w-full max-w-md md:max-w-2xl px-4 py-8 md:py-12">
        <div className="bg-white rounded-[32px] md:rounded-[48px] shadow-2xl p-6 md:p-12 border border-brand-navy/5">
          <h1 className="text-2xl md:text-4xl font-black text-center mb-2 text-brand-navy tracking-tight">Selamat Datang di AksaraPlay!</h1>
          <p className="text-center text-brand-navy/60 mb-8 md:mb-12 font-medium">Pilih peran Anda untuk melanjutkan. Pilihan ini bersifat permanen.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 md:mb-12">
            <button
              onClick={() => setSelectedRole("Guru")}
              className={`flex flex-col items-center p-8 rounded-3xl border-2 transition-all active:scale-95 ${
                selectedRole === "Guru" 
                  ? "border-brand-orange bg-brand-orange/5 text-brand-orange shadow-lg shadow-brand-orange/10" 
                  : "border-brand-navy/5 hover:border-brand-orange/30 hover:bg-brand-cream text-brand-navy/40"
              }`}
            >
              <div className={`p-4 rounded-2xl mb-4 transition-colors ${selectedRole === "Guru" ? "bg-brand-orange text-white" : "bg-brand-navy/5"}`}>
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black">Guru</h2>
              <p className="text-sm text-center mt-2 font-medium opacity-80">Buat kuis dan kelola ruangan untuk siswa Anda.</p>
            </button>
            
            <button
              onClick={() => setSelectedRole("Siswa")}
              className={`flex flex-col items-center p-8 rounded-3xl border-2 transition-all active:scale-95 ${
                selectedRole === "Siswa" 
                  ? "border-brand-navy bg-brand-navy/5 text-brand-navy shadow-lg shadow-brand-navy/10" 
                  : "border-brand-navy/5 hover:border-brand-navy/30 hover:bg-brand-cream text-brand-navy/40"
              }`}
            >
              <div className={`p-4 rounded-2xl mb-4 transition-colors ${selectedRole === "Siswa" ? "bg-brand-navy text-white" : "bg-brand-navy/5"}`}>
                <GraduationCap className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black">Siswa</h2>
              <p className="text-sm text-center mt-2 font-medium opacity-80">Bergabung ke ruangan, kerjakan kuis, dan jelajahi materi.</p>
            </button>
          </div>

          {selectedRole === "Guru" && (
            <div className="mb-8 md:mb-12 animate-in fade-in slide-in-from-bottom-4">
              <label className="block text-xs font-black text-brand-navy/40 uppercase tracking-widest mb-3 ml-1">
                Pilih Mata Pelajaran Anda
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-5 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange focus:bg-white outline-none text-brand-navy font-bold transition-all appearance-none"
              >
                <option value="" disabled>Pilih mata pelajaran...</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={!selectedRole || (selectedRole === "Guru" && !selectedSubject)}
            className="w-full bg-brand-navy text-white font-black text-xl py-5 rounded-3xl hover:bg-brand-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-navy/20 active:scale-95"
          >
            Selesaikan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}
