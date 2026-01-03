
import React from 'react';
import { BudgetState, ExpenseCategory } from '../types.ts';

interface Props {
  state: BudgetState;
}

export const BillReceipt: React.FC<Props> = ({ state }) => {
  const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - total;
  const today = new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const bills = state.expenses.filter(e => 
    [ExpenseCategory.VEHICLE_LOAN, ExpenseCategory.CREDIT_CARD, ExpenseCategory.UTILITIES, ExpenseCategory.COMMUNICATION, ExpenseCategory.HOUSING].includes(e.category)
  );
  const others = state.expenses.filter(e => !bills.includes(e));

  return (
    <div className="bg-white p-10 border shadow-2xl rounded-sm max-w-lg mx-auto my-8 font-mono text-slate-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 opacity-20"></div>
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-1 italic">MONTHLY STATEMENT</h2>
        <p className="text-xs text-slate-400 border-y border-slate-100 py-1 inline-block">ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
        <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-widest">{today}</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2">
          <span className="text-sm font-bold uppercase">Total Income</span>
          <span className="text-xl font-black">฿{state.salary.toLocaleString()}</span>
        </div>

        {bills.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest border-b border-slate-100 pb-1">Fix Monthly Bills</h3>
            <div className="space-y-1">
              {bills.map((expense) => (
                <div key={expense.id} className="flex justify-between text-sm">
                  <span className="truncate mr-4 italic">● {expense.description}</span>
                  <span className="flex-shrink-0">฿{expense.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6 space-y-3 border-t-4 border-double border-slate-900 pt-3">
          <div className={`flex justify-between items-center ${remaining >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            <span className="text-lg font-black uppercase">Net Balance:</span>
            <span className="text-2xl font-black">฿{remaining.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-dashed border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Keep tracking for a better future</p>
        <p className="text-[9px] text-slate-300 mt-1 italic">Generated via SmartBudget AI Assistant</p>
      </div>
    </div>
  );
};
