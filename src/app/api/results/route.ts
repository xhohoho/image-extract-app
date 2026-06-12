import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { listImageRecords } from "@/lib/d1";

export const runtime = "edge";

export async function GET() {
  const env = getEnv();
  const records = await listImageRecords(env);
  return NextResponse.json({ records });
}
