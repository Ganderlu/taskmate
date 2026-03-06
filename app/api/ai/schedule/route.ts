import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { tasks, date } = await req.json();

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
      You are an AI Scheduling Assistant.
      I have a list of tasks for ${date || "today"}. Please assign optimal start and end times for these tasks to create a productive schedule.
      Assume a working day from 9:00 AM to 5:00 PM (09:00 to 17:00), but feel free to extend if necessary.
      Consider the task description and title to estimate duration.
      Ensure tasks do not overlap.
      
      Tasks:
      ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description, startTime: t.startTime, endTime: t.endTime })))}

      Return a JSON array of objects with the following structure:
      [
        {
          "id": "task_id",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "reasoning": "Brief explanation"
        }
      ]

      Respond ONLY with the JSON array. Do not wrap in markdown code blocks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const scheduledTasks = JSON.parse(cleanText);
      return NextResponse.json({ tasks: scheduledTasks });
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("AI scheduling error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
