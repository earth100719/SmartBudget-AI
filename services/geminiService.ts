
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  // สร้าง instance ใหม่ทุกครั้งที่เรียกใช้เพื่อให้มั่นใจว่าได้ API Key ล่าสุด
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  
  const expenseSummary = state.expenses.map(e => `${e.category}: ${e.amount} บาท (${e.description})`).join(', ');

  const prompt = `
    ในฐานะที่ปรึกษาทางการเงินส่วนตัว โปรดวิเคราะห์งบประมาณรายเดือนดังนี้:
    รายได้: ${state.salary} บาท
    ค่าใช้จ่ายรวม: ${totalExpenses} บาท
    เงินคงเหลือ: ${remaining} บาท
    รายละเอียดค่าใช้จ่าย: ${expenseSummary}

    โปรดให้คำแนะนำสั้นๆ เกี่ยวกับการบริหารเงิน สรุปภาพรวม และสถานะความปลอดภัยทางการเงิน
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "สรุปภาพรวมการใช้จ่ายสั้นๆ" },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "รายการคำแนะนำ 3 ข้อ"
            },
            status: { 
              type: Type.STRING, 
              enum: ['good', 'warning', 'critical'],
              description: "สถานะการเงิน"
            }
          },
          required: ["summary", "suggestions", "status"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const result = JSON.parse(response.text.trim());
    return result as AIAnalysisResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    // กรณีเกิดข้อผิดพลาด ให้ส่งค่าที่ช่วยให้ผู้ใช้ทราบว่าควรทำอย่างไร
    return {
      summary: "ขออภัย ระบบวิเคราะห์ขัดข้องชั่วคราว",
      suggestions: [
        "ตรวจสอบว่าคุณได้เพิ่มรายการค่าใช้จ่ายเพียงพอหรือไม่",
        "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ",
        "หากยังพบปัญหา โปรดลองใหม่อีกครั้งในภายหลัง"
      ],
      status: 'warning'
    };
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `วิเคราะห์ข้อความต่อไปนี้และแยกข้อมูลรายจ่าย: "${text}" 
  ให้คืนค่าเป็นหมวดหมู่ที่เหมาะสมที่สุดจากรายการหมวดหมู่ที่มีอยู่
  รายการหมวดหมู่: ${Object.values(ExpenseCategory).join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "จำนวนเงินที่ระบุในข้อความ" },
            category: { type: Type.STRING, enum: Object.values(ExpenseCategory), description: "หมวดหมู่รายจ่ายที่ตรงที่สุด" },
            description: { type: Type.STRING, description: "รายละเอียดสั้นๆ ของรายการ" }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};
