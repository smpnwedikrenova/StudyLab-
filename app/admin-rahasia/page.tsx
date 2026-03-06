'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LayoutGrid, User, SquarePen, Presentation, GraduationCap, Trash2 } from 'lucide-react';
// UBAH IMPORT INI
import { useAuth } from '@/contexts/AuthContext'; 
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  uid: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  // UBAH PENGAMBILAN DATA INI (gunakan userData dan logout)
  const { userData, loading, logout } = useAuth();
  const router = useRouter();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    // Cek role dari userData
    if (!loading && userData?.role !== 'Admin') {
      router.push('/');
    }
  }, [userData, loading, router]);

  useEffect(() => {
    if (userData?.role === 'Admin') {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserData[];
        setUsers(usersData);
      }, (error) => {
        console.error("Error fetching users:", error);
      });

      return () => unsubscribe();
    }
  }, [userData]);

  const toggleEdit = (id: string) => {
    setExpandedUserId(expandedUserId === id ? null : id);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      setExpandedUserId(null);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Gagal mengubah role.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setExpandedUserId(null);
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Gagal menghapus pengguna.");
      }
    }
  };

  if (loading || userData?.role !== 'Admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4]">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] p-6 font-sans text-gray-900 sm:max-w-md sm:mx-auto sm:shadow-2xl relative">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 mt-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm">
            <Image
              // Ganti user?.photoURL menjadi userData?.photoURL
              src={userData?.avatar || "https://picsum.photos/seed/admin/100/100"}
              alt="Admin Profile"
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Hi, Admin</h1>
        </div>
        <button onClick={logout} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors" title="Keluar">
          <LayoutGrid className="w-6 h-6" />
        </button>
      </header>

      {/* User List */}
      <div className="space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-[32px] p-6 shadow-sm">
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#E87C21] rounded-full flex items-center justify-center text-black shadow-inner">
                  <User className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm truncate max-w-[150px]">{u.email}</span>
              </div>
              <button
                onClick={() => toggleEdit(u.id)}
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <SquarePen className="w-5 h-5" />
              </button>
            </div>

            {/* Role Badge */}
            <div className="inline-flex items-center bg-[#F5F5F5] text-gray-500 text-[11px] font-medium px-4 py-1.5 rounded-full mb-2">
              Role : {u.role}
            </div>

            {/* Expanded Actions (Muncul jika tombol edit ditekan) */}
            {expandedUserId === u.id && (
              <div className="mt-6 space-y-3">
                <button 
                  onClick={() => handleChangeRole(u.id, 'Guru')}
                  className="w-full bg-[#E87C21] hover:bg-[#d66e1b] text-white rounded-2xl p-4 flex items-center gap-5 transition-transform active:scale-95"
                >
                  <Presentation className="w-8 h-8" />
                  <span className="font-medium text-sm">Jadikan Guru</span>
                </button>
                
                <button 
                  onClick={() => handleChangeRole(u.id, 'Siswa')}
                  className="w-full bg-[#E87C21] hover:bg-[#d66e1b] text-white rounded-2xl p-4 flex items-center gap-5 transition-transform active:scale-95"
                >
                  <GraduationCap className="w-8 h-8" />
                  <span className="font-medium text-sm">Jadikan Siswa</span>
                </button>
                
                <button 
                  onClick={() => handleDeleteUser(u.id)}
                  className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white rounded-2xl p-4 flex items-center gap-5 transition-transform active:scale-95"
                >
                  <Trash2 className="w-8 h-8" />
                  <span className="font-medium text-sm">Hapus Pengguna</span>
                </button>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-center text-gray-500 mt-8">Belum ada pengguna terdaftar.</p>
        )}
      </div>
    </div>
  );
}