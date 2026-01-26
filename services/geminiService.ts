
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

/**
 * ฟังก์ชันช่วยล้างข้อความให้เป็น JSON ที่สะอาด
 * ป้องกันกรณี AI ตอบกลับมาพร้อมกับ Markdown Code Blocks
 */
const sanitizeJsonResponse = (text: string): string => {
  if (!text) return "";
  // ลบ Markdown JSON blocks ถ้ามี
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  // ค้นหาตำแหน่ง { และ } เพื่อตัดส่วนเกินออก (ถ้ามี)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  // สร้าง instance ภายในฟังก์ชันเพื่อให้มั่นใจว่าใช้ API_KEY ล่าสุดจาก context
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  
  const expenseSummary = state.expenses
    .slice(0, 15) // จำกัดจำนวนรายการเพื่อไม่ให้ Token เกิน
    .map(e => `${e.category}: ${e.amount} (${e.description})`)
    .join(', ');

  const prompt = `วิเคราะห์งบประมาณ: รายได้ ${state.salary}, ใช้ไป ${totalExpenses}, เหลือ ${remaining}. รายการ: ${expenseSummary}. ตอบเป็น JSON เท่านั้น`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // ใช้ model ล่าสุดตามคู่มือ
      contents: prompt,
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

    const rawText = response.text || "";
    const cleanText = sanitizeJsonResponse(rawText);
    
    if (!cleanText) {
      throw new Error("Invalid AI Response Content");
    }

    const result = JSON.parse(cleanText);
    return result as AIAnalysisResponse;

  } catch (error) {
    console.error("Gemini Analysis Critical Error:", error);
    return {
      summary: "พบปัญหาในการเชื่อมต่อกับสมองกล AI",
      suggestions: [
        "ลองเพิ่มรายการค่าใช้จ่ายให้ชัดเจนขึ้น",
        "ตรวจสอบว่ายอดเงินเดือนไม่เป็น 0",
        "กดปุ่มวิเคราะห์ใหม่อีกครั้ง"
      ],
      status: 'warning'
    };
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `Extract expense from: "${text}". Categories: ${Object.values(ExpenseCategory).join(',')}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
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

    const rawText = response.text || "";
    const cleanText = sanitizeJsonResponse(rawText);
    
    if (!cleanText) return null;
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Parse Critical Error:", error);
    return null;
  }
};
