"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex justify-center">
      {/* Wrapper mobile */}
      <div className="w-full max-w-md min-h-screen bg-[#3B5166] flex flex-col justify-between">

        {/* Logo */}
        <div className="flex flex-col items-center mt-40">
          <h1 className="text-5xl font-bold text-black">Study</h1>
          <h1 className="text-5xl font-bold text-black ml-12">Lab</h1>

          <div className="w-40 h-1 bg-black rounded-full mt-4"></div>
        </div>

        {/* Bottom white wave */}
        <div className="bg-[#ECECEC] rounded-t-[40px] p-6 flex justify-center">
          <button
            onClick={() => router.push("/login")}
            className="bg-orange-500 text-white px-12 py-3 rounded-full shadow-lg active:scale-95 transition"
          >
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
}