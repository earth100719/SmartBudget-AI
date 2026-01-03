
import React from 'react';
import { Expense, ExpenseCategory } from '../types.ts';
import { 
  Trash2, Plane, Home, Utensils, Car, Zap, Tv, 
  ShoppingBag, HeartPulse, PiggyBank, MoreHorizontal, 
  Bike, CreditCard, Phone, ShieldCheck
} from 'lucide-react';

interface Props {
  expense: Expense;
  onDelete: (id: string) => void;
}

const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case ExpenseCategory.HOUSING: return <Home className="w-5 h-5 text-blue-500" />;
    case ExpenseCategory.FOOD: return <Utensils className="w-5 h-5 text-orange-500" />;
    case ExpenseCategory.TRANSPORT: return <Car className="w-5 h-5 text-gray-500" />;
    case ExpenseCategory.UTILITIES: return <Zap className="w-5 h-5 text-yellow-500" />;
    case ExpenseCategory.COMMUNICATION: return <Phone className="w-5 h-5 text-cyan-500" />;
    case ExpenseCategory.ENTERTAINMENT: return <Tv className="w-5 h-5 text-purple-500" />;
    case ExpenseCategory.FLIGHTS: return <Plane className="w-5 h-5 text-indigo-500" />;
    case ExpenseCategory.SHOPPING: return <ShoppingBag className="w-5 h-5 text-pink-500" />;
    case ExpenseCategory.HEALTH: return <ShieldCheck className="w-5 h-5 text-red-500" />;
    case ExpenseCategory.SAVINGS: return <PiggyBank className="w-5 h-5 text-green-500" />;
    case ExpenseCategory.VEHICLE_LOAN: return <Bike className="w-5 h-5 text-teal-600" />;
    case ExpenseCategory.CREDIT_CARD: return <CreditCard className="w-5 h-5 text-rose-600" />;
    default: return <MoreHorizontal className="w-5 h-5 text-slate-500" />;
  }
};

export const ExpenseItem: React.FC<Props> = ({ expense, onDelete }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-slate-50 rounded-lg">
          {getCategoryIcon(expense.category)}
        </div>
        <div>
          <p className="font-semibold text-slate-800 leading-tight">{expense.description || expense.category}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{expense.category} • {expense.date}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="font-bold text-slate-900">฿{expense.amount.toLocaleString()}</span>
        <button 
          onClick={() => onDelete(expense.id)}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="ลบรายการ"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
