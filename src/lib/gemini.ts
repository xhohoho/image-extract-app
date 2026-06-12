interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

// Calls Google Gemini's vision model to extract structured data from an image.
// Set GEMINI_API_KEY via: wrangler secret put GEMINI_API_KEY
export async function extractDataFromImage(
  apiKey: string,
  imageBytes: ArrayBuffer,
  mimeType: string,
  prompt: string
): Promise<string> {
  const base64 = arrayBufferToBase64(imageBytes);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              { text: prompt },
            ],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errText}`);
  }

  const data = await res.json() as GeminiResponse;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
