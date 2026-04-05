"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

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
  studentAbsen?: string;
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
          if (!data.role && pathname !== "/onboarding") {
            router.push("/onboarding");
          } else if (data.role && (pathname === "/" || pathname === "/onboarding")) {
            router.push(data.role === "Guru" ? "/guru" : "/siswa");
          }
        } else {
          // New user, create empty doc
          const newUserData: UserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            role: null,
            xp: 0,
            diamonds: 0,
            quizzesPlayed: 0,
            inventory: {}
          };
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
          if (pathname !== "/onboarding") {
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
    router.push(role === "Guru" ? "/guru" : "/siswa");
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
