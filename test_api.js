import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDYW4Xxqsdp_KN3tLMGrf06BCZzWWzuoio";
const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
  const modelsToTest = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro"];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = "Reply with exactly the word OK.";
      const result = await model.generateContent(prompt);
      console.log(`[SUCCESS] ${modelName} returned: ${result.response.text()}`);
      break; // stop on first success
    } catch (e) {
      console.log(`[FAILED] ${modelName}:`, e.message);
    }
  }
}

runTest();
