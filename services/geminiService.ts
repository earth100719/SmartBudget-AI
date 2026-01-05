
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  const expenseRatio = (totalExpenses / state.salary) * 100;
  
  const categoryTotals = state.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const categorySummary = Object.entries(categoryTotals)
    .map(([cat, amt]) => `- ${cat}: ${amt.toLocaleString()} บาท`)
    .join('\n');

  const systemInstruction = `คุณคือ "SmartBudget AI" ที่ปรึกษาทางการเงินส่วนบุคคล
  วิเคราะห์ข้อมูลด้วยความแม่นยำ ให้คำแนะนำที่ทำตามได้จริง และประเมินสถานะทางการเงิน (good, warning, critical)`;

  const prompt = `
    รายได้: ${state.salary} บาท
    รายจ่ายรวม: ${totalExpenses} บาท (คิดเป็น ${expenseRatio.toFixed(1)}%)
    เงินคงเหลือ: ${remaining} บาท
    รายการแยกตามหมวดหมู่:
    ${categorySummary}
    
    โปรดสรุปและแนะนำการประหยัดเงิน 3 ข้อ
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
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

    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr) as AIAnalysisResponse;
  } catch (error) {
    console.error("AI Error:", error);
    return {
      summary: "ไม่สามารถวิเคราะห์ได้ในขณะนี้",
      suggestions: ["ตรวจสอบรายจ่ายหมวดหมู่ที่สูงเกินไป", "ตั้งงบประมาณรายวัน"],
      status: 'warning'
    };
  }
};
