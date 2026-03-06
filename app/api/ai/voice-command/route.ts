import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command) {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    const prompt = `
      You are an AI Voice Command Processor for a task management app.
      Analyze the user's voice command and determine the intent.
      
      Supported actions:
      - CREATE_TASK: Create a new task. Extract title, date (YYYY-MM-DD), time (HH:MM), and category.
      - DELETE_TASK: Delete a task. Extract keywords to identify the task.
      - PRIORITIZE_TASKS: Reorder tasks by priority.
      - SCHEDULE_TASKS: Auto-schedule tasks.

      Current Date: ${new Date().toISOString().split("T")[0]}

      User Command: "${command}"

      Return a JSON object with the following structure:
      {
        "action": "CREATE_TASK" | "DELETE_TASK" | "PRIORITIZE_TASKS" | "SCHEDULE_TASKS" | "UNKNOWN",
        "data": {
          // specific fields based on action
          "title": "...", 
          "date": "...",
          "startTime": "...",
          "category": "...",
          "keywords": "..." // for delete
        },
        "confirmation": "Brief confirmation message to show user"
      }

      Respond ONLY with the JSON object. Do not wrap in markdown code blocks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("AI voice command error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
