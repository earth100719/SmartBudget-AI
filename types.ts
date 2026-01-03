
export enum ExpenseCategory {
  HOUSING = 'ที่อยู่อาศัย/ค่าเช่า',
  FOOD = 'อาหารและเครื่องดื่ม',
  TRANSPORT = 'การเดินทาง/น้ำมัน',
  VEHICLE_LOAN = 'ผ่อนรถ/มอเตอร์ไซค์',
  CREDIT_CARD = 'ชำระบัตรเครดิต',
  UTILITIES = 'ค่าน้ำ/ค่าไฟ',
  COMMUNICATION = 'ค่าเน็ต/โทรศัพท์',
  ENTERTAINMENT = 'ความบันเทิง/สตรีมมิ่ง',
  FLIGHTS = 'ตั๋วเครื่องบิน/ท่องเที่ยว',
  SHOPPING = 'ช้อปปิ้ง/ของใช้',
  HEALTH = 'สุขภาพ/ประกัน',
  SAVINGS = 'เงินออม/ลงทุน',
  OTHERS = 'อื่นๆ'
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
}

export interface BudgetState {
  salary: number;
  expenses: Expense[];
}

export interface HistoricalBudget extends BudgetState {
  id: string;
  savedAt: string;
  monthName: string;
}

export interface AIAnalysisResponse {
  summary: string;
  suggestions: string[];
  status: 'good' | 'warning' | 'critical';
}
