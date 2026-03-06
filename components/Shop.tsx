"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "motion/react";
import { ShoppingBag, Diamond, Check, AlertCircle, Loader2 } from "lucide-react";

export const SHOP_ITEMS = [
  {
    id: "exp_bottle",
    name: "Ramuan Pintar",
    description: "Langsung nambah 45 XP buat naikin levelmu.",
    price: 30,
    icon: "🧪",
    color: "bg-purple-500"
  },
  {
    id: "clear_answers",
    name: "Sapu Bersih",
    description: "Hapus 2 pilihan jawaban yang salah saat kuis.",
    price: 50,
    icon: "🧹",
    color: "bg-blue-500"
  },
  {
    id: "phoenix_feather",
    name: "Bulu Penyelamat",
    description: "Bikin kamu kebal dari 1 jawaban salah (Maks 5x per kuis).",
    price: 80,
    icon: "🪶",
    color: "bg-indigo-500"
  },
  {
    id: "golden_apple",
    name: "Apel Emas",
    description: "Dapet Diamond & XP 2x lipat di satu kuis penuh!",
    price: 150,
    icon: "🍎",
    color: "bg-red-500"
  }
];

export default function Shop() {
  const { userData, buyItem, updateProfile } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (item: typeof SHOP_ITEMS[0]) => {
    setLoadingId(item.id);
    setError(null);
    try {
      // If it's an ExpBottle, we award XP and don't necessarily need to store it in inventory
      // but for consistency with the "Dimiliki" display, we can store it then consume it.
      // Or just award XP directly and skip inventory for this specific item.
      
      if (item.id === "exp_bottle") {
        if ((userData?.diamonds || 0) < item.price) throw new Error("Diamond tidak cukup!");
        
        // Direct update for ExpBottle
        await updateProfile({
          xp: (userData?.xp || 0) + 45,
          diamonds: (userData?.diamonds || 0) - item.price
        });
      } else {
        await buyItem(item.id, item.price);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-brand-orange" />
          <h2 className="text-xl font-black text-brand-navy tracking-tight">Toko Item</h2>
        </div>
        <div className="flex items-center gap-2 bg-brand-navy text-white px-4 py-2 rounded-2xl shadow-lg">
          <Diamond className="w-4 h-4 text-sky-400 fill-current" />
          <span className="font-black text-sm">{userData?.diamonds || 0}</span>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {SHOP_ITEMS.map((item) => {
          const ownedCount = userData?.inventory?.[item.id] || 0;
          const canAfford = (userData?.diamonds || 0) >= item.price;

          return (
            <div 
              key={item.id}
              className="bg-white p-5 rounded-[32px] border border-brand-navy/5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
            >
              <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              
              <div className="flex-1">
                <h3 className="font-black text-brand-navy text-lg leading-tight">{item.name}</h3>
                <p className="text-brand-navy/60 text-xs font-medium mb-1">{item.description}</p>
                <div className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">
                  Dimiliki: {ownedCount}
                </div>
              </div>

              <div className="text-right space-y-2">
                <div className="flex items-center justify-end gap-1.5 text-brand-navy font-black">
                  <Diamond className="w-4 h-4 text-sky-400 fill-current" />
                  <span>{item.price}</span>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={loadingId === item.id || !canAfford}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                    canAfford 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" 
                      : "bg-brand-cream text-brand-navy/20 cursor-not-allowed"
                  }`}
                >
                  {loadingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Beli"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
