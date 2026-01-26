
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types.ts';

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
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <h3 className="font-black text-slate-800 mb-6 flex items-center space-x-3 text-xl">
        <div className="w-3 h-8 bg-indigo-600 rounded-full"></div>
        <span>สัดส่วนการใช้จ่าย</span>
      </h3>
      
      <div className="h-[240px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                borderRadius: '1.25rem', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '12px 16px',
                fontWeight: 'bold'
              }}
              formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดใช้จ่าย']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text for Pie Chart */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รวมทั้งหมด</span>
          <span className="text-lg font-black text-slate-800">
            ฿{data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3 อันดับสูงสุด</p>
          <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Analytics</span>
        </div>
        
        <div className="space-y-3">
          {data.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full shadow-sm flex-shrink-0 transition-transform group-hover:scale-125" 
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                ></div>
                <span className="text-sm font-bold text-slate-600 truncate max-w-[140px]">{item.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-slate-900 tracking-tight">฿{item.value.toLocaleString()}</span>
                <span className="text-[9px] font-bold text-slate-300">
                  {((item.value / data.reduce((a,b) => a + b.value, 0)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {data.length > 5 && (
          <p className="text-center text-[9px] font-bold text-slate-300 italic pt-2">
            + อีก {data.length - 5} หมวดหมู่ที่เหลือ
          </p>
        )}
      </div>
    </div>
  );
};
