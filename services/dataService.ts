
import { supabase } from './supabaseClient.ts';
import { Expense, HistoricalBudget } from '../types.ts';

export const dataService = {
  // --- ส่วนของผู้ใช้ทั่วไป ---
  fetchExpenses: async (userId: string): Promise<Expense[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  saveExpense: async (expense: Expense) => {
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) throw error;
  },

  deleteExpense: async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  fetchHistory: async (userId: string): Promise<HistoricalBudget[]> => {
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('userId', userId)
      .order('savedAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  saveHistory: async (history: HistoricalBudget) => {
    const { error } = await supabase.from('history').insert(history);
    if (error) throw error;
  },

  updateSalary: async (userId: string, salary: number) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, salary }, { onConflict: 'id' });
    if (error) throw error;
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('salary')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // --- ส่วนของ Admin (ต้องการ RLS Policy ที่อนุญาตให้ Admin เข้าถึง) ---
  admin: {
    fetchAllUsers: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    fetchSystemStats: async () => {
      const today = new Date().toLocaleDateString('th-TH');
      
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: todayExpenses, error: expError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('date', today);

      if (userError || expError) throw (userError || expError);

      return {
        totalUsers: userCount || 0,
        todayTransactions: todayExpenses?.length || 0,
        todayVolume: todayExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0
      };
    },

    fetchGlobalLogs: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, profiles(id)')
        .order('id', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    }
  }
};
