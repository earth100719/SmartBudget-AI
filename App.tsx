
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Wallet, Receipt, TrendingDown, TrendingUp, Download, Sparkles, ArrowRight, X, 
  History as HistoryIcon, Trash2, Save, LogOut, User as UserIcon, Cloud, Loader2, 
  RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck, Users, Activity, 
  ChevronLeft, Calendar, QrCode, FileText
} from 'lucide-react';
import { User, Expense, ExpenseCategory, AIAnalysisResponse, HistoricalBudget } from './types.ts';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { analyzeBudget } from './services/geminiService.ts';
import { QRCodeModal } from './components/QRCodeModal.tsx';
import { AuthOverlay } from './components/AuthOverlay.tsx';
import { authService } from './services/authService.ts';
import { dataService } from './services/dataService.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'bill' | 'admin'>('dashboard');
  const [adminView, setAdminView] = useState<'summary' | 'users' | 'logs'>('summary');
  
  const [salary, setSalary] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<HistoricalBudget[]>([]);
  
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, todayTransactions: 0, todayVolume: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);

  // ปรับปรุงการโหลดข้อมูลเริ่มต้นให้ปลอดภัยขึ้น
  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await loadUserData(currentUser.id);
        }
      } catch (err) {
        console.error("Critical Init Error:", err);
      } finally {
        // มั่นใจว่า loading จะเป็น false เสมอเพื่อไม่ให้หน้าจอค้าง
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [profile, cloudExps, cloudHist] = await Promise.all([
        dataService.fetchProfile(userId).catch(() => null),
        dataService.fetchExpenses(userId).catch(() => []),
        dataService.fetchHistory(userId).catch(() => [])
      ]);
      if (profile) setSalary(profile.salary);
      setExpenses(cloudExps || []);
      setHistory(cloudHist || []);
    } catch (err) {
      console.error("User data load error:", err);
    }
  };

  const loadAdminData = async () => {
    if (user?.role !== 'admin') return;
    setLoadingAdmin(true);
    try {
      if (adminView === 'summary') {
        const stats = await dataService.admin.fetchSystemStats();
        setAdminStats(stats);
      } else if (adminView === 'users') {
        const users = await dataService.admin.fetchAllUsers();
        setAllUsers(users);
      } else if (adminView === 'logs') {
        const logs = await dataService.admin.fetchGlobalLogs();
        setGlobalLogs(logs);
      }
    } catch (err) {
      console.error("Admin Load Error", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') loadAdminData();
  }, [activeTab, adminView]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balance = salary - totalExpenses;

  const addExpense = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    const newExp: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      category,
      amount: parseFloat(amount),
      description: desc || category,
      date: new Date().toLocaleDateString('th-TH'),
    };
    try {
      await dataService.saveExpense(newExp);
      setExpenses(prev => [newExp, ...prev]);
      setAmount('');
      setDesc('');
      setAiAnalysis(null);
    } catch (err) {
      alert("ไม่สามารถบันทึกข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อ");
    }
  };

  const handleRunAI = async () => {
    if (expenses.length === 0) return alert("กรุณาเพิ่มรายการก่อน");
    setLoadingAI(true);
    try {
      const result = await analyzeBudget({ salary, expenses });
      setAiAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <p className="font-bold text-indigo-900/60 animate-pulse">กำลังเตรียมความพร้อม...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onLoginSuccess={(u) => { setUser(u); loadUserData(u.id); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center no-print shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-lg leading-none tracking-tighter">SmartBudget</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Financial Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-full text-xs font-bold">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('admin')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Admin</button>
            )}
          </div>
          <button 
            onClick={() => authService.logout().then(() => setUser(null))} 
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="ออกจากระบบ"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">รายได้ประจำเดือน</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-300 group-hover:text-indigo-200 transition-colors">฿</span>
                  <input 
                    type="number" 
                    value={salary || ''} 
                    placeholder="0"
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSalary(val);
                      dataService.updateSalary(user.id, val);
                    }}
                    className="text-3xl font-black w-full outline-none focus:text-indigo-600 placeholder-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">จ่ายแล้ว</p>
                  <p className="text-xl font-black text-slate-900">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-[2.2rem] border shadow-sm transition-all duration-500 ${balance >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1">คงเหลือ</p>
                  <p className="text-xl font-black">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              {/* AI CARD */}
              <div className={`p-8 rounded-[2.5rem] text-white relative overflow-hidden group transition-all duration-700 shadow-2xl ${
                !aiAnalysis ? 'bg-indigo-600' : 
                aiAnalysis.status === 'good' ? 'bg-emerald-600' :
                aiAnalysis.status === 'warning' ? 'bg-amber-500' : 'bg-rose-600'
              }`}>
                <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                <h3 className="font-black mb-4 flex items-center gap-2 tracking-tight">
                  SmartBudget AI {loadingAI && <Loader2 className="w-4 h-4 animate-spin" />}
                </h3>
                {!aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white/80 leading-relaxed font-medium">วิเคราะห์พฤติกรรมการใช้จ่ายและรับคำแนะนำจาก AI ผู้เชี่ยวชาญทันที</p>
                    <button 
                      onClick={handleRunAI} 
                      disabled={loadingAI} 
                      className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loadingAI ? 'กำลังประมวลผล...' : 'วิเคราะห์การเงิน'}
                      {!loadingAI && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <p className="text-sm font-bold italic border-l-4 border-white/30 pl-4 py-1 leading-relaxed">"{aiAnalysis.summary}"</p>
                    <div className="space-y-2">
                      {aiAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-3 text-xs bg-black/10 p-3.5 rounded-2xl border border-white/5">
                          <span className="font-black text-white/40">{i+1}</span>
                          <span className="font-medium">{s}</span>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setAiAnalysis(null)} 
                      className="w-full text-center text-[10px] font-black uppercase opacity-60 hover:opacity-100 pt-4 border-t border-white/10 transition-opacity"
                    >
                      ปิดการวิเคราะห์
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setActiveTab('bill')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-all active:scale-95"><Receipt className="w-5 h-5" /> บิลรายเดือน</button>
                <button onClick={() => setIsQRModalOpen(true)} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"><QrCode className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-xl mb-6 flex items-center gap-3">
                  <div className="w-2.5 h-6 bg-indigo-600 rounded-full"></div>
                  บันทึกรายจ่าย
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value as ExpenseCategory)} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">รายละเอียด</label>
                  <input 
                    type="text" 
                    placeholder="เช่น ค่าก๋วยเตี๋ยว, ค่าไฟ..." 
                    value={desc} 
                    onChange={e => setDesc(e.target.value)} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                  />
                </div>
                <button 
                  onClick={addExpense} 
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Plus className="w-6 h-6" /> เพิ่มรายการใหม่
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการที่บันทึกไว้</h4>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                    {expenses.length} รายการ
                  </span>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold space-y-2">
                    <HistoryIcon className="w-12 h-12 mx-auto opacity-10 mb-2" />
                    <p>ยังไม่มีรายการบันทึกในวันนี้</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {expenses.map(exp => (
                      <ExpenseItem 
                        key={exp.id} 
                        expense={exp} 
                        onDelete={async (id) => {
                          if (confirm('ยืนยันการลบรายการนี้?')) {
                            await dataService.deleteExpense(id);
                            setExpenses(prev => prev.filter(e => e.id !== id));
                          }
                        }} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bill' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
            <BillReceipt state={{ salary, expenses }} />
            <div className="flex justify-center gap-4 no-print pb-10">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                ย้อนกลับ
              </button>
              <button 
                onClick={() => window.print()} 
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-500 transition-all flex items-center gap-2"
              >
                <Download className="w-5 h-5" /> พิมพ์เอกสาร
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                  <HistoryIcon className="text-indigo-600" /> ประวัติการบันทึก
                </h2>
                <p className="text-sm text-slate-400 font-medium">จัดการข้อมูลย้อนหลังที่บันทึกไว้บน Cloud</p>
              </div>
              <button 
                onClick={() => {
                  const month = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                  if (confirm(`บันทึกสถานะเดือน ${month} ลงประวัติ?`)) {
                    dataService.saveHistory({ 
                      id: Date.now().toString(), 
                      userId: user.id, 
                      salary, 
                      expenses, 
                      savedAt: new Date().toISOString(), 
                      monthName: month 
                    }).then(() => {
                      loadUserData(user.id);
                      alert('บันทึกสำเร็จ');
                    });
                  }
                }} 
                className="w-full md:w-auto px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4" /> บันทึกยอดปัจจุบัน
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <HistoryIcon className="w-16 h-16 mx-auto opacity-10 mb-4" />
                <p className="font-bold text-slate-300">ไม่พบประวัติการบันทึก</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(h => (
                  <div key={h.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-black text-xl text-slate-800 tracking-tight">{h.monthName}</h4>
                      <span className="p-2 bg-slate-50 text-slate-300 group-hover:text-indigo-600 rounded-xl transition-colors">
                        <Calendar className="w-5 h-5" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest">Saved: {new Date(h.savedAt).toLocaleDateString('th-TH')}</p>
                    <div className="space-y-3 text-sm font-bold border-t border-slate-50 pt-6">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">รายได้:</span>
                        <span className="text-slate-900">฿{h.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-rose-500">
                        <span className="font-medium">จ่ายรวม:</span>
                        <span>฿{h.expenses.reduce((s,e)=>s+e.amount,0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-50 text-emerald-600">
                        <span className="font-medium">เงินเก็บ:</span>
                        <span className="font-black">฿{(h.salary - h.expenses.reduce((s,e)=>s+e.amount,0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32"></div>
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-4xl font-black italic tracking-tighter mb-2">ADMIN CONSOLE</h2>
                <p className="opacity-60 text-sm font-medium uppercase tracking-[0.2em]">Management System v2.0</p>
              </div>
              <ShieldCheck className="w-20 h-20 opacity-20 relative z-10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div onClick={() => setAdminView('summary')} className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-300 ${adminView === 'summary' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white hover:border-indigo-200 shadow-sm'}`}>
                <Activity className={`mb-3 ${adminView === 'summary' ? 'text-white' : 'text-indigo-600'}`} />
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Status</p>
                <p className="text-2xl font-black">ระบบโดยรวม</p>
              </div>
              <div onClick={() => setAdminView('users')} className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-300 ${adminView === 'users' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white hover:border-indigo-200 shadow-sm'}`}>
                <Users className={`mb-3 ${adminView === 'users' ? 'text-white' : 'text-indigo-600'}`} />
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Database</p>
                <p className="text-2xl font-black">จัดการสมาชิก</p>
              </div>
              <div onClick={() => setAdminView('logs')} className={`p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-300 ${adminView === 'logs' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white hover:border-indigo-200 shadow-sm'}`}>
                <FileText className={`mb-3 ${adminView === 'logs' ? 'text-white' : 'text-indigo-600'}`} />
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Activity</p>
                <p className="text-2xl font-black">ล็อกการใช้งาน</p>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                {adminView === 'summary' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ผู้ใช้งานทั้งหมด</p>
                      <p className="text-4xl font-black text-slate-900">{adminStats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายการวันนี้</p>
                      <p className="text-4xl font-black text-slate-900">{adminStats.todayTransactions.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ยอดเงินหมุนเวียน</p>
                      <p className="text-4xl font-black text-indigo-600">฿{adminStats.todayVolume.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {adminView === 'users' && (
                  <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                          <tr className="border-b">
                            <th className="p-8">User Reference</th>
                            <th className="p-8">Salary Profile</th>
                            <th className="p-8">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {allUsers.length === 0 ? (
                            <tr><td colSpan={3} className="p-20 text-center font-bold text-slate-300">ไม่มีข้อมูลผู้ใช้</td></tr>
                          ) : (
                            allUsers.map(u => (
                              <tr key={u.id} className="text-sm font-bold hover:bg-slate-50 transition-colors">
                                <td className="p-8 font-mono text-xs text-slate-500">{u.id}</td>
                                <td className="p-8">฿{u.salary?.toLocaleString() || 0}</td>
                                <td className="p-8">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    ACTIVE
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminView === 'logs' && (
                  <div className="space-y-3">
                    {globalLogs.length === 0 ? (
                      <div className="p-20 text-center bg-white rounded-[2.5rem] border font-bold text-slate-300">ไม่มีรายการล่าสุด</div>
                    ) : (
                      globalLogs.map(log => (
                        <div key={log.id} className="bg-white p-5 rounded-[2rem] border flex justify-between items-center group hover:border-indigo-100 hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-xs text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                              {log.category ? log.category.substring(0,1) : 'L'}
                            </div>
                            <div>
                              <p className="font-black text-sm text-slate-800">{log.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">UID: {log.userId.substring(0,8)}... | {log.date}</p>
                            </div>
                          </div>
                          <span className="font-black text-indigo-600 text-lg">฿{log.amount.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t px-8 py-5 flex justify-between items-center z-50 no-print shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
          <Wallet className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
          <HistoryIcon className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-widest">History</span>
        </button>
        {user.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <ShieldCheck className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-widest">Admin</span>
          </button>
        )}
        <button onClick={() => setActiveTab('bill')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'bill' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
          <Receipt className="w-6 h-6" /><span className="text-[8px] font-black uppercase tracking-widest">Bill</span>
        </button>
      </nav>

      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} amount={totalExpenses} />
    </div>
  );
}
