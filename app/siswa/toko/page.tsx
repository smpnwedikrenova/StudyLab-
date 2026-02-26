"use client";

import React from "react";
import { ArrowLeft, ShoppingCart, Gift, User } from "lucide-react";
import { useRouter } from "next/navigation";

const TokoPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md bg-[#D9D9D9] min-h-screen px-5 pt-5">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1743327608361-698da1c56900?q=80&w=687"
              className="w-11 h-11 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold">Halo, Sasa</p>
              <p className="text-xs text-gray-600">kelas 8A</p>
            </div>
          </div>

          {/* BACK BUTTON */}
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#2F3E4E] rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* STATISTIK SAMA DENGAN HOME SISWA */}
        <div className="bg-[#42576D] rounded-2xl p-3 text-white mb-5 border-2 border-blue-400 shadow-lg">
          <p className="text-center text-sm font-semibold mb-2">Statistik</p>
          <div className="h-[1px] bg-white/20 mb-2"></div>

          <div className="grid grid-cols-3 text-center">
            <StatItem title="Level" value="1" />
            <StatItem title="Total Nilai" value="150" />
            <StatItem title="Uang" value="50" />
          </div>
        </div>

        {/* MENU TOKO */}
        <div className="space-y-4">
          <MenuButton icon={<ShoppingCart size={22} />} label="Toko" color="bg-[#2F3E4E]" />
          <MenuButton icon={<Gift size={22} />} label="Item" color="bg-orange-500" />
          <MenuButton icon={<User size={22} />} label="Avatar" color="bg-orange-500" />
        </div>

      </div>
    </div>
  );
};

/* STAT ITEM SAMA DENGAN SISWA HOME */
const StatItem = ({ title, value }: { title: string; value: string }) => (
  <div>
    <p className="text-gray-300 text-[11px]">{title}</p>
    <p className="text-orange-400 font-extrabold text-lg">{value}</p>
  </div>
);

/* MENU BUTTON SAMA DENGAN SISWA HOME */
const MenuButton = ({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) => (
  <button
    className={`w-full ${color} rounded-3xl py-5 px-5 flex items-center gap-4 shadow-lg active:scale-95 transition`}
  >
    <div className="w-12 h-12 bg-[#2F3E4E] rounded-full flex items-center justify-center text-white">
      {icon}
    </div>
    <span className="text-white font-semibold text-lg">{label}</span>
  </button>
);

export default TokoPage;