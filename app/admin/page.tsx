"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { User } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const list: any[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setUsers(list);
    });

    return () => unsub();
  }, []);

  const changeRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, "users", uid), { role });
    alert(`Role berhasil diubah ke ${role}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-lg font-bold mb-4">Hi, Admin</h1>

        <div className="space-y-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl shadow p-4 flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                <User size={20} />
              </div>

              {/* User Info */}
              <div className="flex-1">
                {/* EMAIL DIPERTEBAL & DIPERBESAR */}
                <p className="font-extrabold text-base text-black tracking-wide">
                  {u.email}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Role : <span className="font-semibold">{u.role}</span>
                </p>

                {/* Buttons */}
                <div className="flex mt-3 overflow-hidden rounded-lg border">
                  <button
                    onClick={() => changeRole(u.id, "guru")}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 font-semibold transition"
                  >
                    Guru
                  </button>

                  <button
                    onClick={() => changeRole(u.id, "siswa")}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1.5 font-semibold transition"
                  >
                    Siswa
                  </button>
                </div>
              </div>

              {/* Delete icon */}
              <button className="text-red-500 text-sm">🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}