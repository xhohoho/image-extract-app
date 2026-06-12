import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { listImageRecords, deleteAllImageRecords } from "@/lib/d1";
import { deleteImageFromR2 } from "@/lib/r2";

function checkAuth(req: NextRequest, env: { ADMIN_PASSWORD: string }) {
  const auth = req.headers.get("x-admin-password");
  return auth === env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  const env = getEnv();
  if (!checkAuth(req, env)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const records = await listImageRecords(env, 500);
  return NextResponse.json({ records });
}

export async function DELETE(req: NextRequest) {
  const env = getEnv();
  if (!checkAuth(req, env)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all: remove all R2 objects then clear DB
  const records = await listImageRecords(env, 1000);
  await Promise.all(records.map((r) => deleteImageFromR2(env, r.r2_key)));
  await deleteAllImageRecords(env);

  return NextResponse.json({ deleted: records.length });
}
