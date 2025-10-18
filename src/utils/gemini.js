import { GoogleGenerativeAI } from "@google/generative-ai";

// read the key from .env
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// simple helper you can reuse anywhere
export async function askGemini(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "⚠️ Something went wrong while contacting Gemini.";
  }
}
