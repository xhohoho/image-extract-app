import { Env } from "./env";

export interface ImageRecord {
  id: string;
  r2_key: string;
  uploaded_at: number;
  extracted_data: string | null;
  status: string;
}

export async function insertImageRecord(env: Env, record: ImageRecord) {
  await env.DB.prepare(
    "INSERT INTO images (id, r2_key, uploaded_at, extracted_data, status) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(record.id, record.r2_key, record.uploaded_at, record.extracted_data, record.status)
    .run();
}

export async function updateImageRecord(env: Env, id: string, extractedData: string, status: string) {
  await env.DB.prepare("UPDATE images SET extracted_data = ?, status = ? WHERE id = ?")
    .bind(extractedData, status, id)
    .run();
}

export async function getImageRecord(env: Env, id: string) {
  const result = await env.DB.prepare("SELECT * FROM images WHERE id = ?")
    .bind(id)
    .first<ImageRecord>();
  return result ?? null;
}

export async function listImageRecords(env: Env, limit = 50) {
  const result = await env.DB.prepare(
    "SELECT * FROM images ORDER BY uploaded_at DESC LIMIT ?"
  )
    .bind(limit)
    .all<ImageRecord>();
  return result.results ?? [];
}

export async function deleteImageRecord(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
}

export async function deleteAllImageRecords(env: Env) {
  await env.DB.prepare("DELETE FROM images").run();
}
