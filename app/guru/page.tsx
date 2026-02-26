"use client";

import { Plus, Bookmark, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function GuruHome() {
  const router = useRouter();
  const [mapelUtama, setMapelUtama] = useState<string | null>(null);
  const [uid, setUid] = useState<string>("");

  const daftarMapel = [
    "Matematika",
    "Bahasa Indonesia",
    "IPA",
    "IPS",
    "Bahasa Inggris",
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setMapelUtama(snap.data().mapelUtama || null);
        }
      }
    });

    return () => unsub();
  }, []);

  const pilihMapel = async (mapel: string) => {
    await updateDoc(doc(db, "users", uid), {
      mapelUtama: mapel,
    });
    setMapelUtama(mapel);
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-[#ECECEC] px-6 pt-6 pb-10 relative">

        {/* ===== POPUP PILIH MAPEL ===== */}
        {!mapelUtama && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-80">
              <h2 className="text-lg font-bold mb-4 text-center">
                Pilih Mapel Utama
              </h2>
              <div className="space-y-3">
                {daftarMapel.map((mapel) => (
                  <button
                    key={mapel}
                    onClick={() => pilihMapel(mapel)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {mapel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== Header (TETAP SAMA) ===== */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <img
              src="https://i.pravatar.cc/100"
              alt="profile"
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                Hi, Guru Sasa
              </h1>
              {mapelUtama && (
                <p className="text-xs text-gray-500">
                  Mapel: {mapelUtama}
                </p>
              )}
            </div>
          </div>

          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <LayoutDashboard size={20} className="text-gray-600" />
          </div>
        </div>

        {/* ===== Buat Ruangan (TETAP SAMA) ===== */}
        <MenuCard
          icon={<Plus size={28} className="text-white" />}
          label="Buat Ruangan"
          onClick={() => router.push("/guru/buat-soal")}
        />

        {/* ===== Riwayat Ruangan (TETAP SAMA) ===== */}
        <MenuCard
          icon={<Bookmark size={26} className="text-white" />}
          label="Riwayat Ruangan"
        />
      </div>
    </div>
  );
}

interface MenuCardProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function MenuCard({ icon, label, onClick }: MenuCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#34495E] rounded-3xl py-8 px-6 mb-8 shadow-lg flex items-center gap-6 active:scale-[0.98] transition"
    >
      <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
        {icon}
      </div>
      <span className="text-white text-lg font-semibold tracking-wide">
        {label}
      </span>
    </button>
  );
}