
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  // สร้าง instance ทุกครั้งเพื่อดึง Key ที่ถูกต้องที่สุด
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  
  const expenseSummary = state.expenses
    .slice(0, 15)
    .map(e => `${e.category}: ${e.amount} (${e.description})`)
    .join(', ');

  const prompt = `ในฐานะที่ปรึกษาการเงิน โปรดวิเคราะห์ข้อมูลงบประมาณนี้:
    รายได้: ${state.salary} บาท
    ค่าใช้จ่ายรวม: ${totalExpenses} บาท
    เงินคงเหลือ: ${remaining} บาท
    รายการใช้จ่ายหลัก: ${expenseSummary}
    
    โปรดสรุปสถานะการเงินและให้คำแนะนำ 3 ข้อ โดยตอบกลับเป็นรูปแบบ JSON ตามโครงสร้างที่กำหนดเท่านั้น`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            },
            status: { 
              type: Type.STRING, 
              enum: ['good', 'warning', 'critical']
            }
          },
          required: ["summary", "suggestions", "status"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");

    return JSON.parse(text.trim()) as AIAnalysisResponse;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw error; // ส่งต่อให้ App.tsx จัดการ UI
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Extract expense from: "${text}". Categories: ${Object.values(ExpenseCategory).join(',')}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING, enum: Object.values(ExpenseCategory) },
            description: { type: Type.STRING }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const result = response.text;
    return result ? JSON.parse(result.trim()) : null;
  } catch (error) {
    console.error("Parse Error:", error);
    return null;
  }
};
