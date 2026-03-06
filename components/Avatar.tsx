"use client";

import { motion } from "motion/react";

interface AvatarProps {
  avatarString?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const BASES = [
  "bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-emerald-400", 
  "bg-sky-400", "bg-indigo-400", "bg-violet-400", "bg-fuchsia-400",
  "bg-slate-800", "bg-brand-navy", "bg-brand-orange"
];

const FACES = [
  "😀", "😎", "🤓", "🧐", "🥳", "🤠", "🤩", "😇",
  "🦁", "🐯", "🦊", "🐻", "🐼", "🐨", "🐹", "🐰",
  "🐉", "🦄", "🦉", "🐧", "🐸", "🐙", "🦋", "🐝"
];

const HATS = [
  "", "👑", "🎩", "🎓", "⛑️", "👒", "🧢", "🎒", 
  "✨", "🔥", "🌈", "⭐", "🍀", "💎", "🎸", "🎮"
];

export default function Avatar({ avatarString = "0:0:0", size = "md", className = "" }: AvatarProps) {
  const safeAvatarString = avatarString || "0:0:0";
  const [baseIdx, faceIdx, hatIdx] = safeAvatarString.split(":").map(Number);
  
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-20 h-20 text-4xl",
    xl: "w-32 h-32 text-6xl"
  };

  const baseColor = BASES[baseIdx] || BASES[0];
  const face = FACES[faceIdx] || FACES[0];
  const hat = HATS[hatIdx] || "";

  return (
    <div className={`relative flex items-center justify-center rounded-[30%] shadow-inner ${sizeClasses[size]} ${baseColor} ${className}`}>
      <motion.span 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="z-10"
      >
        {face}
      </motion.span>
      {hat && (
        <motion.span 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-[20%] -right-[10%] z-20 pointer-events-none"
          style={{ fontSize: "0.6em" }}
        >
          {hat}
        </motion.span>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-[30%] pointer-events-none" />
    </div>
  );
}

export { BASES, FACES, HATS };
