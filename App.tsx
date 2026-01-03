
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  Receipt, 
  TrendingDown, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Download,
  Sparkles,
  ArrowRight,
  Share,
  X,
  History as HistoryIcon,
  Table,
  Trash2,
  ChevronRight,
  Save,
  FileSpreadsheet,
  HelpCircle,
  Smartphone,
  Info,
  QrCode
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Expense, ExpenseCategory, BudgetState, AIAnalysisResponse, HistoricalBudget } from './types.ts';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { analyzeBudget } from './services/geminiService.ts';
import { QRCodeModal } from './components/QRCodeModal.tsx';

const COLORS = [
  '#3b82f6', '#f97316', '#64748b', '#eab308', 
  '#a855f7', '#6366f1', '#ec4899', '#ef4444', 
  '#22c55e', '#64748b'
];

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
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> วิธีใช้กับ Google Sheets</h4>
            <div className="text-sm text-slate-600 space-y-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <p>1. กดปุ่ม <b>"Export to Google Sheets"</b> ในหน้าสรุปบิล</p>
              <p>2. เปิด Google Sheets ในเบราว์เซอร์</p>
              <p>3. ไปที่ <b>File &gt; Import &gt; Upload</b> แล้วเลือกไฟล์ .csv ที่โหลดไป</p>
              <p>4. ข้อมูลจะถูกจัดเรียงเป็นตารางให้คุณจัดการต่อได้ทันที!</p>
            </div>
          </section>
          <section>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><QrCode className="w-4 h-4 text-orange-500" /> ระบบสร้าง QR รับเงิน</h4>
            <p className="text-sm text-slate-600">คุณสามารถสร้าง QR Code สำหรับ PromptPay ได้จากหน้าสรุปบิล โดยแอปจะดึงยอดเงินคงเหลือมาสร้าง QR ให้ทันที เหมาะสำหรับการส่งบิลเรียกเก็บเงิน</p>
          </section>
        </div>
        <div className="p-4 bg-slate-50 text-center">
          <button onClick={onClose} className="px-8 py-2 bg-slate-800 text-white rounded-full text-sm font-bold">รับทราบ</button>
        </div>
      </div>
    </div>
  );
};

const IosPrompt = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-center space-x-4">
        <div className="p-3 bg-indigo-600 rounded-xl text-white"><Share className="w-6 h-6" /></div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800 leading-tight">เพิ่มแอปไว้หน้าจอ iPhone</p>
          <p className="text-xs text-slate-500 mt-1">กดปุ่มแชร์ด้านล่าง แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"</p>
        </div>
        <button onClick={() => setShow(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'bill'>('dashboard');
  const [salary, setSalary] = useState<number>(() => Number(localStorage.getItem('current_salary')) || 0);
  const [expenses, setExpenses] = useState<Expense[]>(() => JSON.parse(localStorage.getItem('current_expenses') || '[]'));
  const [history, setHistory] = useState<HistoricalBudget[]>(() => JSON.parse(localStorage.getItem('budget_history') || '[]'));
  const [selectedHistory, setSelectedHistory] = useState<HistoricalBudget | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD);

  useEffect(() => {
    localStorage.setItem('current_salary', salary.toString());
    localStorage.setItem('current_expenses', JSON.stringify(expenses));
  }, [salary, expenses]);

  useEffect(() => {
    localStorage.setItem('budget_history', JSON.stringify(history));
  }, [history]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const balance = salary - totalExpenses;

  const addExpense = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
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
    if (expenses.length === 0) return;
    const monthName = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const newEntry: HistoricalBudget = {
      id: Date.now().toString(),
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

  const exportToCSV = (data: BudgetState, fileName: string) => {
    const headers = ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (บาท)'];
    const rows = data.expenses.map(e => [e.date, e.category, e.description, e.amount.toString()]);
    rows.push(['', '', '', '']);
    rows.push(['', '', 'รายได้ทั้งหมด', data.salary.toString()]);
    rows.push(['', '', 'ค่าใช้จ่ายทั้งหมด', data.expenses.reduce((sum, e) => sum + e.amount, 0).toString()]);
    rows.push(['', '', 'คงเหลือสุทธิ', (data.salary - data.expenses.reduce((sum, e) => sum + e.amount, 0)).toString()]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <IosPrompt />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        amount={activeTab === 'bill' ? balance : 0} 
      />
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 no-print shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white"><Wallet className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">SmartBudget</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-full text-xs font-bold mr-2">
              <button onClick={() => {setActiveTab('dashboard'); setSelectedHistory(null)}} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>แดชบอร์ด</button>
              <button onClick={() => {setActiveTab('history'); setSelectedHistory(null)}} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>ประวัติ</button>
            </div>
            <button onClick={() => setIsHelpOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600"><HelpCircle className="w-6 h-6" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <label className="block text-sm font-medium text-slate-500 mb-2">รายได้ต่อเดือน</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                  <input type="number" value={salary || ''} onChange={(e) => setSalary(parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <TrendingDown className="w-4 h-4 text-indigo-600 mb-2" />
                  <p className="text-xs text-indigo-600 font-medium">ค่าใช้จ่าย</p>
                  <p className="text-lg font-bold text-indigo-900">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <TrendingUp className={`w-4 h-4 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'} mb-2`} />
                  <p className={`text-xs ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'} font-medium`}>คงเหลือ</p>
                  <p className="text-lg font-bold text-slate-900">฿{balance.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
                <h3 className="flex items-center space-x-2 font-bold mb-4"><Sparkles className="w-5 h-5 text-yellow-400" /><span>AI Analyst</span></h3>
                {aiAnalysis ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300 italic border-l-2 border-indigo-500 pl-4">"{aiAnalysis.summary}"</p>
                    <button onClick={handleAIAnalyze} disabled={loadingAI} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold">{loadingAI ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ใหม่'}</button>
                  </div>
                ) : (
                  <button onClick={handleAIAnalyze} disabled={loadingAI || expenses.length === 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20">{loadingAI ? 'กำลังวิเคราะห์...' : 'ให้ AI วิเคราะห์การเงิน'}</button>
                )}
              </div>

              <div className="space-y-3">
                <button onClick={() => setActiveTab('bill')} className="w-full flex items-center justify-center space-x-2 py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all"><Receipt className="w-5 h-5" /><span>สรุปบิลรายเดือน</span></button>
                <button onClick={saveToHistory} className="w-full flex items-center justify-center space-x-2 py-4 border-2 border-indigo-100 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all"><Save className="w-5 h-5" /><span>บันทึกลงประวัติ</span></button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center space-x-2"><div className="w-2 h-6 bg-indigo-600 rounded-full"></div><span>เพิ่มรายการ</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">หมวดหมู่</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">จำนวนเงิน (บาท)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="รายละเอียด เช่น ค่าไฟ..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button onClick={addExpense} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"><Plus className="w-6 h-6" /></button>
                </div>
              </div>

              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                    <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm italic">ยังไม่มีรายการค่าใช้จ่ายของเดือนนี้</p>
                  </div>
                ) : (
                  expenses.map(exp => <ExpenseItem key={exp.id} expense={exp} onDelete={deleteExpense} />)
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bill' && (
          <div className="space-y-8">
            <BillReceipt state={{ salary, expenses }} />
            <div className="flex flex-wrap justify-center gap-4 no-print pb-10">
              <button onClick={() => setActiveTab('dashboard')} className="px-6 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-100">ย้อนกลับ</button>
              <button onClick={() => setIsQRModalOpen(true)} className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20"><QrCode className="w-5 h-5" /><span>สร้าง QR รับเงิน (PromptPay)</span></button>
              <button onClick={() => exportToCSV({salary, expenses}, `Budget_${new Date().toLocaleDateString('th-TH')}`)} className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"><FileSpreadsheet className="w-5 h-5" /><span>Export to Google Sheets</span></button>
              <button onClick={() => window.print()} className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"><Download className="w-5 h-5" /><span>พิมพ์ใบสรุป (PDF)</span></button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2"><HistoryIcon className="w-6 h-6 text-indigo-600" /><span>ประวัติการเงินของคุณ</span></h2>
            {selectedHistory ? (
              <div className="space-y-6">
                <button onClick={() => setSelectedHistory(null)} className="flex items-center space-x-2 text-indigo-600 font-bold mb-4"><ArrowRight className="w-4 h-4 rotate-180" /><span>กลับไปยังรายการประวัติ</span></button>
                <BillReceipt state={{ salary: selectedHistory.salary, expenses: selectedHistory.expenses }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100"><p className="text-slate-400 font-medium italic">ยังไม่มีการบันทึกประวัติ</p></div>
                ) : (
                  history.map(h => (
                    <div key={h.id} onClick={() => setSelectedHistory(h)} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Table className="w-6 h-6" /></div>
                        <div><h4 className="font-bold text-slate-800">{h.monthName}</h4><p className="text-[10px] text-slate-400 uppercase tracking-widest">{new Date(h.savedAt).toLocaleDateString('th-TH')}</p></div>
                      </div>
                      <button onClick={(e) => deleteHistory(h.id, e)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
