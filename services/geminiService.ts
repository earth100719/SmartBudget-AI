
import { GoogleGenAI, Type } from "@google/genai";
import { BudgetState, AIAnalysisResponse } from "../types.ts";

// Initializing the Google GenAI SDK with the API key from environment variables.
// Use process.env.API_KEY directly as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeBudget = async (state: BudgetState): Promise<AIAnalysisResponse> => {
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = state.salary - totalExpenses;
  const expenseRatio = (totalExpenses / state.salary) * 100;
  
  // Grouping expenses by category for cleaner analysis.
  const categoryTotals = state.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const categorySummary = Object.entries(categoryTotals)
    .map(([cat, amt]) => `- ${cat}: ${amt.toLocaleString()} บาท`)
    .join('\n');

  const systemInstruction = `คุณคือ "SmartBudget AI" ที่ปรึกษาทางการเงินมืออาชีพที่มีความเชี่ยวชาญด้านการวางแผนการเงินส่วนบุคคล 
  หน้าที่ของคุณคือวิเคราะห์รายได้และรายจ่ายของผู้ใช้ และให้คำแนะนำที่ "ตรงไปตรงมา" "สร้างสรรค์" และ "ทำได้จริง" 
  ใช้โทนเสียงที่สุภาพแต่กระตือรือร้นในการช่วยผู้ใช้ประหยัดเงิน`;

  const prompt = `
    โปรดวิเคราะห์ข้อมูลการเงินของเดือนนี้:
    - รายได้สุทธิ: ${state.salary.toLocaleString()} บาท
    - ค่าใช้จ่ายรวม: ${totalExpenses.toLocaleString()} บาท (คิดเป็น ${expenseRatio.toFixed(1)}% ของรายได้)
    - เงินคงเหลือ: ${remaining.toLocaleString()} บาท
    
    รายละเอียดแยกตามหมวดหมู่:
    ${categorySummary}

    เกณฑ์การวิเคราะห์:
    1. ถ้าใช้จ่ายเกิน 80% ของรายได้ ให้ถือว่าสถานะ 'critical'
    2. ถ้าใช้จ่าย 50-80% ให้ถือว่าสถานะ 'warning'
    3. ถ้าต่ำกว่า 50% ให้ถือว่าสถานะ 'good'
    
    โปรดสรุปภาพรวมและให้คำแนะนำ 3 ข้อที่เจาะจงกับหมวดหมู่ที่ผู้ใช้จ่ายเยอะที่สุด
  `;

  try {
    // Using gemini-3-flash-preview for general summarization and analysis tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING, 
              description: "บทวิเคราะห์ภาพรวมสั้นๆ ไม่เกิน 2 ประโยค" 
            },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "รายการคำแนะนำที่เจาะจงและทำตามได้จริง 3 ข้อ"
            },
            status: { 
              type: Type.STRING, 
              enum: ['good', 'warning', 'critical'],
              description: "สถานะความปลอดภัยทางการเงิน"
            }
          },
          required: ["summary", "suggestions", "status"]
        }
      }
    });

    // Directly access the .text property of GenerateContentResponse.
    const jsonStr = response.text ? response.text.trim() : '{}';
    return JSON.parse(jsonStr) as AIAnalysisResponse;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      summary: "ขออภัย ระบบไม่สามารถเชื่อมต่อกับที่ปรึกษา AI ได้ในขณะนี้",
      suggestions: [
        "ตรวจสอบยอดเงินคงเหลือด้วยตัวเองเบื้องต้น",
        "พยายามคุมค่าใช้จ่ายในหมวดหมู่ที่สูงผิดปกติ",
        "ลองกดวิเคราะห์อีกครั้งในภายหลัง"
      ],
      status: 'warning'
    };
  }
};
