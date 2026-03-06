"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldCheck, Mail, Star, Diamond, Users, BookOpen, Trash2, Edit3, RotateCcw, X, Save, Search } from "lucide-react";
import Avatar from "@/components/Avatar";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const { userData, loading, user: currentUser } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Hardcoded admin email as requested
  const ADMIN_EMAIL = "irfandwi.hs@gmail.com";

  useEffect(() => {
    if (!loading && (!userData || userData.email !== ADMIN_EMAIL)) {
      router.push("/");
    }
  }, [userData, loading, router]);

  const fetchAllUsers = useCallback(async () => {
    if (userData?.email === ADMIN_EMAIL) {
      setFetching(true);
      try {
        const q = query(collection(db, "users"), orderBy("xp", "desc"));
        const snapshot = await getDocs(q);
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setFetching(false);
      }
    }
  }, [userData?.email]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", editingUser.id);
      const { id, ...updateData } = editingUser;
      await updateDoc(userRef, updateData);
      setAllUsers(prev => prev.map(u => u.id === id ? editingUser : u));
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Gagal memperbarui user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, role: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ini (${role}) secara permanen? Semua data terkait (riwayat, kuis, ruangan) DAN AKUN AUTHENTICATION akan dibersihkan.`)) return;
    try {
      // 1. Bersihkan sub-koleksi history
      const historyRef = collection(db, "users", userId, "history");
      const historySnap = await getDocs(historyRef);
      await Promise.all(historySnap.docs.map(d => deleteDoc(d.ref)));

      // 2. Jika Guru, bersihkan Kuis dan Ruangan miliknya
      if (role === "Guru") {
        // Hapus Kuis
        const quizzesRef = collection(db, "quizzes");
        const qQuizzes = query(quizzesRef, where("guruId", "==", userId));
        const quizzesSnap = await getDocs(qQuizzes);
        await Promise.all(quizzesSnap.docs.map(d => deleteDoc(d.ref)));

        // Hapus Ruangan & Leaderboard-nya
        const roomsRef = collection(db, "rooms");
        const qRooms = query(roomsRef, where("guruId", "==", userId));
        const roomsSnap = await getDocs(qRooms);
        
        for (const roomDoc of roomsSnap.docs) {
          const lbRef = collection(db, "rooms", roomDoc.id, "leaderboard");
          const lbSnap = await getDocs(lbRef);
          await Promise.all(lbSnap.docs.map(d => deleteDoc(d.ref)));
          await deleteDoc(roomDoc.ref);
        }
      }

      // 3. Hapus dokumen user utama di Firestore
      await deleteDoc(doc(db, "users", userId));

      // 4. Hapus dari Firebase Authentication via API
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userId, idToken })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn("Firestore data deleted, but Auth deletion failed:", errorData.error);
          alert(`Data Firestore terhapus, namun gagal menghapus akun Authentication: ${errorData.error}. Pastikan FIREBASE_SERVICE_ACCOUNT_KEY sudah dikonfigurasi.`);
        } else {
          alert("User dan seluruh data terkait (termasuk akun Authentication) berhasil dihapus bersih.");
        }
      }

      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Gagal menghapus user.");
    }
  };


  const handleResetUser = async (userId: string) => {
    if (!confirm("Reset XP, Diamond, dan Inventory user ini?")) return;
    try {
      const userRef = doc(db, "users", userId);
      const resetData = {
        xp: 0,
        diamonds: 0,
        quizzesPlayed: 0,
        inventory: {}
      };
      await updateDoc(userRef, resetData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...resetData } : u));
    } catch (error) {
      console.error("Error resetting user:", error);
      alert("Gagal mereset user.");
    }
  };

  if (loading || fetching || userData?.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full mb-4"
        />
        <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Verifying Access...</p>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: allUsers.length,
    guru: allUsers.filter(u => u.role === "Guru").length,
    siswa: allUsers.filter(u => u.role === "Siswa").length,
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6 md:p-10 font-sans selection:bg-brand-orange selection:text-white">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-brand-navy text-white rounded-[24px] shadow-2xl shadow-brand-navy/20 rotate-3">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-brand-navy tracking-tight italic font-serif">Master Control</h1>
              <p className="text-brand-navy/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Users className="w-3 h-3" /> User Directory & CRUD
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            {[
              { label: "Total Users", value: stats.total, color: "brand-navy" },
              { label: "Guru", value: stats.guru, color: "brand-orange" },
              { label: "Siswa", value: stats.siswa, color: "sky-500" }
            ].map((stat, i) => (
              <div key={i} className="flex-1 md:w-32 bg-white px-5 py-4 rounded-[24px] shadow-sm border border-brand-navy/5 text-center">
                <div className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest mb-1">{stat.label}</div>
                <div className={`text-2xl font-black text-${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-navy/20" />
          <input 
            type="text"
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-brand-navy/5 shadow-sm focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
          />
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-brand-navy/5 border border-brand-navy/5 overflow-hidden">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-6 bg-brand-navy text-white/40 text-[9px] font-black uppercase tracking-widest">
            <div className="col-span-4">User Profile</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2 text-center">Performance</div>
            <div className="col-span-2 text-center">Economy</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-brand-navy/5">
            {filteredUsers.map((user, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                key={user.id} 
                className="flex flex-col md:grid md:grid-cols-12 gap-4 p-6 hover:bg-brand-cream/30 transition-colors group relative"
              >
                <div className="md:col-span-4 flex items-center gap-4">
                  <Avatar avatarString={user.avatar} size="md" className="shadow-md group-hover:scale-110 transition-transform" />
                  <div className="overflow-hidden">
                    <div className="font-black text-brand-navy truncate text-sm md:text-base">{user.displayName || "Anonymous"}</div>
                    <div className="text-[11px] text-brand-navy/40 truncate flex items-center gap-1 font-medium">
                      <Mail className="w-3 h-3" /> {user.email}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                  <span className="md:hidden text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Role:</span>
                  <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                    user.role === "Guru" ? "bg-brand-orange/5 border-brand-orange text-brand-orange" : 
                    user.role === "Siswa" ? "bg-brand-navy/5 border-brand-navy text-brand-navy" : 
                    "bg-slate-50 border-slate-200 text-slate-400"
                  }`}>
                    {user.role || "Unset"}
                  </span>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                  <span className="md:hidden text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Performance:</span>
                  <div className="flex flex-col items-end md:items-center">
                    <div className="flex items-center gap-1 text-brand-orange font-black text-sm">
                      <Star className="w-3 h-3 fill-current" /> {user.xp || 0}
                    </div>
                    <div className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">
                      {user.quizzesPlayed || 0} Quizzes
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                  <span className="md:hidden text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">Economy:</span>
                  <div className="flex flex-col items-end md:items-center">
                    <div className="flex items-center justify-center gap-1 text-sky-500 font-black text-sm">
                      <Diamond className="w-3 h-3 fill-current" /> {user.diamonds || 0}
                    </div>
                    <div className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">
                      {Object.keys(user.inventory || {}).length} Items
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-brand-navy/5">
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="flex-1 md:flex-none p-3 md:p-2 flex justify-center items-center text-brand-navy/40 hover:text-brand-orange hover:bg-brand-orange/5 rounded-xl transition-all bg-brand-navy/5 md:bg-transparent"
                    title="Edit User"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleResetUser(user.id)}
                    className="flex-1 md:flex-none p-3 md:p-2 flex justify-center items-center text-brand-navy/40 hover:text-sky-500 hover:bg-sky-50 rounded-xl transition-all bg-brand-navy/5 md:bg-transparent"
                    title="Reset Stats"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id, user.role)}
                    className="flex-1 md:flex-none p-3 md:p-2 flex justify-center items-center text-brand-navy/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all bg-brand-navy/5 md:bg-transparent"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <footer className="mt-10 text-center">
          <p className="text-[10px] font-black text-brand-navy/20 uppercase tracking-[0.3em]">
            AksaraPlay Internal Management System • Confidential
          </p>
        </footer>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-brand-navy tracking-tight italic font-serif">Edit User</h2>
                  <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-brand-cream rounded-full transition-colors">
                    <X className="w-6 h-6 text-brand-navy/20" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Display Name</label>
                      <input 
                        type="text"
                        value={editingUser.displayName || ""}
                        onChange={e => setEditingUser({...editingUser, displayName: e.target.value})}
                        className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Role</label>
                      <select 
                        value={editingUser.role || ""}
                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
                      >
                        <option value="">Unset</option>
                        <option value="Guru">Guru</option>
                        <option value="Siswa">Siswa</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">XP</label>
                      <input 
                        type="number"
                        value={editingUser.xp || 0}
                        onChange={e => setEditingUser({...editingUser, xp: parseInt(e.target.value) || 0})}
                        className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Diamonds</label>
                      <input 
                        type="number"
                        value={editingUser.diamonds || 0}
                        onChange={e => setEditingUser({...editingUser, diamonds: parseInt(e.target.value) || 0})}
                        className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Class / Subject</label>
                    <input 
                      type="text"
                      value={editingUser.role === "Guru" ? (editingUser.subject || "") : (editingUser.studentClass || "")}
                      onChange={e => setEditingUser({
                        ...editingUser, 
                        [editingUser.role === "Guru" ? "subject" : "studentClass"]: e.target.value
                      })}
                      className="w-full p-4 bg-brand-cream/50 border-2 border-transparent rounded-2xl focus:border-brand-orange outline-none transition-all font-bold text-brand-navy"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-brand-navy text-white font-black py-5 rounded-3xl hover:bg-brand-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : <><Save className="w-5 h-5" /> Simpan Perubahan</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
