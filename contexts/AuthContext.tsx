"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

// 1. TAMBAHKAN "Admin" KE DALAM ROLE
export type Role = "Guru" | "Siswa" | "Admin" | null;

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  subject?: string;
  xp?: number;
  quizzesPlayed?: number;
  avatar?: string;
  studentClass?: string;
  profileCompleted?: boolean;
  diamonds?: number;
  inventory?: Record<string, number>;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role, subject?: string) => Promise<void>;
  updateProfile: (data: Partial<UserData>) => Promise<void>;
  buyItem: (itemId: string, price: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          setUserData(data);
          
          // 2. LOGIKA ROUTING YANG DIPERBAIKI
          if (!data.role && pathname !== "/onboarding") {
            router.push("/onboarding");
          } else if (data.role) {
            const isSiswaRoute = pathname.startsWith("/siswa") || pathname.startsWith("/room/siswa");
            const isGuruRoute = pathname.startsWith("/guru") || pathname.startsWith("/room/guru");
            const isAdminRoute = pathname.startsWith("/admin-rahasia");

            // Jika Admin, biarkan dia di halaman admin, atau arahkan ke sana jika dari home
            if (data.role === "Admin") {
              if (pathname === "/" || pathname === "/onboarding") {
                router.push("/admin-rahasia");
              }
            } 
            // Jika Guru mencoba masuk ke halaman siswa, kembalikan ke guru
            else if (data.role === "Guru" && (isSiswaRoute || isAdminRoute)) {
              router.push("/guru");
            } 
            // Jika Siswa mencoba masuk ke halaman guru/admin, kembalikan ke siswa
            else if (data.role === "Siswa" && (isGuruRoute || isAdminRoute)) {
              router.push("/siswa");
            } 
            // Jika di halaman awal, arahkan sesuai role
            else if (pathname === "/" || pathname === "/onboarding") {
              router.push(data.role === "Guru" ? "/guru" : "/siswa");
            }
          }
        } else {
          // 3. CEK EMAIL ADMIN SAAT PERTAMA KALI LOGIN
          const isDefaultAdmin = currentUser.email === 'smpnwedikrenova@gmail.com' || currentUser.email === 'irfandwi.hs@gmail.com';
          
          const newUserData: UserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: isDefaultAdmin ? "Admin" : null, // Langsung jadi Admin jika email cocok
            xp: 0,
            diamonds: 0,
            quizzesPlayed: 0,
            inventory: {}
          };
          
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
          
          // Jika Admin, langsung ke admin. Jika bukan, ke onboarding
          if (isDefaultAdmin) {
            router.push("/admin-rahasia");
          } else if (pathname !== "/onboarding") {
            router.push("/onboarding");
          }
        }
      } else {
        setUserData(null);
        if (pathname !== "/") {
          router.push("/");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const setRole = async (role: Role, subject?: string) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const updatedData: Partial<UserData> = { role };
    if (role === "Guru" && subject) {
      updatedData.subject = subject;
    }
    await setDoc(userDocRef, updatedData, { merge: true });
    setUserData((prev) => prev ? { ...prev, ...updatedData } : null);
    
    // Arahkan sesuai role yang baru dipilih
    if (role === "Admin") router.push("/admin-rahasia");
    else router.push(role === "Guru" ? "/guru" : "/siswa");
  };

  const updateProfile = async (data: Partial<UserData>) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { ...data, profileCompleted: true }, { merge: true });
    setUserData((prev) => prev ? { ...prev, ...data, profileCompleted: true } : null);
  };

  const buyItem = async (itemId: string, price: number) => {
    if (!user || !userData) return;
    const currentDiamonds = userData.diamonds || 0;
    if (currentDiamonds < price) throw new Error("Diamond tidak cukup!");

    const userDocRef = doc(db, "users", user.uid);
    const newInventory = { ...(userData.inventory || {}) };
    newInventory[itemId] = (newInventory[itemId] || 0) + 1;

    await updateDoc(userDocRef, {
      diamonds: increment(-price),
      inventory: newInventory
    });

    setUserData(prev => prev ? {
      ...prev,
      diamonds: (prev.diamonds || 0) - price,
      inventory: newInventory
    } : null);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, logout, setRole, updateProfile, buyItem }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);