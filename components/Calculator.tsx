
import React, { useState } from 'react';
import { X, Delete, Check, RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: string) => void;
}

export const Calculator: React.FC<Props> = ({ isOpen, onClose, onApply }) => {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const handleDigit = (digit: string) => {
    setDisplay(prev => (prev === '0' ? digit : prev + digit));
    setExpression(prev => prev + digit);
  };

  const handleOperator = (op: string) => {
    if (display === '0' && op === '-') {
       setDisplay('-');
       setExpression('-');
       return;
    }
    setExpression(prev => prev + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // ใช้ Function constructor แทน eval เพื่อความปลอดภัยเบื้องต้นในบริบทนี้
      const result = new Function(`return ${expression.replace('x', '*')}`)();
      const finalResult = Number(result).toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, '');
      setDisplay(finalResult);
      setExpression(finalResult);
    } catch (e) {
      setDisplay('Error');
      setExpression('');
    }
  };

  const clear = () => {
    setDisplay('0');
    setExpression('');
  };

  const deleteLast = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
      setExpression(expression.slice(0, -1));
    } else {
      setDisplay('0');
      setExpression('');
    }
  };

  if (!isOpen) return null;

  const buttons = [
    { label: 'C', action: clear, color: 'text-rose-500' },
    { label: 'DEL', action: deleteLast, color: 'text-amber-500', icon: <Delete className="w-5 h-5" /> },
    { label: '/', action: () => handleOperator('/'), color: 'text-indigo-600' },
    { label: 'x', action: () => handleOperator('*'), color: 'text-indigo-600' },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '-', action: () => handleOperator('-'), color: 'text-indigo-600' },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '+', action: () => handleOperator('+'), color: 'text-indigo-600' },
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '=', action: calculate, color: 'bg-indigo-600 text-white row-span-2' },
    { label: '0', action: () => handleDigit('0'), colSpan: 'col-span-2' },
    { label: '.', action: () => handleDigit('.') },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 rounded-lg">
              <RotateCcw className="w-4 h-4" />
            </div>
            <span className="font-black text-sm uppercase tracking-widest">Smart Calc</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 bg-slate-50 text-right">
          <div className="text-slate-400 text-xs font-mono h-4 mb-1 overflow-hidden">{expression || '0'}</div>
          <div className="text-4xl font-black text-slate-800 truncate font-mono">{display}</div>
        </div>

        <div className="p-4 grid grid-cols-4 gap-2">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`
                h-16 flex items-center justify-center rounded-2xl font-black text-lg transition-all active:scale-90
                ${btn.colSpan || ''}
                ${btn.color || 'bg-white text-slate-700 shadow-sm hover:bg-slate-50'}
              `}
            >
              {btn.icon || btn.label}
            </button>
          ))}
        </div>

        <div className="p-6 pt-2">
          <button
            onClick={() => {
              onApply(display);
              onClose();
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
          >
            <Check className="w-5 h-5" /> ใช้ยอดเงินนี้
          </button>
        </div>
      </div>
    </div>
  );
};
