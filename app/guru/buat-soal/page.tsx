"use client";

import { useState } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BuatSoalGuru() {
  const router = useRouter();
  const [jumlahSoal, setJumlahSoal] = useState("");
  const [materi, setMateri] = useState("");
  const [mode, setMode] = useState<"manual" | "ai" | "">("");
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi untuk menangani pembuatan soal dengan AI
  const handleBuatSoalAI = async () => {
    if (!jumlahSoal || !materi) {
      alert("Mohon isi jumlah soal dan materi pelajaran terlebih dahulu!");
      return;
    }

    setMode("ai");
    setIsLoading(true);

    try {
      // Di sini nantinya Anda melakukan FETCH ke backend Anda yang terhubung dengan Gemini API
      // Contoh:
      // const res = await fetch("/api/generate-room", { 
      //   method: "POST", 
      //   body: JSON.stringify({ jumlahSoal, materi }) 
      // });
      // const data = await res.json();
      // const roomCode = data.roomCode;

      // SIMULASI PROSES AI (Hapus ini jika API backend sudah siap)
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulasi loading 3 detik
      const mockRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // Contoh hasil: "A7X9BQ"

      // Redirect guru ke halaman ruang tunggu (waiting room) dengan kode ruangan
      router.push(`/guru/waiting-room/${mockRoomCode}`);
    } catch (error) {
      console.error("Gagal membuat soal AI:", error);
      alert("Terjadi kesalahan saat menghubungi AI.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-[#ECECEC] px-6 pt-8">
        
        <div className="bg-[#34495E] rounded-3xl p-6 mb-6 text-white shadow-lg">
          {/* Input Materi */}
          <div className="mb-4">
            <p className="text-sm mb-2 font-medium">Topik / Materi Pelajaran</p>
            <input
              type="text"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Contoh: Sejarah Kemerdekaan RI"
              className="w-full px-4 py-3 rounded-xl text-black font-semibold text-md outline-none focus:ring-2 focus:ring-orange-400 transition"
              disabled={isLoading}
            />
          </div>

          {/* Input Jumlah Soal */}
          <div>
            <p className="text-sm mb-2 font-medium">Jumlah soal</p>
            <input
              type="number"
              min={0}
              max={100}
              value={jumlahSoal}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (e.target.value === "") {
                  setJumlahSoal("");
                  return;
                }
                if (value >= 0 && value <= 100) {
                  setJumlahSoal(e.target.value);
                }
              }}
              placeholder="Masukkan jumlah soal (0–100)"
              className="w-full px-4 py-3 rounded-xl text-black font-bold text-lg outline-none focus:ring-2 focus:ring-orange-400 transition"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Buat soal sendiri */}
        <button
          onClick={() => {
            setMode("manual");
            router.push(`/guru/soal-manual?jumlah=${jumlahSoal}&materi=${materi}`);
          }}
          disabled={isLoading}
          className={`w-full bg-[#34495E] hover:bg-[#2c3e50] rounded-2xl py-5 px-5 mb-4 flex items-center gap-4 transition
            ${mode === "manual" ? "ring-4 ring-orange-400 scale-[1.02]" : ""}
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
            <Plus className="text-white" />
          </div>
          <span className="text-white font-semibold">Buat soal sendiri</span>
        </button>

        {/* Buat soal AI */}
        <button
          onClick={handleBuatSoalAI}
          disabled={isLoading}
          className={`w-full bg-[#34495E] hover:bg-[#2c3e50] rounded-2xl py-5 px-5 flex items-center gap-4 transition
            ${mode === "ai" ? "ring-4 ring-blue-400 scale-[1.02]" : ""}
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 className="text-white animate-spin" />
            ) : (
              <Sparkles className="text-white" />
            )}
          </div>
          <span className="text-white font-semibold flex-1 text-left">
            {isLoading ? "Gemini sedang membuat soal..." : "Buat soal bantuan AI"}
          </span>
        </button>
      </div>
    </div>
  );
}