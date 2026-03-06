import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json();

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Tasks array is required" },
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
      You are an AI Task Prioritization Engine.
      Given the following list of tasks, assign a priority level ("high", "medium", "low") to each task based on urgency and importance inferred from the title, description, and due date.
      Also, return the tasks sorted in the order they should be completed.

      Tasks:
      ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, date: t.date, category: t.category })))}

      Return a JSON array of objects with the following structure:
      [
        {
          "id": "task_id",
          "priority": "high" | "medium" | "low",
          "reasoning": "Brief explanation of why this priority was assigned"
        }
      ]

      Respond ONLY with the JSON array. Do not wrap in markdown code blocks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const prioritizedTasks = JSON.parse(cleanText);
      return NextResponse.json({ tasks: prioritizedTasks });
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("AI prioritization error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
