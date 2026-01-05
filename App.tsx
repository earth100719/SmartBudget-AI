
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, ArrowRight, CheckCircle2, 
  AlertCircle, ShieldAlert, Plus, Wallet, LogOut,
  FileText, QrCode
} from 'lucide-react';
import { analyzeBudget } from './services/geminiService.ts';
import { Expense, ExpenseCategory, AIAnalysisResponse, User } from './types.ts';
import { dataService } from './services/dataService.ts';
import { authService } from './services/authService.ts';
import { AuthOverlay } from './components/AuthOverlay.tsx';
import { ExpenseItem } from './components/ExpenseItem.tsx';
import { BillReceipt } from './components/BillReceipt.tsx';
import { QRCodeModal } from './components/QRCodeModal.tsx';

/**
 * The main application component for SmartBudget.
 * Manages user state, financial data, and AI analysis integration.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salary, setSalary] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    // Initial user authentication check.
    authService.getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
      if (u) {
        loadData(u.id);
      }
    });
  }, []);

  const loadData = async (userId: string) => {
    try {
      const [exps, profile] = await Promise.all([
        dataService.fetchExpenses(userId),
        dataService.fetchProfile(userId)
      ]);
      setExpenses(exps);
      if (profile) setSalary(profile.salary);
    } catch (err) {
      console.error("Data Load Error:", err);
    }
  };

  const handleRunAI = async () => {
    setLoadingAI(true);
    try {
      const result = await analyzeBudget({ salary, expenses });
      setAiAnalysis(result);
    } catch (err) {
      console.error("AI Error:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return <AuthOverlay onLoginSuccess={setUser} />;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tighter">SmartBudget</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500 hidden sm:block">{user.fullName}</span>
          <button 
            onClick={() => authService.logout().then(() => setUser(null))} 
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Salary Management Card */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-center">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">รายได้ต่อเดือน</h2>
             <div className="flex items-end gap-2">
               <span className="text-4xl font-black italic">฿</span>
               <input 
                 type="number" 
                 value={salary} 
                 onChange={e => {
                   const val = Number(e.target.value);
                   setSalary(val);
                   dataService.updateSalary(user.id, val);
                 }}
                 className="text-4xl font-black w-full bg-transparent outline-none border-b-2 border-transparent focus:border-indigo-600 transition-colors"
               />
             </div>
             <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-wider font-bold">ยอดคงเหลือ: ฿{(salary - totalExpenses).toLocaleString()}</p>
          </div>

          {/* AI Analysis Result Card */}
          <div className={`bg-gradient-to-br ${
            !aiAnalysis ? 'from-indigo-600 to-indigo-800' : 
            aiAnalysis.status === 'good' ? 'from-emerald-600 to-teal-700' :
            aiAnalysis.status === 'warning' ? 'from-amber-500 to-orange-600' :
            'from-rose-600 to-red-800'
          } p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group transition-all duration-500`}>
            <Sparkles className="absolute top-4 right-4 w-12 h-12 opacity-10 group-hover:scale-125 transition-transform" />
            
            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
              SmartBudget AI {loadingAI && <Loader2 className="w-4 h-4 animate-spin" />}
            </h3>

            {!aiAnalysis ? (
              <div className="space-y-4">
                <p className="text-indigo-100 text-sm leading-relaxed">
                  ให้ AI วิเคราะห์พฤติกรรมการใช้จ่ายและตรวจสอบสุขภาพทางการเงินของคุณวันนี้
                </p>
                <button 
                  onClick={handleRunAI} 
                  disabled={loadingAI}
                  className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-95"
                >
                  {loadingAI ? 'กำลังประมวลผล...' : 'เริ่มการวิเคราะห์'}
                  {!loadingAI && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full w-fit mb-2">
                  {aiAnalysis.status === 'good' && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                  {aiAnalysis.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-200" />}
                  {aiAnalysis.status === 'critical' && <ShieldAlert className="w-4 h-4 text-red-200" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {aiAnalysis.status === 'good' ? 'สถานะดีเยี่ยม' : 
                     aiAnalysis.status === 'warning' ? 'ควรระมัดระวัง' : 'สถานะวิกฤต'}
                  </span>
                </div>
                
                <p className="text-sm font-bold leading-relaxed border-l-4 border-white/30 pl-4 py-1">
                  "{aiAnalysis.summary}"
                </p>
                
                <div className="space-y-2.5 pt-2">
                  {aiAnalysis.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs bg-black/10 p-3 rounded-xl border border-white/5">
                      <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i+1}</div>
                      <span className="leading-tight">{s}</span>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setAiAnalysis(null)} 
                  className="w-full mt-4 py-2 text-[10px] font-black uppercase text-white/60 hover:text-white transition-colors tracking-widest border-t border-white/10 pt-4"
                >
                  วิเคราะห์ใหม่อีกครั้ง
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expenses List and Reports */}
        <div className="space-y-4">
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-black tracking-tight">รายการใช้จ่ายล่าสุด</h2>
             <div className="flex gap-2">
               <button 
                 onClick={() => setIsQRModalOpen(true)} 
                 className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
               >
                 <QrCode className="w-4 h-4" />
                 รับเงิน
               </button>
               <button 
                 onClick={() => setShowReceipt(!showReceipt)} 
                 className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
               >
                 <FileText className="w-4 h-4" />
                 {showReceipt ? 'ดูรายการ' : 'สรุปยอด'}
               </button>
             </div>
           </div>

           {showReceipt ? (
             <BillReceipt state={{ salary, expenses }} />
           ) : (
             <div className="grid gap-3">
               {expenses.length > 0 ? (
                 expenses.map(exp => (
                   <ExpenseItem 
                     key={exp.id} 
                     expense={exp} 
                     onDelete={async (id) => {
                       await dataService.deleteExpense(id);
                       setExpenses(prev => prev.filter(e => e.id !== id));
                     }} 
                   />
                 ))
               ) : (
                 <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                   <p className="text-slate-400 font-bold">ยังไม่มีรายการบันทึก</p>
                 </div>
               )}
             </div>
           )}
        </div>
      </main>

      {/* Floating Action Button for Adding Expenses */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <button 
          onClick={async () => {
            const desc = prompt('รายการใช้จ่าย:');
            const amountStr = prompt('จำนวนเงิน (บาท):');
            if (desc && amountStr && !isNaN(Number(amountStr))) {
              const amount = Number(amountStr);
              const newExp: Expense = {
                id: Math.random().toString(36).substring(7),
                userId: user.id,
                category: ExpenseCategory.FOOD,
                amount,
                description: desc,
                date: new Date().toLocaleDateString('th-TH')
              };
              await dataService.saveExpense(newExp);
              setExpenses(prev => [newExp, ...prev]);
            }
          }}
          className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
          บันทึกรายจ่าย
        </button>
      </div>

      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        amount={totalExpenses} 
      />
    </div>
  );
};

export default App;
