import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { uploadImageToR2 } from "@/lib/r2";
import { insertImageRecord } from "@/lib/d1";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const env = getEnv();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WEBP and GIF are allowed." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const extension = file.name.split(".").pop() || "bin";
  const r2Key = `images/${id}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  await uploadImageToR2(env, r2Key, arrayBuffer, file.type);

  await insertImageRecord(env, {
    id,
    r2_key: r2Key,
    uploaded_at: Date.now(),
    extracted_data: null,
    status: "pending",
  });

  return NextResponse.json({ id, r2_key: r2Key, status: "pending" });
}
