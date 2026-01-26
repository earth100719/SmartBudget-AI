
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

/**
 * ฟังก์ชันช่วยล้างข้อความให้เป็น JSON ที่สะอาด
 * ป้องกันกรณี AI ตอบกลับมาพร้อมกับ Markdown หรือคำอธิบายหน้า-หลัง
 */
const cleanAndParseJSON = (text: string) => {
  try {
    // พยายามค้นหาตำแหน่งของ { และ } เพื่อตัดส่วนเกิน
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("ระบบไม่สามารถประมวลผลรูปแบบข้อมูลจาก AI ได้");
  }
};

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("ไม่พบ API KEY กรุณาตรวจสอบการตั้งค่า");

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
    รายการใช้จ่ายล่าสุด: ${expenseSummary}
    
    โปรดสรุปสถานะการเงินและให้คำแนะนำ 3 ข้อ โดยตอบกลับเป็นรูปแบบ JSON (summary: string, suggestions: string[], status: 'good'|'warning'|'critical')`;

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
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            status: { type: Type.STRING, enum: ['good', 'warning', 'critical'] }
          },
          required: ["summary", "suggestions", "status"]
        }
      }
    });

    return cleanAndParseJSON(response.text);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `จงสกัดข้อมูลค่าใช้จ่ายจากข้อความนี้: "${text}"
    โดยเลือกหมวดหมู่ที่เหมาะสมที่สุดจากรายการนี้เท่านั้น: ${Object.values(ExpenseCategory).join(', ')}
    ส่งกลับเป็น JSON เท่านั้น:
    {
      "amount": (ตัวเลขยอดเงินเท่านั้น),
      "category": (ชื่อหมวดหมู่ที่เลือกจากรายการข้างต้น),
      "description": (ชื่อรายการสั้นๆ)
    }`;

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

    return cleanAndParseJSON(response.text);
  } catch (error) {
    console.error("Smart Parse Error:", error);
    return null;
  }
};
