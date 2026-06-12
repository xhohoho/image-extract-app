import { Env } from "./env";

export async function uploadImageToR2(
  env: Env,
  key: string,
  file: ArrayBuffer,
  contentType: string
) {
  await env.IMAGES_BUCKET.put(key, file, {
    httpMetadata: { contentType },
  });
}

export async function getImageFromR2(env: Env, key: string) {
  const obj = await env.IMAGES_BUCKET.get(key);
  if (!obj) return null;
  return obj;
}
