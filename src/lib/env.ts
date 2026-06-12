import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  GEMINI_API_KEY: string;
  ADMIN_PASSWORD: string;
}

export function getEnv(): Env {
  return getCloudflareContext().env as unknown as Env;
}
