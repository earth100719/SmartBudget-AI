
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Wallet, Receipt, TrendingDown, TrendingUp, Download, Sparkles, ArrowRight, Share, X, 
  History as HistoryIcon, Table, Trash2, Save, FileSpreadsheet, HelpCircle, Smartphone, Info, 
  QrCode, LogOut, User as UserIcon, Cloud, CloudUpload, ExternalLink, Loader2
} from 'lucide-react';
import { User, Expense, ExpenseCategory, BudgetState, AIAnalysisResponse, HistoricalBudget } from './types.ts';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { analyzeBudget } from './services/geminiService.ts';
import { QRCodeModal } from './components/QRCodeModal.tsx';
import { AuthOverlay } from './components/AuthOverlay.tsx';
import { authService } from './services/authService.ts';
import { googleApiService } from './services/googleApiService.ts';

const HelpModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><Info className="w-5 h-5" /> คู่มือการใช้งาน</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-indigo-500" /> ติดตั้งเป็นแอปบนมือถือ</h4>
            <div className="text-sm text-slate-600 space-y-1">
              <p>• <b>iOS (Safari):</b> กดปุ่มแชร์ <Share className="w-3 h-3 inline" /> แล้วเลือก <b>"Add to Home Screen"</b></p>
              <p>• <b>Android (Chrome):</b> กดปุ่ม 3 จุด แล้วเลือก <b>"Install App"</b></p>
            </div>
          </section>
          <section>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Cloud className="w-4 h-4 text-blue-500" /> Google Ecosystem</h4>
            <div className="text-sm text-slate-600 space-y-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p>• <b>Direct Export:</b> ส่งข้อมูลเข้า Google Sheets ทันทีโดยไม่ต้องโหลดไฟล์</p>
              <p>• <b>Drive Backup:</b> สำรองข้อมูลการเงินทั้งหมดไว้ใน Google Drive ส่วนตัว ปลอดภัยและเรียกคืนได้ทุกเมื่อ</p>
            </div>
          </section>
        </div>
        <div className="p-4 bg-slate-50 text-center">
          <button onClick={onClose} className="px-8 py-2 bg-slate-800 text-white rounded-full text-sm font-bold">รับทราบ</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'bill'>('dashboard');
  
  const [salary, setSalary] = useState<number>(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<HistoricalBudget[]>([]);
  
  const [selectedHistory, setSelectedHistory] = useState<HistoricalBudget | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);

  useEffect(() => {
    googleApiService.init();
  }, []);

  useEffect(() => {
    if (user) {
      const savedSalary = localStorage.getItem(`salary_${user.id}`);
      const savedExpenses = localStorage.getItem(`expenses_${user.id}`);
      const savedHistory = localStorage.getItem(`history_${user.id}`);

      if (savedSalary) setSalary(Number(savedSalary));
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`salary_${user.id}`, salary.toString());
      localStorage.setItem(`expenses_${user.id}`, JSON.stringify(expenses));
      localStorage.setItem(`history_${user.id}`, JSON.stringify(history));
    }
  }, [salary, expenses, history, user]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balance = salary - totalExpenses;

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setSalary(0);
    setExpenses([]);
    setHistory([]);
    setActiveTab('dashboard');
  };

  const handleGoogleSheetsExport = async () => {
    setLoadingCloud(true);
    try {
      const monthLabel = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const sheetUrl = await googleApiService.exportToSheets({ salary, expenses }, monthLabel);
      if (sheetUrl) {
        if (confirm('ส่งออกข้อมูลสำเร็จ! คุณต้องการเปิด Google Sheets ตอนนี้เลยหรือไม่?')) {
          window.open(sheetUrl, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets');
    } finally {
      setLoadingCloud(false);
    }
  };

  const handleDriveBackup = async () => {
    if (!user) return;
    setLoadingCloud(true);
    try {
      const appData = { salary, expenses, history };
      const success = await googleApiService.backupToDrive(user.id, appData);
      if (success) alert('สำรองข้อมูลลง Google Drive สำเร็จ!');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสำรองข้อมูล');
    } finally {
      setLoadingCloud(false);
    }
  };

  const addExpense = () => {
    if (!user || !amount || parseFloat(amount) <= 0) return;
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      category,
      amount: parseFloat(amount),
      description: desc || category,
      date: new Date().toLocaleDateString('th-TH'),
    };
    setExpenses([newExpense, ...expenses]);
    setDesc('');
    setAmount('');
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const handleAIAnalyze = async () => {
    if (expenses.length === 0) return;
    setLoadingAI(true);
    const result = await analyzeBudget({ salary, expenses });
    setAiAnalysis(result);
    setLoadingAI(false);
  };

  const saveToHistory = () => {
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
    setHistory([newEntry, ...history]);
    alert('บันทึกประวัติเรียบร้อยแล้ว');
    setActiveTab('history');
  };

  const deleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('คุณแน่ใจว่าต้องการลบประวัตินี้?')) {
      setHistory(history.filter(h => h.id !== id));
    }
  };

  if (!user) {
    return <AuthOverlay onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        amount={activeTab === 'bill' ? balance : 0} 
      />
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Wallet className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800 leading-none">SmartBudget</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">AI Financial Advisor</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full text-xs font-bold mr-2">
              <button onClick={() => {setActiveTab('dashboard'); setSelectedHistory(null)}} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              <button onClick={() => {setActiveTab('history'); setSelectedHistory(null)}} className={`px-5 py-2 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ประวัติ</button>
            </div>
            
            <button onClick={() => setIsHelpOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600"><HelpCircle className="w-6 h-6" /></button>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-100 ml-2">
              <div className="flex flex-col items-end mr-2 hidden sm:flex">
                <span className="text-xs font-bold text-slate-800">{user.fullName}</span>
                <span className="text-[9px] text-slate-400">@{user.username}</span>
              </div>
              <button onClick={handleLogout} title="ออกจากระบบ" className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Profile & Cloud Section */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-xl">{user.fullName[0]}</div>
                  <div>
                    <h3 className="font-bold leading-tight">{user.fullName}</h3>
                    <p className="text-xs text-white/60">Cloud Connected</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={handleDriveBackup} 
                    disabled={loadingCloud}
                    className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all border border-white/10"
                  >
                    {loadingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    Backup to Google Drive
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายได้ต่อเดือน</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">฿</span>
                  <input type="number" value={salary || ''} onChange={(e) => setSalary(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100">
                  <TrendingDown className="w-4 h-4 text-slate-400 mb-2" />
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">จ่าย</p>
                  <p className="text-xl font-black text-slate-800">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-5 rounded-[2rem] border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <TrendingUp className={`w-4 h-4 ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'} mb-2`} />
                  <p className={`text-[10px] ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'} font-black uppercase tracking-widest`}>คงเหลือ</p>
                  <p className="text-xl font-black text-slate-800">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20" /></div>
                <h3 className="flex items-center space-x-2 font-black mb-6 text-lg tracking-tight"><Sparkles className="w-5 h-5 text-yellow-400" /><span>AI Analyst</span></h3>
                {aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 italic border-l-4 border-indigo-500 pl-4 leading-relaxed">"{aiAnalysis.summary}"</p>
                    <button onClick={handleAIAnalyze} disabled={loadingAI} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold">{loadingAI ? 'กำลังวิเคราะห์...' : 'ขอคำแนะนำใหม่'}</button>
                  </div>
                ) : (
                  <button onClick={handleAIAnalyze} disabled={loadingAI || expenses.length === 0} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-black shadow-xl shadow-indigo-500/20">{loadingAI ? 'กำลังวิเคราะห์...' : 'วิเคราะห์พฤติกรรมการเงิน'}</button>
                )}
              </div>

              <div className="space-y-3">
                <button onClick={() => setActiveTab('bill')} className="w-full flex items-center justify-center space-x-2 py-5 bg-slate-900 text-white rounded-[2rem] font-black hover:bg-slate-800 shadow-xl shadow-slate-200"><Receipt className="w-5 h-5" /><span>สรุปบิลรายเดือน</span></button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-8 flex items-center space-x-3 text-xl tracking-tight"><div className="w-3 h-8 bg-indigo-600 rounded-full"></div><span>บันทึกรายการ</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">หมวดหมู่</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                      {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">จำนวนเงิน</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-lg" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="รายละเอียด..." className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                  </div>
                  <button onClick={addExpense} className="px-8 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-500"><Plus className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                    <div className="inline-flex p-6 bg-slate-50 rounded-full text-slate-200 mb-4"><Receipt className="w-12 h-12" /></div>
                    <p className="text-slate-400 text-sm font-bold">ยังไม่มีรายการค่าใช้จ่าย</p>
                  </div>
                ) : (
                  expenses.map(exp => <ExpenseItem key={exp.id} expense={exp} onDelete={deleteExpense} />)
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bill' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <BillReceipt state={{ salary, expenses }} />
            <div className="flex flex-wrap justify-center gap-4 no-print pb-10">
              <button onClick={() => setActiveTab('dashboard')} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-600 hover:bg-slate-50">ย้อนกลับ</button>
              <button 
                onClick={handleGoogleSheetsExport} 
                disabled={loadingCloud}
                className="flex items-center space-x-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 shadow-xl shadow-emerald-100 disabled:opacity-70 transition-all"
              >
                {loadingCloud ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                <span>บันทึกลง Google Sheets</span>
              </button>
              <button onClick={() => setIsQRModalOpen(true)} className="flex items-center space-x-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-black hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all"><QrCode className="w-5 h-5" /><span>สร้าง QR รับเงิน</span></button>
              <button onClick={() => window.print()} className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"><Download className="w-5 h-5" /><span>บันทึก PDF</span></button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-slate-800 flex items-center space-x-4 tracking-tight"><div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><HistoryIcon className="w-8 h-8" /></div><span>ประวัติการใช้จ่าย</span></h2>
            {selectedHistory ? (
              <div className="space-y-8">
                <button onClick={() => setSelectedHistory(null)} className="flex items-center space-x-2 text-indigo-600 font-black mb-6 hover:gap-3"><ArrowRight className="w-5 h-5 rotate-180" /><span>ย้อนกลับ</span></button>
                <BillReceipt state={{ salary: selectedHistory.salary, expenses: selectedHistory.expenses }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map(h => (
                  <div key={h.id} onClick={() => setSelectedHistory(h)} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group relative overflow-hidden">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><Table className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-black text-slate-800 text-lg leading-tight">{h.monthName}</h4>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">{new Date(h.savedAt).toLocaleDateString('th-TH')}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">คงเหลือ</p>
                        <p className="text-xl font-black text-slate-800">฿{(h.salary - h.expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString()}</p>
                      </div>
                      <button onClick={(e) => deleteHistory(h.id, e)} className="p-3 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
