
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Wallet, Receipt, TrendingDown, TrendingUp, Download, Sparkles, ArrowRight, Share, X, 
  History as HistoryIcon, Table, Trash2, Save, FileSpreadsheet, HelpCircle, Smartphone, Info, 
  QrCode, LogOut, User as UserIcon, Cloud, CloudUpload, ExternalLink, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, ShieldAlert, Settings, ShieldCheck, Users, Activity
} from 'lucide-react';
import { User, Expense, ExpenseCategory, BudgetState, AIAnalysisResponse, HistoricalBudget } from './types.ts';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { analyzeBudget } from './services/geminiService.ts';
import { QRCodeModal } from './components/QRCodeModal.tsx';
import { AuthOverlay } from './components/AuthOverlay.tsx';
import { authService } from './services/authService.ts';
import { googleApiService } from './services/googleApiService.ts';
import { dataService } from './services/dataService.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'bill' | 'admin'>('dashboard');
  
  const [salary, setSalary] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<HistoricalBudget[]>([]);
  
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsInitializing(false);
      }
    };
    checkAuth();
    googleApiService.init();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [profile, cloudExpenses, cloudHistory] = await Promise.all([
        dataService.fetchProfile(user.id),
        dataService.fetchExpenses(user.id),
        dataService.fetchHistory(user.id)
      ]);

      if (profile) setSalary(profile.salary);
      setExpenses(cloudExpenses || []);
      setHistory(cloudHistory || []);
    } catch (err) {
      console.error("Failed to load cloud data", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSalaryChange = async (val: number) => {
    setSalary(val);
    if (user) {
      try {
        await dataService.updateSalary(user.id, val);
      } catch (err) {
        console.error("Failed to update salary", err);
      }
    }
  };

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balance = salary - totalExpenses;

  const handleRunAI = async () => {
    if (expenses.length === 0) {
      alert("กรุณาเพิ่มรายการค่าใช้จ่ายก่อนให้ AI วิเคราะห์");
      return;
    }
    setLoadingAI(true);
    try {
      const result = await analyzeBudget({ salary, expenses });
      setAiAnalysis(result);
    } catch (err) {
      console.error("AI Error", err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setSalary(0);
    setExpenses([]);
    setHistory([]);
    setAiAnalysis(null);
    setActiveTab('dashboard');
  };

  const addExpense = async () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      category,
      amount: parseFloat(amount),
      description: desc || category,
      date: new Date().toLocaleDateString('th-TH'),
    };
    
    try {
      await dataService.saveExpense(newExpense);
      setExpenses([newExpense, ...expenses]);
      setDesc('');
      setAmount('');
      setAiAnalysis(null);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err as any).message);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await dataService.deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      setAiAnalysis(null);
    } catch (err) {
      alert("ไม่สามารถลบรายการได้");
    }
  };

  const saveToHistory = async () => {
    if (!user || expenses.length === 0) return;
    const monthName = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const newEntry: HistoricalBudget = {
      id: Date.now().toString(),
      userId: user.id,
      salary,
      expenses: [...expenses],
      savedAt: new Date().toISOString(),
      monthName
    };
    
    try {
      await dataService.saveHistory(newEntry);
      setHistory([newEntry, ...history]);
      alert('บันทึกประวัติเรียบร้อยแล้ว');
      setActiveTab('history');
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกประวัติ");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="font-bold tracking-widest text-sm animate-pulse uppercase">Syncing with Cloud...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} amount={activeTab === 'bill' ? balance : 0} />
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200"><Wallet className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">SmartBudget</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${loadingData ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Cloud {loadingData ? 'Syncing...' : 'Connected'} 
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full text-xs font-bold mr-2">
              <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ประวัติ</button>
              {user.role === 'admin' && (
                <button onClick={() => setActiveTab('admin')} className={`px-5 py-2 rounded-full transition-all flex items-center gap-2 ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" /> แอดมิน
                </button>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {user.role === 'admin' && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase border border-amber-200">Admin</span>}
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">ยินดีต้อนรับ</p>
                </div>
                <p className="text-xs font-bold text-slate-700">{user.fullName}</p>
              </div>
              <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* ... Dashboard Content (Keep as is but ensured correct animation) ... */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายได้ประจำเดือน</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">฿</span>
                  <input 
                    type="number" 
                    value={salary || ''} 
                    onChange={(e) => handleSalaryChange(parseFloat(e.target.value) || 0)} 
                    placeholder="0.00" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-2xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">จ่ายรวม</p>
                  <p className="text-xl font-black text-slate-800">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-[2rem] border shadow-sm ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'} font-black uppercase tracking-widest`}>เงินคงเหลือ</p>
                  <p className="text-xl font-black text-slate-800">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-10 group-hover:scale-125 transition-transform" />
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">AI ประมวลผล <Sparkles className="w-4 h-4 text-yellow-300" /></h3>
                {!aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-indigo-100 text-sm leading-relaxed">ให้ AI วิเคราะห์พฤติกรรมการใช้จ่ายและสถานะความปลอดภัยทางการเงินของคุณ</p>
                    <button 
                      onClick={handleRunAI} 
                      disabled={loadingAI}
                      className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-70"
                    >
                      {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      {loadingAI ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full w-fit mb-2">
                      {aiAnalysis.status === 'good' && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                      {aiAnalysis.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-300" />}
                      {aiAnalysis.status === 'critical' && <ShieldAlert className="w-4 h-4 text-red-300" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">Status: {aiAnalysis.status}</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic border-l-4 border-white/30 pl-4">"{aiAnalysis.summary}"</p>
                    <div className="space-y-2 pt-2">
                      {aiAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs text-indigo-50">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0"></span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setAiAnalysis(null)} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white mt-4 tracking-widest">วิเคราะห์ใหม่อีกครั้ง</button>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <button onClick={() => setActiveTab('bill')} className="w-full flex items-center justify-center space-x-2 py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-slate-800 shadow-xl transition-all active:scale-95"><Receipt className="w-5 h-5" /><span>สรุปบิลรายเดือน</span></button>
                <button onClick={saveToHistory} className="w-full flex items-center justify-center space-x-2 py-5 border-2 border-indigo-100 text-indigo-600 rounded-[2rem] font-black hover:bg-indigo-50 transition-all active:scale-95"><Save className="w-5 h-5" /><span>บันทึกประวัติลง Cloud</span></button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-8 flex items-center space-x-3 text-xl">
                  <div className="w-3 h-8 bg-indigo-600 rounded-full"></div>
                  <span>บันทึกรายการ</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หมวดหมู่</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all">
                      {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">จำนวนเงิน (บาท)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-lg focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="ระบุรายละเอียด เช่น ค่าไฟบ้าน, ข้าวเที่ยง..." className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all" />
                  <button onClick={addExpense} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 shadow-lg shadow-indigo-100 flex items-center justify-center transition-all active:scale-95"><Plus className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการใช้จ่ายทั้งหมด</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">{expenses.length} รายการ</span>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold space-y-4">
                    <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto"><Receipt className="w-8 h-8 opacity-20" /></div>
                    <p>ยังไม่มีรายการค่าใช้จ่ายในเดือนนี้</p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {expenses.map(exp => <ExpenseItem key={exp.id} expense={exp} onDelete={deleteExpense} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <ShieldCheck className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 opacity-10" />
              <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 flex items-center gap-3 italic">ADMIN PANEL</h2>
                <p className="text-indigo-100 opacity-80 font-bold">ระบบบริหารจัดการหลังบ้าน SmartBudget อัจฉริยะ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4"><Users className="w-6 h-6" /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ผู้ใช้ทั้งหมด</p>
                <p className="text-3xl font-black text-slate-800">1 รายการ</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4"><Activity className="w-6 h-6" /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">การทำรายการวันนี้</p>
                <p className="text-3xl font-black text-slate-800">{expenses.length} ครั้ง</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4"><CloudUpload className="w-6 h-6" /></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Status</p>
                <p className="text-3xl font-black text-emerald-500 uppercase">Online</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-xl mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6 text-slate-400" />
                การตั้งค่าระบบ (Admin Only)
              </h3>
              <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">จัดการข้อมูลผู้ใช้</p>
                    <p className="text-xs text-slate-400">ดูรายชื่อผู้ใช้ที่ลงทะเบียนทั้งหมดในระบบ</p>
                  </div>
                  <button className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs uppercase shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">เปิดดู</button>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-indigo-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">Log การใช้งาน</p>
                    <p className="text-xs text-slate-400">ตรวจสอบกิจกรรมที่เกิดขึ้นในระบบ Cloud</p>
                  </div>
                  <button className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-black text-xs uppercase shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">ตรวจสอบ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... Rest of the tabs (History, Bill) ... */}
        {activeTab === 'bill' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <BillReceipt state={{ salary, expenses }} />
            <div className="flex flex-wrap justify-center gap-4 no-print pb-10">
              <button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50 shadow-sm transition-all">ย้อนกลับ</button>
              <button onClick={() => setIsQRModalOpen(true)} className="flex items-center space-x-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all active:scale-95"><QrCode className="w-5 h-5" /><span>สร้าง QR รับเงิน</span></button>
              <button onClick={() => window.print()} className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"><Download className="w-5 h-5" /><span>บันทึกเป็น PDF</span></button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-800 flex items-center space-x-4">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><HistoryIcon className="w-6 h-6" /></div>
                <span>ประวัติจาก Cloud</span>
              </h2>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm text-slate-400">
                <CloudUpload className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-bold">ยังไม่เคยบันทึกประวัติลงระบบ Cloud</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {history.map(h => {
                  const hTotal = h.expenses.reduce((sum, e) => sum + e.amount, 0);
                  const hBalance = h.salary - hTotal;
                  return (
                    <div key={h.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Cloud className="w-12 h-12" /></div>
                      <h4 className="font-black text-xl text-slate-800 mb-1">{h.monthName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">{new Date(h.savedAt).toLocaleDateString('th-TH')}</p>
                      
                      <div className="space-y-3 border-t border-slate-50 pt-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-medium">รายได้</span>
                          <span className="font-bold">฿{h.salary.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-medium">จ่ายรวม</span>
                          <span className="font-bold text-red-500">฿{hTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                          <span className="text-xs font-black text-slate-800">คงเหลือ</span>
                          <span className={`text-lg font-black ${hBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>฿{hBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">History</span>
        </button>
        {user.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Admin</span>
          </button>
        )}
        <button onClick={() => setActiveTab('bill')} className={`flex flex-col items-center gap-1 ${activeTab === 'bill' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Receipt className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Bill</span>
        </button>
      </nav>
    </div>
  );
}
