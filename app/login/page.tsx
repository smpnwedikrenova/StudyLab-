"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Presentation, User, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"guru" | "siswa" | "">("");
  const [loading, setLoading] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const openAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const handleLogin = async () => {
    if (!selectedRole) {
      openAlert("Pilih login sebagai siapa dulu.");
      return;
    }

    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // USER BARU → pending
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName,
          role: "pending",
          createdAt: serverTimestamp(),
        });

        openAlert("Akun Anda sedang menunggu persetujuan admin.");
        router.push("/waiting-approval");
        return;
      }

      const role = snap.data().role;

      // Jika masih pending
      if (role === "pending") {
        openAlert("Akun Anda masih menunggu persetujuan admin.");
        router.push("/waiting-approval");
        return;
      }

      // Redirect sesuai role dari admin
      router.push(`/${role}`);
    } catch (error: any) {
      console.error("Login Error:", error);
      openAlert(error.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center relative">
      <div className="w-full max-w-md min-h-screen bg-[#ECECEC] relative overflow-hidden">
        {/* Content */}
        <div className="px-6 pt-16 space-y-8 relative z-10">
          <button
            onClick={() => setSelectedRole("guru")}
            className={`w-full rounded-3xl py-6 px-6 shadow-lg flex items-center gap-5 transition-all duration-200
              ${
                selectedRole === "guru"
                  ? "bg-[#34495E] ring-4 ring-blue-300 scale-[1.02]"
                  : "bg-[#34495E]/90"
              }
            `}
          >
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <Presentation size={32} />
            </div>
            <span className="text-white text-lg font-semibold">
              Masuk sebagai guru
            </span>
          </button>

          <button
            onClick={() => setSelectedRole("siswa")}
            className={`w-full rounded-3xl py-6 px-6 shadow-lg flex items-center gap-5 transition-all duration-200
              ${
                selectedRole === "siswa"
                  ? "bg-orange-500 ring-4 ring-orange-300 scale-[1.02]"
                  : "bg-orange-500/90"
              }
            `}
          >
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <User size={32} />
            </div>
            <span className="text-white text-lg font-semibold">
              Masuk sebagai siswa
            </span>
          </button>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 320" className="w-full">
            <path
              fill="#34495E"
              d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,197.3C672,192,768,128,864,122.7C960,117,1056,171,1152,192C1248,213,1344,203,1392,197.3L1440,192L1440,320L0,320Z"
            />
          </svg>

          <div className="bg-[#34495E] pb-12 pt-6 px-6">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-orange-500 rounded-3xl py-6 px-6 shadow-xl flex items-center justify-center gap-4 transition disabled:opacity-60"
            >
              <LogIn size={22} className="text-white" />
              <span className="text-white text-lg font-semibold">
                {loading ? "Memproses..." : "Masuk Dengan Google"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL ALERT ================= */}
      {showAlert && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white w-[85%] max-w-sm rounded-3xl p-6 shadow-2xl text-center animate-scaleIn">
            <h2 className="text-lg font-bold text-[#34495E] mb-3">
              Pemberitahuan
            </h2>

            <p className="text-gray-600 mb-6">{alertMessage}</p>

            <button
              onClick={() => setShowAlert(false)}
              className="w-full bg-orange-500 text-white py-3 rounded-2xl font-semibold shadow-md active:scale-[0.97] transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Animation */}
      <style jsx>{`
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
