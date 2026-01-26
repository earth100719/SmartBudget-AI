
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  // สร้าง instance โดยใช้ API Key จาก environment ตรงๆ ตามข้อกำหนด
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  
  // จำกัดข้อมูลส่งไปเพื่อป้องกัน Error จากขนาด Payload
  const expenseSummary = state.expenses
    .slice(0, 20)
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
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // ตั้งค่า thinkingBudget เป็น 0 เพื่อเน้นความเร็วและความแม่นยำของ JSON Schema
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "สรุปภาพรวมสั้นๆ" },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "คำแนะนำ 3 ข้อ"
            },
            status: { 
              type: Type.STRING, 
              enum: ['good', 'warning', 'critical'],
              description: "ระดับความปลอดภัยทางการเงิน"
            }
          },
          required: ["summary", "suggestions", "status"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI ไม่ได้ส่งข้อมูลตอบกลับมา");

    return JSON.parse(text.trim()) as AIAnalysisResponse;

  } catch (error: any) {
    console.error("Critical AI Error:", error);
    
    // ตรวจสอบประเภทข้อผิดพลาดเพื่อแสดงข้อความที่เหมาะสม
    let errorMessage = "การเชื่อมต่อ AI ขัดข้อง";
    if (error.message?.includes("API_KEY")) {
      errorMessage = "ระบบ API Key ยังไม่พร้อมใช้งาน";
    } else if (error.message?.includes("quota")) {
      errorMessage = "โควต้าการใช้งาน AI เต็มชั่วคราว";
    } else if (error.message) {
      errorMessage = `เกิดข้อผิดพลาด: ${error.message.substring(0, 60)}`;
    }

    return {
      summary: errorMessage,
      suggestions: [
        "ตรวจสอบยอดรายได้และรายจ่ายว่าถูกต้องหรือไม่",
        "ลองกด 'วิเคราะห์ใหม่อีกครั้ง' ในอีกสักครู่",
        "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ"
      ],
      status: 'warning'
    };
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Extract expense info from this Thai sentence: "${text}". Available categories: ${Object.values(ExpenseCategory).join(',')}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
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
