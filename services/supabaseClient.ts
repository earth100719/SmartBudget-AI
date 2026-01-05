
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ⚠️ คำเตือน: ห้ามนำรหัสจาก Stripe (ที่ขึ้นต้นด้วย sb_publishable...) มาใส่ที่นี่
// คุณต้องไปที่ https://app.supabase.com -> Project Settings -> API 
// แล้วเอารหัสในช่อง "anon public" ที่ขึ้นต้นด้วย "eyJ..." มาใส่แทนครับ

const supabaseUrl = 'https://ctuiomcuyszumozupkxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0dWlvbWN1eXN6dW1venVwa3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzY5MjksImV4cCI6MjA4MzE1MjkyOX0.klN_xcqQPEFvAfck1xAm0jydnqVfJk_rx7D_sfCJQ84';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
