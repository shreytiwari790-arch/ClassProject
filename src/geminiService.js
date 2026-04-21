import { GoogleGenerativeAI } from "@google/generative-ai";

// Use environment variable if available, otherwise fallback
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDYW4Xxqsdp_KN3tLMGrf06BCZzWWzuoio";
const genAI = new GoogleGenerativeAI(apiKey);

export const generateDietPlan = async (userInput) => {
  if (!apiKey) {
    alert("Please configure your Gemini API Key! Replace 'YOUR_GEMINI_API_KEY' in geminiService.js or use .env file.");
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a nutrition expert.

    Create a 1-day diet plan for: ${userInput}

    Rules:
    - Return ONLY valid array JSON
    - Include breakfast, lunch, dinner, snack
    - Include calories, protein, carbs, fat
    - DO NOT include any other text or markdown formatting outside of the JSON array.

    Format required:
    [
      {
        "type": "breakfast",
        "name": "Oats",
        "calories": 200,
        "protein": 10,
        "carbs": 30,
        "fat": 5
      }
    ]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // clean response (remove markdown blocks if present)
    text = text.replace(/```json/gi, "");
    text = text.replace(/```/g, "");

    return JSON.parse(text.trim());

  } catch (err) {
    console.error("Gemini API Error:", err);
    alert("AI Error: " + err.message);
    return [];
  }
};