"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<string>("");

  async function handleUploadAndExtract() {
    if (!file) return;
    setStatus("Uploading...");
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const uploadData = await uploadRes.json();

    if (uploadData.error) {
      setStatus(`Error: ${uploadData.error}`);
      return;
    }

    setStatus("Extracting data with AI...");

    const extractRes = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: uploadData.id }),
    });
    const extractData = await extractRes.json();

    if (extractData.error) {
      setStatus(`Error: ${extractData.error}`);
      return;
    }

    setStatus("Done");
    setResult(extractData.extracted_data);
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>Image Data Extractor</h1>
      <p>Upload an image and let AI extract structured data from it.</p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleUploadAndExtract} disabled={!file}>
          Upload & Extract
        </button>
      </div>

      {status && <p style={{ marginTop: "1rem" }}>{status}</p>}

      {result && (
        <pre
          style={{
            background: "#f4f4f4",
            padding: "1rem",
            borderRadius: "8px",
            overflowX: "auto",
            marginTop: "1rem",
          }}
        >
          {result}
        </pre>
      )}
    </main>
  );
}
