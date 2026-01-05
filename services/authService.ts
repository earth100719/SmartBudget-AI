
import { supabase } from './supabaseClient.ts';
import { User } from '../types.ts';

// 🔑 รายชื่อ User ID ที่ต้องการให้เป็น Admin (อัปเดตจาก ID ที่ผู้ใช้ระบุ)
const ADMIN_USER_IDS = [
  '4979d7e6-b859-4829-8adb-8965e1d3a6a4', // Admin ID หลัก
];

const mapUserRole = (supabaseUser: any): User => {
  const isAdmin = ADMIN_USER_IDS.includes(supabaseUser.id);
  return {
    id: supabaseUser.id,
    username: supabaseUser.email?.split('@')[0] || '',
    fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email || 'Unknown User',
    createdAt: supabaseUser.created_at,
    role: isAdmin ? 'admin' : 'user'
  };
};

export const authService = {
  register: async (email: string, fullName: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('การสมัครสมาชิกไม่สำเร็จ');

    return mapUserRole(data.user);
  },

  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('ไม่พบข้อมูลผู้ใช้');

    return mapUserRole(data.user);
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return mapUserRole(user);
  }
};
