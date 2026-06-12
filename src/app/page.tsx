"use client";

import { useState, useRef } from "react";

interface UploadResponse {
  id?: string;
  r2_key?: string;
  status?: string;
  error?: string;
}

interface ExtractResponse {
  id?: string;
  extracted_data?: string;
  status?: string;
  error?: string;
}

type AppStatus = "idle" | "uploading" | "extracting" | "done" | "error";

const DARK = {
  bg: "#0a0a0f", surface: "#111118", card: "#16161f", border: "#22222e",
  borderHover: "#6366f1", text: "#e8e8f0", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#a5b4fc",
  errorBg: "#1a0f0f", errorBorder: "#3f1515", errorText: "#f87171",
  successText: "#4ade80", previewBg: "#0a0a0f", codeBg: "#0d0d14", codeText: "#c4b5fd",
  toggleBg: "#22222e", toggleIcon: "☀️", inputBg: "#0d0d14",
};

const LIGHT = {
  bg: "#f8f9fc", surface: "#ffffff", card: "#ffffff", border: "#e2e5ed",
  borderHover: "#6366f1", text: "#111827", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#4f46e5",
  errorBg: "#fef2f2", errorBorder: "#fecaca", errorText: "#dc2626",
  successText: "#16a34a", previewBg: "#f3f4f6", codeBg: "#f8f9fc", codeText: "#4f46e5",
  toggleBg: "#e2e5ed", toggleIcon: "🌙", inputBg: "#f9fafb",
};

const DEFAULT_PROMPT = "Extract all relevant information from this image and return it as a JSON object. Respond with ONLY valid JSON, no markdown formatting or extra text.";

export default function Home() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult("");
    setErrorMsg("");
    setAppStatus("idle");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleUploadAndExtract() {
    if (!file) return;
    setAppStatus("uploading");
    setResult("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    const uploadData = await uploadRes.json() as UploadResponse;

    if (uploadData.error) { setErrorMsg(uploadData.error); setAppStatus("error"); return; }

    setAppStatus("extracting");

    const extractRes = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: uploadData.id, prompt: prompt.trim() || undefined }),
    });
    const extractData = await extractRes.json() as ExtractResponse;

    if (extractData.error) { setErrorMsg(extractData.error); setAppStatus("error"); return; }

    setAppStatus("done");
    setResult(extractData.extracted_data ?? "");
  }

  function formatResult(raw: string) {
    try { return JSON.stringify(JSON.parse(raw), null, 2); }
    catch { return raw; }
  }

  function handleCopy() {
    navigator.clipboard.writeText(formatResult(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setFile(null); setPreview(""); setResult(""); setErrorMsg(""); setAppStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = appStatus === "uploading" || appStatus === "extracting";

  return (
    <div style={{ background: t.bg, minHeight: "100vh", transition: "background 0.2s" }}>
      {/* Navbar */}
      <nav style={{
        borderBottom: `1px solid ${t.border}`, background: t.surface,
        padding: "0 2rem", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
        boxShadow: dark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
          }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text, letterSpacing: "-0.01em" }}>ImageExtract</span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px",
            background: dark ? "#1e1e3a" : "#ede9fe", color: t.accentText, borderRadius: 4,
          }}>AI</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <a href="/admin" style={{
            background: t.toggleBg, border: `1px solid ${t.border}`,
            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
            fontSize: "0.82rem", color: t.textMuted, textDecoration: "none",
            fontWeight: 500, transition: "all 0.2s",
          }}>⚙️ Admin</a>
          <button onClick={() => setDark(!dark)} style={{
            background: t.toggleBg, border: `1px solid ${t.border}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: "0.85rem", color: t.textMuted, transition: "all 0.2s",
          }}>
            {t.toggleIcon} {dark ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>
            Image Data Extraction
          </h1>
          <p style={{ margin: 0, color: t.textMuted, fontSize: "0.95rem" }}>
            Upload an image and AI will extract structured data from it automatically.
          </p>
        </div>

        {/* Main card */}
        <div style={{
          background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden",
          boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)",
        }}>
          {/* Card header */}
          <div style={{
            padding: "1rem 1.5rem", borderBottom: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: t.text }}>Upload Image</span>
              {file && <span style={{
                fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20,
                background: dark ? "#1e1e3a" : "#ede9fe", color: t.accentText, fontWeight: 500,
              }}>Ready</span>}
            </div>
            {file && (
              <button onClick={handleReset} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.8rem", color: t.textMuted, padding: "2px 6px",
              }}>✕ Clear</button>
            )}
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              style={{
                border: `2px dashed ${dragging ? t.borderHover : t.border}`, borderRadius: 12,
                minHeight: preview ? "auto" : 200, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
                background: dragging ? (dark ? "#1a1a2e" : "#ede9fe") : (preview ? t.previewBg : t.inputBg),
                transition: "all 0.2s", overflow: "hidden",
              }}
            >
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {preview ? (
                <img src={preview} alt="preview" style={{
                  maxWidth: "100%", maxHeight: 320, objectFit: "contain",
                  display: "block", borderRadius: 10, padding: "0.75rem",
                }} />
              ) : (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <div style={{ fontSize: 40, marginBottom: "0.75rem", opacity: 0.6 }}>🖼</div>
                  <p style={{ margin: "0 0 0.4rem", color: t.text, fontSize: "0.9rem", fontWeight: 500 }}>
                    Drop image here or <span style={{ color: t.accent, textDecoration: "underline" }}>browse</span>
                  </p>
                  <p style={{ margin: 0, color: t.textMuted, fontSize: "0.8rem" }}>PNG, JPG, WEBP, GIF — max 10MB</p>
                </div>
              )}
            </div>

            {/* File info */}
            {file && (
              <div style={{
                padding: "0.6rem 0.9rem", background: t.inputBg, borderRadius: 8,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span style={{ fontSize: "0.8rem", color: t.textMuted }}>📎</span>
                <span style={{ fontSize: "0.82rem", color: t.textSubtle, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <span style={{ fontSize: "0.78rem", color: t.textMuted, flexShrink: 0 }}>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}

            {/* Custom prompt */}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: t.textMuted, display: "block", marginBottom: "0.4rem" }}>
                Extraction prompt <span style={{ fontWeight: 400, color: t.textSubtle }}>(optional)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={DEFAULT_PROMPT}
                rows={2}
                style={{
                  width: "100%", padding: "0.65rem 0.9rem", borderRadius: 8,
                  border: `1px solid ${t.border}`, background: t.inputBg,
                  color: t.text, fontSize: "0.82rem", resize: "vertical",
                  outline: "none", fontFamily: "inherit", lineHeight: 1.5,
                  boxSizing: "border-box", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = t.border}
              />
            </div>

            {/* Button */}
            <button
              onClick={handleUploadAndExtract}
              disabled={!file || busy}
              style={{
                width: "100%", padding: "0.8rem 1.5rem",
                background: (!file || busy) ? (dark ? "#1e1e2e" : "#e5e7eb") : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: (!file || busy) ? t.textMuted : "#fff",
                border: "none", borderRadius: 10, fontSize: "0.9rem", fontWeight: 600,
                cursor: (!file || busy) ? "not-allowed" : "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              {appStatus === "uploading" && <><Spinner /> Uploading...</>}
              {appStatus === "extracting" && <><Spinner /> Analysing with AI...</>}
              {!busy && "Extract Data"}
            </button>

            {/* Status */}
            {appStatus === "uploading" && <StatusBar color={t.accentText} bg={dark ? "#1a1a2e" : "#ede9fe"} border={dark ? "#2a2a4a" : "#c7d2fe"}>Uploading image to secure storage...</StatusBar>}
            {appStatus === "extracting" && <StatusBar color={t.accentText} bg={dark ? "#1a1a2e" : "#ede9fe"} border={dark ? "#2a2a4a" : "#c7d2fe"}>Gemini AI is reading your image...</StatusBar>}
            {appStatus === "error" && <StatusBar color={t.errorText} bg={t.errorBg} border={t.errorBorder}>❌ {errorMsg}</StatusBar>}
          </div>

          {/* Result */}
          {appStatus === "done" && result && (
            <div style={{ borderTop: `1px solid ${t.border}` }}>
              <div style={{
                padding: "0.85rem 1.5rem", display: "flex", alignItems: "center",
                justifyContent: "space-between", background: dark ? "#111118" : "#f9fafb",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: t.successText, fontSize: "0.85rem" }}>✓</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: t.text }}>Extracted Data</span>
                  <span style={{ fontSize: "0.72rem", color: t.textMuted }}>JSON</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={handleCopy} style={{
                    padding: "4px 12px", borderRadius: 7, border: `1px solid ${t.border}`,
                    background: copied ? (dark ? "#1a2e1a" : "#f0fdf4") : t.toggleBg,
                    color: copied ? t.successText : t.textMuted,
                    fontSize: "0.78rem", cursor: "pointer", fontWeight: 500, transition: "all 0.2s",
                  }}>{copied ? "✓ Copied" : "Copy"}</button>
                  <button onClick={handleReset} style={{
                    padding: "4px 12px", borderRadius: 7, border: `1px solid ${t.border}`,
                    background: t.toggleBg, color: t.textMuted, fontSize: "0.78rem", cursor: "pointer", fontWeight: 500,
                  }}>New</button>
                </div>
              </div>
              <pre style={{
                margin: 0, padding: "1.25rem 1.5rem", background: t.codeBg,
                fontSize: "0.82rem", lineHeight: 1.7, overflowX: "auto", color: t.codeText,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                maxHeight: 420, overflowY: "auto",
              }}>{formatResult(result)}</pre>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.78rem", color: t.textMuted }}>
          Powered by Gemini 3.5 Flash · Cloudflare Workers · R2 Storage
        </p>
      </main>
    </div>
  );
}

function Spinner() {
  return <span style={{
    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff", borderRadius: "50%", display: "inline-block",
    animation: "spin 0.7s linear infinite",
  }} />;
}

function StatusBar({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <div style={{
      padding: "0.65rem 1rem", background: bg, border: `1px solid ${border}`,
      borderRadius: 8, fontSize: "0.85rem", color, fontWeight: 500,
    }}>{children}</div>
  );
}
