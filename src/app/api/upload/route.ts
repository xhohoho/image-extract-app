import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { uploadImageToR2 } from "@/lib/r2";
import { insertImageRecord } from "@/lib/d1";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const env = getEnv();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
