"use client";

// MENGGUNAKAN CONTEXT LAMA ANDA
import { useAuth } from "@/contexts/AuthContext"; 
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Komponen SVG Kustom untuk Ikon Tabung Reaksi (Sesuai Gambar Anda)
const CustomFlaskIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
    {/* Gelembung di atas (luar tabung) */}
    <circle cx="42" cy="15" r="4" />
    <circle cx="50" cy="26" r="5" />
    
    {/* Garis luar tabung Erlenmeyer */}
    <path d="M60 32H40C37.8 32 36 33.8 36 36C36 38.2 37.8 40 40 40H41V52L22.6 77.8C20.6 80.6 22.6 85 26.1 85H73.9C77.4 85 79.4 80.6 77.4 77.8L59 52V40H60C62.2 40 64 38.2 64 36C64 33.8 62.2 32 60 32ZM71.2 79H28.8L47 53.5V40H53V53.5L71.2 79Z" />
    
    {/* Cairan di dalam tabung */}
    <path d="M34.5 71 Q 42 60, 50 68 T 65.5 71 L 71.2 79 H 28.8 Z" />
    
    {/* Gelembung di dalam cairan */}
    <circle cx="48" cy="65" r="4" />
    <circle cx="55" cy="56" r="3" />
    <circle cx="45" cy="48" r="2" />
  </svg>
);

export default function Home() {
  // Menggunakan signInWithGoogle dan userData dari AuthContext lama Anda
  const { signInWithGoogle, userData, loading } = useAuth();
  const router = useRouter();

  // Logika Redirect yang Benar
  useEffect(() => {
    // Jika userData sudah ada (berarti sudah login)
    if (userData) {
      if (userData.role === 'Admin') {
        router.push('/admin-rahasia');
      } else if (userData.role === 'Guru') {
        router.push('/guru'); // Arahkan ke halaman guru
      } else if (userData.role === 'Siswa') {
        router.push('/siswa'); // Arahkan ke halaman siswa
      }
    }
  }, [userData, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-navy text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full mb-4"
        />
        <p className="text-white/60 font-bold tracking-widest uppercase text-xs animate-pulse">Memuat Petualangan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background Image from Attachment */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/home-bg.png" 
          alt="Background"
          fill
          className="object-cover opacity-60"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/40 via-transparent to-brand-navy/80" />
      </div>

      {/* Container for the "Phone" view on desktop, full screen on mobile */}
      <div className="w-full max-w-[500px] h-full min-h-screen flex flex-col items-center justify-between relative z-10">
        {/* Top Section: Logo (Updated to StudyLab) */}
        <div className="pt-12 md:pt-16 z-10 flex flex-col items-center">
          <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white leading-none drop-shadow-2xl">
            STUDY
          </h1>
          <div className="flex items-center gap-2 mt-[-10px]">
            <div className="relative">
              {/* Menggunakan Custom SVG Icon di sini */}
              <CustomFlaskIcon className="w-18 h-18 md:w-22 md:h-22 text-brand-orange drop-shadow-lg" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-4 bg-brand-orange rounded-sm opacity-60 blur-[2px]" />
            </div>
            <span className="text-6xl md:text-7xl font-black tracking-tight text-brand-orange drop-shadow-2xl">Lab</span>
          </div>
        </div>
 
        {/* Middle Section: Empty (Background image provides the illustration) */}
        <div className="flex-1" />

        {/* Bottom Section: White Panel */}
        <div className="w-full bg-white/95 backdrop-blur-sm rounded-t-[40px] md:rounded-t-[50px] pt-8 pb-8 md:pt-12 md:pb-10 px-8 md:px-10 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <button
            // Menggunakan signInWithGoogle dari AuthContext lama Anda
            onClick={signInWithGoogle}
            className="w-full bg-brand-orange text-white font-black text-xl md:text-2xl py-5 md:py-6 rounded-full shadow-xl shadow-brand-orange/30 active:scale-95 transition-all hover:brightness-110"
          >
            Masuk
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}