// Cloudflare bindings available via process.env in next-on-pages (runtime: edge)
export interface Env {
  IMAGES_BUCKET: R2Bucket;
  DB: D1Database;
  GEMINI_API_KEY: string;
}

export function getEnv(): Env {
  // @ts-ignore - injected by @cloudflare/next-on-pages at runtime
  return process.env as unknown as Env;
}
