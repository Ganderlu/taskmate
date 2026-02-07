import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured properly in .env.local" },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to get a working model
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } catch (e) {
      console.log("Fallback to gemini-pro");
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    const systemPrompt = `
      You are a task planning assistant. Extract task details from the user's input.
      Return a JSON object with the following fields:
      - title: string (short summary)
      - description: string (detailed description)
      - category: string (one of: "Work", "Personal", "Study", "Health", "Finance") - default to "Personal" if unclear
      - date: string (YYYY-MM-DD) - assume today is ${new Date().toISOString().split("T")[0]} if not specified
      - startTime: string (HH:MM) - 24h format
      - endTime: string (HH:MM) - 24h format (default to 1 hour after start)

      Example input: "Meeting with John tomorrow at 2pm for marketing strategy"
      Example output:
      {
        "title": "Marketing Meeting with John",
        "description": "Discuss marketing strategy",
        "category": "Work",
        "date": "2024-03-21", (assuming today is 2024-03-20)
        "startTime": "14:00",
        "endTime": "15:00"
      }
      
      Respond ONLY with the JSON object. Do not wrap in markdown code blocks.
    `;

    const result = await model.generateContent([systemPrompt, prompt]);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown if present
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const data = JSON.parse(cleanText);
      return NextResponse.json(data);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
