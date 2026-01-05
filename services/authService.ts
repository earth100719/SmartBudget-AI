
import { supabase } from './supabaseClient.ts';
import { User } from '../types.ts';

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

    return {
      id: data.user.id,
      username: email.split('@')[0],
      fullName: fullName,
      createdAt: data.user.created_at
    };
  },

  login: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('ไม่พบข้อมูลผู้ใช้');

    return {
      id: data.user.id,
      username: email.split('@')[0],
      fullName: data.user.user_metadata.full_name || email,
      createdAt: data.user.created_at
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      username: user.email?.split('@')[0] || '',
      fullName: user.user_metadata.full_name || '',
      createdAt: user.created_at
    };
  }
};
