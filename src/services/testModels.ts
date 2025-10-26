import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function listModels() {
    if (!API_KEY) {
        console.error("API key not found!");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    console.log("Available models:");
    const models = ["gemini-pro", "gemini-pro-vision"];
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log(`- ${modelName}: Available`);
        } catch (error) {
            console.log(`- ${modelName}: Not available`);
        }
    }
}

listModels();