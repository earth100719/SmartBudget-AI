
import React, { useState } from 'react';
import { LogIn, UserPlus, Lock, User as UserIcon, Loader2, Wallet, Mail, AlertCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import { authService } from '../services/authService.ts';
import { supabase } from '../services/supabaseClient.ts';

interface Props {
  onLoginSuccess: (user: any) => void;
}

export const AuthOverlay: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ตรวจสอบว่า Key ที่ใช้อยู่ใช่ของ Stripe หรือไม่
  const isStripeKey = (supabase as any).supabaseKey?.startsWith('sb_');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStripeKey) {
      setError('หยุดก่อน! คุณกำลังใช้ Stripe Key แทนที่จะเป็น Supabase Key');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await authService.login(formData.email, formData.password);
        onLoginSuccess(user);
      } else {
        if (!formData.fullName) throw new Error('กรุณากรอกชื่อ-นามสกุล');
        
        await authService.register(formData.email, formData.fullName, formData.password);
        
        try {
          const loggedInUser = await authService.login(formData.email, formData.password);
          onLoginSuccess(loggedInUser);
        } catch (loginErr: any) {
          if (loginErr.message.includes('not confirmed')) {
            throw new Error('กรุณาปิด "Confirm email" ในหน้า Supabase > Auth > Sign In / Providers');
          }
          throw loginErr;
        }
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg.includes('apiKey') || msg.includes('JWT') || msg.includes('401')) {
        msg = 'API Key ไม่ถูกต้อง กรุณาใช้ Anon Key จาก Supabase (eyJ...)';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#4f46e5_0%,transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Stripe Warning Banner */}
        {isStripeKey && (
          <div className="mb-6 p-6 bg-red-600 text-white rounded-[2rem] shadow-2xl animate-bounce-subtle border-4 border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-8 h-8" />
              <h3 className="font-black text-xl italic uppercase tracking-tighter">ตรวจพบข้อผิดพลาด!</h3>
            </div>
            <p className="text-sm font-bold leading-relaxed opacity-90">
              คุณก๊อปปี้รหัสมาจาก <span className="underline decoration-2">Stripe.com</span> ครับ (รหัสที่ขึ้นต้นด้วย <code className="bg-red-700 px-1">sb_</code>)<br/><br/>
              ต้องใช้รหัสจาก <span className="underline decoration-2 text-yellow-300">Supabase.com</span> (ที่ขึ้นต้นด้วย <code className="bg-red-700 px-1 text-yellow-300">eyJ...</code>) เท่านั้นถึงจะใช้งานแอปนี้ได้
            </p>
            <a 
              href="https://app.supabase.com" 
              target="_blank" 
              className="mt-4 flex items-center justify-center gap-2 py-3 bg-white text-red-600 rounded-xl font-black text-xs uppercase transition-transform hover:scale-105"
            >
              ไปที่ Supabase Dashboard <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
          <div className="p-8 pt-12 text-center">
            <div className="inline-flex p-5 bg-indigo-600 rounded-[2rem] text-white mb-6 shadow-xl shadow-indigo-200">
              <Wallet className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">SmartBudget</h2>
            <p className="text-slate-500 text-sm font-medium tracking-wide">จัดการเงินง่ายๆ ด้วย AI อัจฉริยะ</p>
          </div>

          <div className="px-8 pb-12">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="group relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
                  <input 
                    type="text" 
                    placeholder="ชื่อ-นามสกุล"
                    className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
              )}
              
              <div className="group relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
                <input 
                  type="email" 
                  placeholder="อีเมล (Email)"
                  className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="group relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
                <input 
                  type="password" 
                  placeholder="รหัสผ่าน"
                  className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-600 text-xs font-bold bg-red-50 p-4 rounded-2xl border border-red-100 animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || isStripeKey}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />)}
                {isLogin ? 'เข้าสู่ระบบ' : 'เริ่มใช้งานฟรี'}
              </button>
            </form>

            <div className="mt-10 text-center">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-sm font-black text-indigo-600 hover:text-indigo-800 underline underline-offset-8"
              >
                {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};
