"use client";

import React, { useRef, useState } from "react";
import { ArrowLeft, Play, Monitor, BookOpen, FlaskConical, Globe, School, Scale, Book, Laptop, LaptopIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const mapelIcons: any = {
  mtk: BookOpen,
  ipa: FlaskConical,
  info: LaptopIcon,
  bindo: Book,
  bing: Globe,
  ppkn: Scale,
};

const JoinRoom: React.FC = () => {
  const router = useRouter();
  const params = useSearchParams();

  // 🔥 ambil mapel dari URL
  const mapel = params.get("mapel") || "info";
  const IconMapel = mapelIcons[mapel] || Monitor;

  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md bg-[#E5E5E5] min-h-screen px-5 pt-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#2F3E4E] rounded-full flex items-center justify-center text-white"
          >
            <ArrowLeft size={20} />
          </button>

          {/* ICON MAPEL TERPILIH */}
          <div className="w-10 h-10 bg-white border border-blue-400 rounded-full flex items-center justify-center">
            <IconMapel size={18} className="text-blue-500" />
          </div>
        </div>

        {/* INPUT CODE */}
        <div className="flex justify-between mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
  if (el) inputsRef.current[index] = el;
}}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="
  w-14 h-16 
  text-center 
  text-3xl 
  font-black 
  text-black 
  rounded-xl 
  border-2 border-gray-500 
  focus:border-orange-500 
  focus:ring-2 focus:ring-orange-300 
  outline-none
"
            />
          ))}
        </div>

        {/* BUTTON */}
        <button className="w-full bg-orange-500 rounded-2xl py-4 flex items-center gap-3">
          <Play size={18} className="text-white" />
          <span className="text-white font-semibold">Bergabung</span>
        </button>

      </div>
    </div>
  );
};

export default JoinRoom;