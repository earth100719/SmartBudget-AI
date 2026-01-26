
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Expense, ExpenseCategory } from '../types.ts';

interface Props {
  expenses: Expense[];
}

const COLORS = [
  '#4f46e5', '#f97316', '#64748b', '#eab308', '#06b6d4', 
  '#a855f7', '#ec4899', '#ef4444', '#22c55e', '#0d9488'
];

export const SpendingCharts: React.FC<Props> = ({ expenses }) => {
  const data = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <h3 className="font-black text-slate-800 mb-6 flex items-center space-x-3 text-xl">
        <div className="w-3 h-8 bg-indigo-600 rounded-full"></div>
        <span>สัดส่วนการใช้จ่าย</span>
      </h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดใช้จ่าย']}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Spending Categories</p>
        {data.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
              <span className="text-sm font-bold text-slate-700">{item.name}</span>
            </div>
            <span className="text-sm font-black text-slate-900">฿{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
