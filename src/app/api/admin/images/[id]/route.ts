import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getImageRecord, deleteImageRecord } from "@/lib/d1";
import { deleteImageFromR2 } from "@/lib/r2";

function checkAuth(req: NextRequest, env: { ADMIN_PASSWORD: string }) {
  const auth = req.headers.get("x-admin-password");
  return auth === env.ADMIN_PASSWORD;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getEnv();
  if (!checkAuth(req, env)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await getImageRecord(env, id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  await deleteImageFromR2(env, record.r2_key);
  await deleteImageRecord(env, id);

  return NextResponse.json({ deleted: id });
}
