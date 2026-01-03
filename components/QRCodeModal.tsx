
import React, { useState, useEffect, useRef } from 'react';
import { X, Download, QrCode, Smartphone, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
}

export const QRCodeModal: React.FC<Props> = ({ isOpen, onClose, amount }) => {
  const [promptPayId, setPromptPayId] = useState(() => localStorage.getItem('promptpay_id') || '');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ฟังก์ชันสร้าง Payload สำหรับ PromptPay (CRC16)
  const generatePromptPayPayload = (id: string, amount: number) => {
    const target = id.replace(/[^0-9]/g, '');
    let formatId = '';
    
    if (target.length === 10) { // Mobile number
      formatId = `0066${target.substring(1)}`;
    } else { // ID Card or E-Wallet
      formatId = target;
    }

    const payload = [
      '000201', // Payload Indicator
      '010211', // Point of Initiation Method (11 = Static, 12 = Dynamic)
      '2937',   // Merchant Account Information
      '0016A000000677010111', // AID
      `0113${formatId}`,      // PromptPay ID
      '5303764', // Currency (THB)
      `54${String(amount.toFixed(2)).length.toString().padStart(2, '0')}${amount.toFixed(2)}`, // Amount
      '5802TH',  // Country Code
      '6304'     // CRC Placeholder
    ].join('');

    // ฟังก์ชันคำนวณ CRC16
    const crc16 = (data: string) => {
      let crc = 0xFFFF;
      for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
            crc = (crc << 1) ^ 0x1021;
          } else {
            crc <<= 1;
          }
        }
      }
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

    return payload + crc16(payload);
  };

  useEffect(() => {
    if (isOpen && promptPayId && amount > 0) {
      const payload = generatePromptPayPayload(promptPayId, amount);
      QRCode.toDataURL(payload, {
        width: 600,
        margin: 2,
        color: {
          dark: '#003366', // PromptPay Blue
          light: '#ffffff'
        }
      }, (err, url) => {
        if (!err) setQrUrl(url);
      });
      localStorage.setItem('promptpay_id', promptPayId);
    } else {
      setQrUrl('');
    }
  }, [isOpen, promptPayId, amount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `PromptPay_${amount}THB.png`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><QrCode className="w-5 h-5" /> สร้าง QR รับเงิน</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">PromptPay ID (เบอร์โทร / เลขบัตร)</label>
            <div className="relative">
              <input 
                type="text" 
                value={promptPayId} 
                onChange={(e) => setPromptPayId(e.target.value)} 
                placeholder="08X-XXX-XXXX"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
              />
              <button onClick={handleCopy} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 min-h-[300px]">
            {qrUrl ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                  <img src={qrUrl} alt="PromptPay QR Code" className="w-56 h-56" />
                </div>
                <div className="mt-4 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-white bg-[#003366] px-2 py-0.5 rounded uppercase tracking-tighter">Prompt Pay</span>
                  </div>
                  <p className="text-xl font-black text-[#003366]">฿{amount.toLocaleString()}</p>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 space-y-2">
                <Smartphone className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-sm">กรอก PromptPay ID<br/>เพื่อสร้าง QR Code</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
          <button onClick={onClose} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white transition-colors">ยกเลิก</button>
          <button 
            onClick={handleDownload}
            disabled={!qrUrl}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            <Download className="w-5 h-5" /> บันทึกรูป
          </button>
        </div>
      </div>
    </div>
  );
};
