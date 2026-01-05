
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ⚠️ สำคัญ: ข้อมูลเชื่อมต่อ Supabase ของคุณ
const supabaseUrl = 'https://ctuiomcuyszumozupkxk.supabase.co';
const supabaseAnonKey = 'sb_publishable_aEgTEywABnTWIru29snWNQ_TxuYkOPT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
