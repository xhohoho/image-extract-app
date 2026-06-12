import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getImageFromR2 } from "@/lib/r2";
import { getImageRecord, updateImageRecord } from "@/lib/d1";
import { extractDataFromImage } from "@/lib/gemini";

export const runtime = "edge";

const DEFAULT_PROMPT =
  "Extract all relevant information from this image and return it as a JSON object. " +
  "Respond with ONLY valid JSON, no markdown formatting or extra text.";

export async function POST(req: NextRequest) {
  const env = getEnv();
  const { id, prompt } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const record = await getImageRecord(env, id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const obj = await getImageFromR2(env, record.r2_key);
  if (!obj) {
    return NextResponse.json({ error: "Image not found in storage" }, { status: 404 });
  }

  const arrayBuffer = await obj.arrayBuffer();
  const contentType = obj.httpMetadata?.contentType || "image/jpeg";

  try {
    const resultText = await extractDataFromImage(
      env.GEMINI_API_KEY,
      arrayBuffer,
      contentType,
      prompt || DEFAULT_PROMPT
    );

    // Try to clean up potential markdown code fences
    const cleaned = resultText.replace(/```json|```/g, "").trim();

    await updateImageRecord(env, id, cleaned, "done");

    return NextResponse.json({ id, extracted_data: cleaned, status: "done" });
  } catch (err: any) {
    await updateImageRecord(env, id, JSON.stringify({ error: err.message }), "error");
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
