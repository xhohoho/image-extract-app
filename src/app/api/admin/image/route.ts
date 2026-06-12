import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getImageFromR2 } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const env = getEnv();

  // Accept password via query param (for img src usage) or header
  const pw = req.nextUrl.searchParams.get("pw") ?? req.headers.get("x-admin-password") ?? "";
  if (pw !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const obj = await getImageFromR2(env, key);
  if (!obj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await obj.arrayBuffer();
  const contentType = obj.httpMetadata?.contentType ?? "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
