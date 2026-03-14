'use client';

import { useState, useEffect } from 'react';
import { LayoutGrid, User, SquarePen, Presentation, GraduationCap, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';

interface UserData {
  id: string;
  uid: string;
  email: string;
  role: string;
  avatar?: string;
  displayName?: string;
}

export default function AdminPage() {
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Memuat Panel Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex justify-center">
      <div className="w-full max-w-md bg-[#F8F9FA] min-h-screen p-6 relative shadow-[0_0_40px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 mt-2">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl text-gray-900">Hi, Admin</h1>
          </div>
          <button 
            onClick={logout} 
            className="text-gray-500 hover:text-gray-700 transition-colors" 
            title="Keluar"
          >
            <LayoutGrid className="w-6 h-6" />
          </button>
        </header>

        {/* User List */}
        <div className="space-y-4 pb-20">
          {users.filter(u => u.role !== 'Admin').map(u => (
            <div key={u.id} className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#E87C1E] flex items-center justify-center text-gray-900 flex-shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-gray-800 truncate w-[160px]">
                    {u.email}
                  </span>
                </div>
                <button
                  onClick={() => toggleEdit(u.id)}
                  className="text-gray-600 hover:text-gray-900 p-1"
                >
                  <SquarePen className="w-5 h-5" />
                </button>
              </div>

              {/* Role Badge */}
              <div>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#F4F4F4] text-gray-500 text-[11px] font-medium">
                  Role : {u.role}
                </span>
              </div>

              {/* Expanded Actions */}
              {expandedUserId === u.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleChangeRole(u.id, 'Guru')}
                      className="bg-brand-navy hover:bg-black text-white rounded-2xl p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
                    >
                      <Presentation className="w-5 h-5" />
                      <span className="font-bold text-[10px] uppercase">Guru</span>
                    </button>
                    
                    <button 
                      onClick={() => handleChangeRole(u.id, 'Siswa')}
                      className="bg-[#E87C1E] hover:bg-orange-600 text-white rounded-2xl p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
                    >
                      <GraduationCap className="w-5 h-5" />
                      <span className="font-bold text-[10px] uppercase">Siswa</span>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl p-4 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="font-bold text-xs uppercase tracking-wider">Hapus Pengguna</span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {users.filter(u => u.role !== 'Admin').length === 0 && (
            <div className="bg-white rounded-[28px] p-12 text-center shadow-sm border border-dashed border-gray-200">
              <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 font-bold text-sm">Belum ada pengguna terdaftar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
