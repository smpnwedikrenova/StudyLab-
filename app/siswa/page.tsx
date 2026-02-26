"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Award,
  ShoppingCart,
  BookOpen,
  FlaskConical,
  Globe,
  Scale,
  School,
  Tv2Icon,
  LaptopIcon,
  Book,
} from "lucide-react";

/* MAPEL LIST */
const subjects = [
  { id: "mtk", label: "Matematika", icon: BookOpen },
  { id: "ipa", label: "IPA", icon: FlaskConical },
  { id: "info", label: "Informatika", icon: LaptopIcon },
  { id: "bindo", label: "B.Indo", icon: Book },
  { id: "bing", label: "English", icon: Globe },
  { id: "ppkn", label: "Pendidikan", icon: Scale },
];

const SiswaHome = () => {
  const router = useRouter();
  const [showSubjects, setShowSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const SelectedIcon = selectedSubject.icon;

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
              <p className="text-sm font-semibold">Hi, Sasa</p>
              <p className="text-xs text-gray-600">kelas 8A</p>
            </div>
          </div>

          {/* ICON MAPEL */}
          <button
            onClick={() => setShowSubjects(!showSubjects)}
            className="w-11 h-11 bg-white border border-blue-400 rounded-full flex items-center justify-center shadow-sm"
          >
            <SelectedIcon size={20} className="text-blue-500" />
          </button>
        </div>

        {/* PANEL MAPEL (PUSH DOWN UI) */}
        {showSubjects && (
          <div className="bg-[#3E5266] rounded-3xl p-4 mb-4 shadow-2xl">
            <div className="grid grid-cols-3 gap-4 text-center text-white">
              {subjects.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedSubject(item);
                      setShowSubjects(false);
                    }}
                    className="flex flex-col items-center gap-1"
                  >
                    {/* ICON BOX */}
                    <div className="w-14 h-14 bg-[#EDEDED] rounded-2xl flex items-center justify-center shadow">
                      <Icon size={22} className="text-[#3E5266]" />
                    </div>

                    {/* LABEL */}
                    <span className="text-[11px] font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STATISTIK CARD */}
        <div className="bg-[#42576D] rounded-2xl p-3 text-white mb-5 border-2 border-blue-400 shadow-lg">
          <p className="text-center text-sm font-semibold mb-2">Statistik</p>
          <div className="h-[1px] bg-white/20 mb-2"></div>

          <div className="grid grid-cols-3 text-center">
            <StatItem title="Level" value="1" />
            <StatItem title="Total Nilai" value="0" />
            <StatItem title="Uang" value="50" />
          </div>
        </div>

        {/* BUTTON MENU */}
<div className="space-y-4">
  <MenuButton
    icon={<Play size={22} />}
    label="Mulai"
    onClick={() => router.push(`/siswa/join?mapel=${selectedSubject.id}`)}
  />

  <MenuButton
    icon={<Award size={22} />}
    label="Ranking"
    onClick={() => router.push("/siswa/ranking")}
  />

  <MenuButton
    icon={<ShoppingCart size={22} />}
    label="Toko"
    onClick={() => router.push("/siswa/toko")}
  />
</div>

      </div>
    </div>
  );
};

/* STAT ITEM */
const StatItem = ({ title, value }: { title: string; value: string }) => (
  <div>
    <p className="text-gray-300 text-[11px]">{title}</p>
    <p className="text-orange-400 font-extrabold text-lg">{value}</p>
  </div>
);

/* MENU BUTTON */
const MenuButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full bg-orange-500 rounded-3xl py-5 px-5 flex items-center gap-4 shadow-lg active:scale-95 transition"
  >
    <div className="w-12 h-12 bg-[#2F3E4E] rounded-full flex items-center justify-center text-white">
      {icon}
    </div>
    <span className="text-white font-semibold text-lg">{label}</span>
  </button>
);

export default SiswaHome;