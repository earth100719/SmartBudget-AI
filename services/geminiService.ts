
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse, ExpenseCategory } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
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

    const result = JSON.parse(response.text || '{}');
    return result as AIAnalysisResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้",
      suggestions: ["โปรดลองใหม่อีกครั้ง", "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต"],
      status: 'warning'
    };
  }
};

export const parseExpenseText = async (text: string): Promise<{ amount: number; category: ExpenseCategory; description: string } | null> => {
  const prompt = `วิเคราะห์ข้อความต่อไปนี้และแยกข้อมูลรายจ่าย: "${text}" 
  ให้คืนค่าเป็นหมวดหมู่ที่เหมาะสมที่สุดจากรายการ: ${Object.values(ExpenseCategory).join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "จำนวนเงินที่ระบุ" },
            category: { type: Type.STRING, enum: Object.values(ExpenseCategory), description: "หมวดหมู่รายจ่าย" },
            description: { type: Type.STRING, description: "รายละเอียดสั้นๆ" }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
};
