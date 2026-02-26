"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function WaitingPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);

      const unsubscribeDoc = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;

        const role = snap.data().role;

        // Jika admin sudah set role
        if (role === "guru" || role === "siswa") {
          router.push(`/${role}`);
        }
      });

      return () => unsubscribeDoc();
    });

    return () => unsub();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-xl font-semibold">
        Akun Anda menunggu persetujuan admin...
      </h1>
    </div>
  );
}
