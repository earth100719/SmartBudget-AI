
import { supabase } from './supabaseClient.ts';
import { Expense, HistoricalBudget } from '../types.ts';

export const dataService = {
  // จัดการค่าใช้จ่าย (Expenses)
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

  // จัดการประวัติ (History)
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

  // จัดการรายได้ (Salary/Profiles)
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
    if (error && error.code !== 'PGRST116') throw error; // Handle empty row
    return data;
  }
};
