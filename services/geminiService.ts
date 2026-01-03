
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCoachFeedback = async (motion: string, mode: string, success: boolean, score: number) => {
  try {
    const prompt = `
      You are a physical therapy coach for a stroke survivor playing a rehabilitation game called "Cleaning Rush".
      The user just finished a session.
      Motion practiced: ${motion}
      Game Mode: ${mode}
      Was it successful? ${success ? 'Yes' : 'No'}
      Completion score: ${Math.floor(score)}%

      Please provide a short, encouraging, and highly motivating feedback (max 2 sentences). 
      If they were successful, praise their precision. If they failed (especially in speed mode), encourage them to keep moving their arm as the movement itself is the therapy.
      Keep the tone warm, empathetic, and professional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Keep scrubbing! Every movement counts toward your recovery journey.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Great effort! Consistency is the key to progress. Let's try another round!";
  }
};
