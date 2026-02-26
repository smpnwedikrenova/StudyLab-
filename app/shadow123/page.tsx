"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@studylab.com");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-semibold mb-4">Login Admin</h1>

        <input
          className="border p-2 w-full mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="border p-2 w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Login
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
