
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Wallet, Receipt, TrendingDown, TrendingUp, Download, Sparkles, ArrowRight, Share, X, 
  History as HistoryIcon, Table, Trash2, Save, FileSpreadsheet, HelpCircle, Smartphone, Info, 
  QrCode, LogOut, User as UserIcon, Cloud, CloudUpload, ExternalLink, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, ShieldAlert, Settings, ShieldCheck, Users, Activity, ChevronLeft, Calendar,
  Calculator as CalcIcon, Wand2
} from 'lucide-react';
import { User, Expense, ExpenseCategory, BudgetState, AIAnalysisResponse, HistoricalBudget } from './types.ts';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { analyzeBudget, parseExpenseText } from './services/geminiService.ts';
import { SpendingCharts } from './components/SpendingCharts.tsx';
import { QRCodeModal } from './components/QRCodeModal.tsx';
import { Calculator } from './components/Calculator.tsx';
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
  
  // Admin States
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, todayTransactions: 0, todayVolume: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [globalLogs, setGlobalLogs] = useState<any[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminView, setAdminView] = useState<'summary' | 'users' | 'logs'>('summary');

  const [loadingAI, setLoadingAI] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 2000);

    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setIsInitializing(false);
        clearTimeout(timer);
      }
    };
    
    checkAuth();
    googleApiService.init().catch(console.warn);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      loadAdminData();
    }
  }, [activeTab, adminView, user?.role]);

  const loadAdminData = async () => {
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
      console.error("Admin Load Error:", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const loadUserData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [profile, cloudExpenses, cloudHistory] = await Promise.all([
        dataService.fetchProfile(user.id).catch(() => null),
        dataService.fetchExpenses(user.id).catch(() => []),
        dataService.fetchHistory(user.id).catch(() => [])
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
    // ตรวจสอบเบื้องต้น
    if (expenses.length === 0) {
      alert("กรุณาเพิ่มรายการค่าใช้จ่ายอย่างน้อย 1 รายการก่อนวิเคราะห์ครับ");
      return;
    }
    if (salary <= 0) {
      alert("กรุณาระบุรายได้รายเดือนของคุณก่อนครับ");
      return;
    }

    setLoadingAI(true);
    try {
      const result = await analyzeBudget({ salary, expenses });
      setAiAnalysis(result);
    } catch (err: any) {
      console.error("AI Component Error:", err);
      setAiAnalysis({
        summary: "เกิดข้อผิดพลาดในการเรียกใช้ AI (เช็ค API Key)",
        suggestions: [
          "ลองกดวิเคราะห์ใหม่อีกครั้ง",
          "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
          "หากยังไม่ได้ โปรดลองรีเฟรชหน้าเว็บ"
        ],
        status: 'warning'
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSmartParse = async () => {
    if (!desc.trim()) {
      alert("กรุณาพิมพ์รายละเอียดก่อน เช่น 'กะเพราไข่ดาว 60' แล้วกดปุ่มไม้กายสิทธิ์");
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseExpenseText(desc);
      if (result) {
        setAmount(result.amount.toString());
        setCategory(result.category);
        setDesc(result.description);
      } else {
        alert("AI ไม่สามารถสรุปข้อความนี้ได้ โปรดลองพิมพ์ใหม่ให้ชัดเจนขึ้นครับ");
      }
    } catch (err) {
      console.error("Parse Error", err);
    } finally {
      setIsParsing(false);
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
      alert("ไม่สามารถบันทึกข้อมูลได้: " + (err as any).message);
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
      alert('บันทึกประวัติลง Cloud เรียบร้อยแล้วครับ');
      setActiveTab('history');
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกประวัติ");
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
        <p className="font-bold tracking-widest text-sm animate-pulse uppercase italic">SMART BUDGET BOOTING...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthOverlay onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} amount={activeTab === 'bill' ? balance : 0} />
      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} onApply={(val) => setAmount(val)} />
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200"><Wallet className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">SmartBudget</h1>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">AI Cloud Active</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full text-xs font-bold mr-2">
              <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ประวัติ</button>
              {user.role === 'admin' && (
                <button onClick={() => setActiveTab('admin')} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>แอดมิน</button>
              )}
            </div>
            <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายได้ประจำเดือน (Salary)</label>
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
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">จ่ายไปแล้ว</p>
                  <p className="text-xl font-black text-slate-800">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-[2rem] border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'} font-black uppercase tracking-widest`}>คงเหลือ</p>
                  <p className="text-xl font-black text-slate-800">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              <SpendingCharts expenses={expenses} />

              {/* AI Section */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-10" />
                <h3 className="text-lg font-black mb-4 flex items-center gap-2">AI ประมวลผล <Sparkles className="w-4 h-4 text-yellow-300" /></h3>
                {!aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-indigo-100 text-sm leading-relaxed">ให้ AI วิเคราะห์พฤติกรรมการใช้จ่ายและสถานะความปลอดภัยทางการเงินของคุณ</p>
                    <button 
                      onClick={handleRunAI} 
                      disabled={loadingAI}
                      className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
                    >
                      {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                      {loadingAI ? 'กำลังประมวลผล...' : 'เริ่มการวิเคราะห์'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full w-fit mb-2">
                      <AlertCircle className="w-4 h-4 text-yellow-300" />
                      <span className="text-[10px] font-black uppercase">Status: {aiAnalysis.status}</span>
                    </div>
                    <p className="text-sm font-medium italic border-l-4 border-white/30 pl-4 leading-relaxed">"{aiAnalysis.summary}"</p>
                    <div className="space-y-2 pt-2">
                      {aiAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs text-indigo-50">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0"></span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setAiAnalysis(null)} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white mt-4 tracking-widest flex items-center gap-2"><RefreshCw className="w-3 h-3" /> วิเคราะห์ใหม่อีกครั้ง</button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button onClick={() => setActiveTab('bill')} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black flex items-center justify-center gap-2"><Receipt className="w-5 h-5" /> สรุปบิลรายเดือน</button>
                <button onClick={saveToHistory} className="w-full py-5 border-2 border-indigo-100 text-indigo-600 rounded-[2rem] font-black flex items-center justify-center gap-2"><Save className="w-5 h-5" /> บันทึกประวัติ</button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-8 flex items-center space-x-3 text-xl">
                  <div className="w-3 h-8 bg-indigo-600 rounded-full"></div>
                  <span>บันทึกรายการ</span>
                </h3>
                
                <div className="mb-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">AI Smart Parser (พิมพ์แล้วกดไม้กายสิทธิ์)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={desc} 
                      onChange={(e) => setDesc(e.target.value)} 
                      placeholder="เช่น 'กินก๋วยเตี๋ยว 50', 'ค่าไฟ 1500'..." 
                      className="w-full pl-5 pr-14 py-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500" 
                    />
                    <button 
                      onClick={handleSmartParse}
                      disabled={isParsing || !desc}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                    >
                      {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">หมวดหมู่</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold">
                      {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex justify-between">
                      <span>จำนวนเงิน (บาท)</span>
                      <button onClick={() => setIsCalculatorOpen(true)} className="text-indigo-600 flex items-center gap-1"><CalcIcon className="w-3 h-3" /> เปิดเครื่องคิดเลข</button>
                    </label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-lg" />
                  </div>
                </div>
                
                <button onClick={addExpense} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Plus className="w-6 h-6" /> บันทึกรายการ
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการใช้จ่ายล่าสุด</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">{expenses.length} รายการ</span>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold">
                    ยังไม่มีรายการค่าใช้จ่ายในเดือนนี้
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

        {/* Admin, Bill, History rendering logic continues... */}
        {activeTab === 'bill' && <div className="space-y-8 animate-in fade-in"><BillReceipt state={{ salary, expenses }} /><div className="flex justify-center gap-4"><button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black">ย้อนกลับ</button><button onClick={() => setIsQRModalOpen(true)} className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black flex items-center gap-2"><QrCode className="w-5 h-5" /> สร้าง QR รับเงิน</button><button onClick={() => window.print()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2"><Download className="w-5 h-5" /> บันทึก PDF</button></div></div>}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-4"><HistoryIcon className="w-8 h-8 text-indigo-600" /> ประวัติการเงิน</h2>
            {history.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-100 text-slate-400 font-bold">ยังไม่พบประวัติการบันทึก</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(h => {
                  const hTotal = h.expenses.reduce((sum, e) => sum + e.amount, 0);
                  const hBalance = h.salary - hTotal;
                  return (
                    <div key={h.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <h4 className="font-black text-xl mb-1">{h.monthName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase">{new Date(h.savedAt).toLocaleDateString('th-TH')}</p>
                      <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex justify-between text-xs font-medium text-slate-500"><span>รายได้</span><span className="text-slate-900 font-bold">฿{h.salary.toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs font-medium text-slate-500"><span>จ่ายรวม</span><span className="text-red-500 font-bold">฿{hTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50"><span className="text-xs font-black">คงเหลือ</span><span className={`text-lg font-black ${hBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>฿{hBalance.toLocaleString()}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}><Wallet className="w-6 h-6" /><span className="text-[10px] font-black uppercase">Home</span></button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}><HistoryIcon className="w-6 h-6" /><span className="text-[10px] font-black uppercase">History</span></button>
        <button onClick={() => setActiveTab('bill')} className={`flex flex-col items-center gap-1 ${activeTab === 'bill' ? 'text-indigo-600' : 'text-slate-400'}`}><Receipt className="w-6 h-6" /><span className="text-[10px] font-black uppercase">Bill</span></button>
      </nav>
    </div>
  );
}
