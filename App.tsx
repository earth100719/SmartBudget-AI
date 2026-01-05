
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
  
  // Admin Data
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

  useEffect(() => {
    authService.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
      if (u) loadUserData(u.id);
    });
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [profile, cloudExps, cloudHist] = await Promise.all([
        dataService.fetchProfile(userId),
        dataService.fetchExpenses(userId),
        dataService.fetchHistory(userId)
      ]);
      if (profile) setSalary(profile.salary);
      setExpenses(cloudExps);
      setHistory(cloudHist);
    } catch (err) {
      console.error("Load failed", err);
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
      setExpenses([newExp, ...expenses]);
      setAmount('');
      setDesc('');
      setAiAnalysis(null);
    } catch (err) {
      alert("Error saving expense");
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (!user) return <AuthOverlay onLoginSuccess={(u) => { setUser(u); loadUserData(u.id); }} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white"><Wallet className="w-5 h-5" /></div>
          <div>
            <h1 className="font-black text-lg leading-none">SmartBudget</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">AI Financial Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-full text-xs font-bold">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-full ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-full ${activeTab === 'history' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>History</button>
            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('admin')} className={`px-4 py-1.5 rounded-full ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Admin</button>
            )}
          </div>
          <button onClick={() => authService.logout().then(() => setUser(null))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">รายได้ประจำเดือน</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-300">฿</span>
                  <input 
                    type="number" 
                    value={salary} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSalary(val);
                      dataService.updateSalary(user.id, val);
                    }}
                    className="text-3xl font-black w-full outline-none focus:text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">จ่ายแล้ว</p>
                  <p className="text-xl font-black">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-[2rem] border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  <p className="text-[10px] font-bold uppercase">คงเหลือ</p>
                  <p className="text-xl font-black">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              {/* AI CARD */}
              <div className={`p-8 rounded-[2.5rem] text-white relative overflow-hidden group transition-all duration-500 shadow-xl ${
                !aiAnalysis ? 'bg-indigo-600' : 
                aiAnalysis.status === 'good' ? 'bg-emerald-600' :
                aiAnalysis.status === 'warning' ? 'bg-amber-500' : 'bg-rose-600'
              }`}>
                <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-10" />
                <h3 className="font-black mb-4 flex items-center gap-2">AI ประมวลผล {loadingAI && <Loader2 className="w-4 h-4 animate-spin" />}</h3>
                {!aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-sm opacity-80 leading-relaxed">วิเคราะห์พฤติกรรมการใช้จ่ายและรับคำแนะนำจาก SmartBudget AI ทันที</p>
                    <button onClick={handleRunAI} disabled={loadingAI} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform active:scale-95 disabled:opacity-50">
                      {loadingAI ? 'กำลังวิเคราะห์...' : 'เริ่มการวิเคราะห์'}
                      {!loadingAI && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <p className="text-sm font-bold italic border-l-4 border-white/30 pl-4">"{aiAnalysis.summary}"</p>
                    <div className="space-y-2">
                      {aiAnalysis.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-2 text-xs bg-black/10 p-3 rounded-xl">
                          <span className="font-black">{i+1}.</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setAiAnalysis(null)} className="w-full text-center text-[10px] font-black uppercase opacity-60 hover:opacity-100 pt-4">วิเคราะห์ใหม่</button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setActiveTab('bill')} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl"><Receipt className="w-5 h-5" /> บิลรายเดือน</button>
                <button onClick={() => setIsQRModalOpen(true)} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"><QrCode className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-xl mb-6 flex items-center gap-3">
                  <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                  บันทึกรายจ่าย
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" placeholder="จำนวนเงิน" value={amount} onChange={e => setAmount(e.target.value)} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-4">
                  <input type="text" placeholder="รายละเอียด (เช่น ค่าก๋วยเตี๋ยว)" value={desc} onChange={e => setDesc(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button onClick={addExpense} className="px-8 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-500 transition-all active:scale-95"><Plus className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">รายการใช้จ่าย</h4>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{expenses.length} รายการ</span>
                </div>
                {expenses.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold">ยังไม่มีข้อมูล</div>
                ) : (
                  expenses.map(exp => (
                    <ExpenseItem key={exp.id} expense={exp} onDelete={async (id) => {
                      await dataService.deleteExpense(id);
                      setExpenses(prev => prev.filter(e => e.id !== id));
                    }} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bill' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <BillReceipt state={{ salary, expenses }} />
            <div className="flex justify-center gap-4 no-print">
              <button onClick={() => setActiveTab('dashboard')} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold">ย้อนกลับ</button>
              <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2"><Download className="w-5 h-5" /> พิมพ์บิล</button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black flex items-center gap-3"><HistoryIcon /> ประวัติการบันทึก</h2>
              <button onClick={() => {
                const month = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
                dataService.saveHistory({ id: Date.now().toString(), userId: user.id, salary, expenses, savedAt: new Date().toISOString(), monthName: month })
                  .then(() => loadUserData(user.id));
              }} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs">บันทึกยอดปัจจุบันลง Cloud</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(h => (
                <div key={h.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="font-black text-lg">{h.monthName}</h4>
                  <p className="text-[10px] text-slate-400 mb-4">{new Date(h.savedAt).toLocaleDateString('th-TH')}</p>
                  <div className="space-y-1 text-xs font-bold border-t pt-4">
                    <div className="flex justify-between"><span>รายได้:</span><span>฿{h.salary.toLocaleString()}</span></div>
                    <div className="flex justify-between text-rose-500"><span>จ่าย:</span><span>฿{h.expenses.reduce((s,e)=>s+e.amount,0).toLocaleString()}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black italic">ADMIN CONTROL</h2>
                <p className="opacity-60 text-sm">ระบบจัดการข้อมูลภาพรวมหลังบ้าน</p>
              </div>
              <ShieldCheck className="w-16 h-16 opacity-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div onClick={() => setAdminView('summary')} className={`p-6 rounded-[2rem] border cursor-pointer transition-all ${adminView === 'summary' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                <Activity className="mb-2" />
                <p className="text-[10px] font-bold uppercase opacity-60">Summary</p>
                <p className="text-2xl font-black">ระบบโดยรวม</p>
              </div>
              <div onClick={() => setAdminView('users')} className={`p-6 rounded-[2rem] border cursor-pointer transition-all ${adminView === 'users' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                <Users className="mb-2" />
                <p className="text-[10px] font-bold uppercase opacity-60">Users</p>
                <p className="text-2xl font-black">จัดการผู้ใช้</p>
              </div>
              <div onClick={() => setAdminView('logs')} className={`p-6 rounded-[2rem] border cursor-pointer transition-all ${adminView === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                <FileText className="mb-2" />
                <p className="text-[10px] font-bold uppercase opacity-60">Logs</p>
                <p className="text-2xl font-black">รายการล่าสุด</p>
              </div>
            </div>

            {adminView === 'summary' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Users</p>
                  <p className="text-3xl font-black">{adminStats.totalUsers}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Transactions Today</p>
                  <p className="text-3xl font-black">{adminStats.todayTransactions}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Vol. Today</p>
                  <p className="text-3xl font-black">฿{adminStats.todayVolume.toLocaleString()}</p>
                </div>
              </div>
            )}

            {adminView === 'users' && (
              <div className="bg-white rounded-[2rem] border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400"><tr className="border-b"><th className="p-6">User ID</th><th className="p-6">Salary</th><th className="p-6">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {allUsers.map(u => (
                      <tr key={u.id} className="text-sm font-bold">
                        <td className="p-6 font-mono text-xs">{u.id}</td>
                        <td className="p-6">฿{u.salary?.toLocaleString() || 0}</td>
                        <td className="p-6"><span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-[10px]">ACTIVE</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {adminView === 'logs' && (
              <div className="space-y-3">
                {globalLogs.map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-[10px]">{log.category.substring(0,1)}</div>
                      <div>
                        <p className="font-black text-sm">{log.description}</p>
                        <p className="text-[10px] text-slate-400">UID: {log.userId.substring(0,8)}... | {log.date}</p>
                      </div>
                    </div>
                    <span className="font-black text-indigo-600">฿{log.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-4 flex justify-between items-center z-50 no-print shadow-xl">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Wallet className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <HistoryIcon className="w-5 h-5" /><span className="text-[9px] font-black uppercase">History</span>
        </button>
        {user.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <ShieldCheck className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Admin</span>
          </button>
        )}
        <button onClick={() => setActiveTab('bill')} className={`flex flex-col items-center gap-1 ${activeTab === 'bill' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Receipt className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Bill</span>
        </button>
      </nav>

      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} amount={totalExpenses} />
    </div>
  );
}
