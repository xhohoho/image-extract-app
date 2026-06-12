"use client";

import { useState, useRef, useCallback } from "react";

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

interface ImageRecord {
  id: string;
  r2_key: string;
  uploaded_at: number;
  extracted_data: string | null;
  status: string;
}

type AppStatus = "idle" | "uploading" | "extracting" | "done" | "error";

const DARK = {
  bg: "#0a0a0f", surface: "#111118", card: "#16161f", border: "#22222e",
  borderHover: "#6366f1", text: "#e8e8f0", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#a5b4fc",
  errorBg: "#1a0f0f", errorBorder: "#3f1515", errorText: "#f87171",
  successText: "#4ade80", previewBg: "#0a0a0f", codeBg: "#0d0d14", codeText: "#c4b5fd",
  toggleBg: "#22222e", toggleIcon: "☀️", inputBg: "#0d0d14", rowHover: "#1a1a27",
  warningText: "#fbbf24",
};

const LIGHT = {
  bg: "#f8f9fc", surface: "#ffffff", card: "#ffffff", border: "#e2e5ed",
  borderHover: "#6366f1", text: "#111827", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#4f46e5",
  errorBg: "#fef2f2", errorBorder: "#fecaca", errorText: "#dc2626",
  successText: "#16a34a", previewBg: "#f3f4f6", codeBg: "#f8f9fc", codeText: "#4f46e5",
  toggleBg: "#e2e5ed", toggleIcon: "🌙", inputBg: "#f9fafb", rowHover: "#f3f4f6",
  warningText: "#d97706",
};

const DEFAULT_PROMPT = "Extract all relevant information from this image and return it as a JSON object. Respond with ONLY valid JSON, no markdown formatting or extra text.";

export default function Home() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  // ── Main app state ──
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Admin state ──
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminRecords, setAdminRecords] = useState<ImageRecord[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState("");

  function showAdminSuccess(msg: string) {
    setAdminSuccess(msg);
    setTimeout(() => setAdminSuccess(""), 3000);
  }

  // ── Main app handlers ──
  function handleFile(f: File) {
    setFile(f); setResult(""); setErrorMsg(""); setAppStatus("idle");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleUploadAndExtract() {
    if (!file) return;
    setAppStatus("uploading"); setResult(""); setErrorMsg("");
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

  // ── Admin handlers ──
  const fetchAdminRecords = useCallback(async (pw: string) => {
    setAdminLoading(true); setAdminError("");
    try {
      const res = await fetch("/api/admin/images", { headers: { "x-admin-password": pw } });
      if (res.status === 401) { setAdminAuthed(false); return; }
      const data = await res.json() as { records: ImageRecord[] };
      setAdminRecords(data.records ?? []);
    } catch { setAdminError("Failed to load records."); }
    finally { setAdminLoading(false); }
  }, []);

  async function handleAdminLogin() {
    setAdminAuthLoading(true); setAdminAuthError("");
    try {
      const res = await fetch("/api/admin/images", { headers: { "x-admin-password": adminPassword } });
      if (res.status === 401) {
        setAdminAuthError("Wrong password.");
      } else {
        const data = await res.json() as { records: ImageRecord[] };
        setAdminRecords(data.records ?? []);
        setAdminAuthed(true);
        setShowAdminModal(false);
      }
    } catch { setAdminAuthError("Connection error."); }
    finally { setAdminAuthLoading(false); }
  }

  function handleAdminOpen() {
    if (adminAuthed) return; // already authed, panel visible
    setShowAdminModal(true);
    setAdminAuthError("");
  }

  function handleAdminClose() {
    setAdminAuthed(false);
    setAdminPassword("");
    setAdminRecords([]);
    setExpandedId(null);
    setAdminError("");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": adminPassword },
      });
      if (res.ok) {
        setAdminRecords((prev) => prev.filter((r) => r.id !== id));
        if (expandedId === id) setExpandedId(null);
        showAdminSuccess("Image deleted.");
      } else { setAdminError("Delete failed."); }
    } catch { setAdminError("Delete failed."); }
    finally { setDeletingId(null); }
  }

  async function handleDeleteAll() {
    setDeleteAllLoading(true);
    try {
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "x-admin-password": adminPassword },
      });
      if (res.ok) {
        const data = await res.json() as { deleted: number };
        setAdminRecords([]);
        setDeleteAllConfirm(false);
        setExpandedId(null);
        showAdminSuccess(`Deleted ${data.deleted} image${data.deleted !== 1 ? "s" : ""}.`);
      } else { setAdminError("Delete all failed."); }
    } catch { setAdminError("Delete all failed."); }
    finally { setDeleteAllLoading(false); }
  }

  function imageUrl(r2Key: string) {
    return `/api/admin/image?key=${encodeURIComponent(r2Key)}&pw=${encodeURIComponent(adminPassword)}`;
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }

  function statusColor(status: string) {
    if (status === "done") return t.successText;
    if (status === "error") return t.errorText;
    return t.warningText;
  }

  return (
    <div style={{ background: t.bg, minHeight: "100vh", transition: "background 0.2s" }}>

      {/* ── Password modal ── */}
      {showAdminModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdminModal(false); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
        >
          <div style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 16,
            padding: "2rem", width: "100%", maxWidth: 360,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>🔐</div>
              <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 700, color: t.text }}>Admin Access</h2>
              <p style={{ margin: 0, fontSize: "0.82rem", color: t.textMuted }}>Enter your admin password</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                autoFocus
                style={{
                  padding: "0.7rem 1rem", borderRadius: 8,
                  border: `1px solid ${adminAuthError ? t.errorBorder : t.border}`,
                  background: t.inputBg, color: t.text, fontSize: "0.9rem",
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = adminAuthError ? t.errorBorder : t.border}
              />
              {adminAuthError && (
                <div style={{
                  padding: "0.5rem 0.75rem", background: t.errorBg,
                  border: `1px solid ${t.errorBorder}`, borderRadius: 7,
                  fontSize: "0.82rem", color: t.errorText,
                }}>❌ {adminAuthError}</div>
              )}
              <button
                onClick={handleAdminLogin}
                disabled={!adminPassword || adminAuthLoading}
                style={{
                  padding: "0.72rem", borderRadius: 9, border: "none",
                  background: (!adminPassword || adminAuthLoading) ? (dark ? "#1e1e2e" : "#e5e7eb") : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: (!adminPassword || adminAuthLoading) ? t.textMuted : "#fff",
                  fontSize: "0.9rem", fontWeight: 600,
                  cursor: (!adminPassword || adminAuthLoading) ? "not-allowed" : "pointer",
                }}>{adminAuthLoading ? "Checking…" : "Login"}</button>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  padding: "0.5rem", borderRadius: 8, border: `1px solid ${t.border}`,
                  background: "none", color: t.textMuted, fontSize: "0.82rem", cursor: "pointer",
                }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete all confirm modal ── */}
      {deleteAllConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{
            background: t.card, border: `1px solid ${t.errorBorder}`, borderRadius: 14,
            padding: "1.75rem", maxWidth: 360, width: "100%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: "0.75rem" }}>⚠️</div>
            <h3 style={{ margin: "0 0 0.5rem", color: t.text, textAlign: "center", fontSize: "1.05rem" }}>Delete everything?</h3>
            <p style={{ margin: "0 0 1.25rem", color: t.textMuted, fontSize: "0.85rem", textAlign: "center" }}>
              Permanently deletes all {adminRecords.length} records from D1 and all images from R2.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setDeleteAllConfirm(false)} style={{
                flex: 1, padding: "0.65rem", borderRadius: 8, border: `1px solid ${t.border}`,
                background: t.toggleBg, color: t.text, fontSize: "0.875rem", cursor: "pointer", fontWeight: 500,
              }}>Cancel</button>
              <button onClick={handleDeleteAll} disabled={deleteAllLoading} style={{
                flex: 1, padding: "0.65rem", borderRadius: 8, border: "none",
                background: "#dc2626", color: "#fff", fontSize: "0.875rem",
                cursor: deleteAllLoading ? "not-allowed" : "pointer", fontWeight: 600,
              }}>{deleteAllLoading ? "Deleting…" : "Yes, delete all"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
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
          {adminAuthed ? (
            <button onClick={handleAdminClose} style={{
              background: dark ? "#1e1e3a" : "#ede9fe", border: `1px solid ${t.borderHover}`,
              borderRadius: 8, padding: "5px 12px", cursor: "pointer",
              fontSize: "0.82rem", color: t.accentText, fontWeight: 600,
            }}>⚙️ Admin ✓</button>
          ) : (
            <button onClick={handleAdminOpen} style={{
              background: t.toggleBg, border: `1px solid ${t.border}`,
              borderRadius: 8, padding: "5px 12px", cursor: "pointer",
              fontSize: "0.82rem", color: t.textMuted, fontWeight: 500,
            }}>⚙️ Admin</button>
          )}
          <button onClick={() => setDark(!dark)} style={{
            background: t.toggleBg, border: `1px solid ${t.border}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: "0.85rem", color: t.textMuted, transition: "all 0.2s",
          }}>{t.toggleIcon} {dark ? "Light" : "Dark"}</button>
        </div>
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* ── Main upload section ── */}
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem", fontWeight: 700, color: t.text, letterSpacing: "-0.02em" }}>
              Image Data Extraction
            </h1>
            <p style={{ margin: 0, color: t.textMuted, fontSize: "0.95rem" }}>
              Upload an image and AI will extract structured data from it automatically.
            </p>
          </div>

          <div style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden",
            boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)",
          }}>
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

              {appStatus === "uploading" && <StatusBar color={t.accentText} bg={dark ? "#1a1a2e" : "#ede9fe"} border={dark ? "#2a2a4a" : "#c7d2fe"}>Uploading image to secure storage...</StatusBar>}
              {appStatus === "extracting" && <StatusBar color={t.accentText} bg={dark ? "#1a1a2e" : "#ede9fe"} border={dark ? "#2a2a4a" : "#c7d2fe"}>Gemini AI is reading your image...</StatusBar>}
              {appStatus === "error" && <StatusBar color={t.errorText} bg={t.errorBg} border={t.errorBorder}>❌ {errorMsg}</StatusBar>}
            </div>

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
        </div>

        {/* ── Admin panel (shown inline after login) ── */}
        {adminAuthed && (
          <div style={{ marginTop: "3rem" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem",
            }}>
              <div>
                <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.2rem", fontWeight: 700, color: t.text }}>
                  ⚙️ Admin — Database
                </h2>
                <p style={{ margin: 0, fontSize: "0.82rem", color: t.textMuted }}>
                  {adminRecords.length} record{adminRecords.length !== 1 ? "s" : ""} · D1 + R2
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => fetchAdminRecords(adminPassword)}
                  disabled={adminLoading}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: 8, border: `1px solid ${t.border}`,
                    background: t.toggleBg, color: t.textMuted, fontSize: "0.82rem",
                    cursor: adminLoading ? "not-allowed" : "pointer", fontWeight: 500,
                  }}>
                  {adminLoading ? "Loading…" : "↺ Refresh"}
                </button>
                {adminRecords.length > 0 && (
                  <button
                    onClick={() => setDeleteAllConfirm(true)}
                    style={{
                      padding: "0.5rem 1rem", borderRadius: 8, border: `1px solid ${t.errorBorder}`,
                      background: t.errorBg, color: t.errorText, fontSize: "0.82rem",
                      cursor: "pointer", fontWeight: 600,
                    }}>🗑 Delete All</button>
                )}
                <button
                  onClick={handleAdminClose}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: 8, border: `1px solid ${t.border}`,
                    background: t.toggleBg, color: t.textMuted, fontSize: "0.82rem",
                    cursor: "pointer", fontWeight: 500,
                  }}>✕ Close</button>
              </div>
            </div>

            {adminSuccess && (
              <div style={{
                marginBottom: "0.75rem", padding: "0.6rem 1rem",
                background: dark ? "#0f1f0f" : "#f0fdf4", border: `1px solid ${dark ? "#1a3a1a" : "#bbf7d0"}`,
                borderRadius: 8, fontSize: "0.85rem", color: t.successText, fontWeight: 500,
              }}>✓ {adminSuccess}</div>
            )}
            {adminError && (
              <div style={{
                marginBottom: "0.75rem", padding: "0.6rem 1rem",
                background: t.errorBg, border: `1px solid ${t.errorBorder}`,
                borderRadius: 8, fontSize: "0.85rem", color: t.errorText,
                display: "flex", justifyContent: "space-between",
              }}>
                ❌ {adminError}
                <button onClick={() => setAdminError("")} style={{ background: "none", border: "none", color: t.errorText, cursor: "pointer" }}>✕</button>
              </div>
            )}

            {adminLoading && adminRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: t.textMuted }}>Loading…</div>
            ) : adminRecords.length === 0 ? (
              <div style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
                padding: "3rem", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: "0.5rem", opacity: 0.5 }}>🗄️</div>
                <p style={{ margin: 0, color: t.textMuted, fontSize: "0.9rem" }}>No records found.</p>
              </div>
            ) : (
              <div style={{
                background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden",
                boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)",
              }}>
                {adminRecords.map((rec, i) => (
                  <div key={rec.id}>
                    {/* Row */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "0.85rem 1.25rem",
                      borderBottom: `1px solid ${t.border}`,
                      background: expandedId === rec.id ? t.rowHover : "transparent",
                      transition: "background 0.15s",
                    }}>
                      {/* Thumbnail */}
                      <div style={{
                        width: 52, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                        border: `1px solid ${t.border}`, background: t.inputBg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <img
                          src={`${imageUrl(rec.r2_key)}`}
                          alt="thumb"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.75rem", color: t.accentText, fontFamily: "monospace" }}>
                            {rec.id.slice(0, 12)}…
                          </span>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 600, color: statusColor(rec.status),
                            textTransform: "capitalize",
                          }}>{rec.status}</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: t.textMuted }}>{formatDate(rec.uploaded_at)}</div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                        <button
                          onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
                            background: t.toggleBg, color: t.textMuted, fontSize: "0.78rem",
                            cursor: "pointer", fontWeight: 500,
                          }}>{expandedId === rec.id ? "▲ Hide" : "▼ View"}</button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          disabled={deletingId === rec.id}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.errorBorder}`,
                            background: t.errorBg, color: t.errorText, fontSize: "0.78rem",
                            cursor: deletingId === rec.id ? "not-allowed" : "pointer",
                            opacity: deletingId === rec.id ? 0.5 : 1, fontWeight: 500,
                          }}>{deletingId === rec.id ? "…" : "Delete"}</button>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {expandedId === rec.id && (
                      <div style={{
                        padding: "1rem 1.25rem 1.25rem",
                        borderBottom: i < adminRecords.length - 1 ? `1px solid ${t.border}` : "none",
                        background: t.rowHover, display: "flex", gap: "1.25rem", flexWrap: "wrap",
                      }}>
                        {/* Full image */}
                        <div style={{ flexShrink: 0 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textMuted, marginBottom: "0.4rem" }}>IMAGE</div>
                          <img
                            src={imageUrl(rec.r2_key)}
                            alt="full"
                            style={{
                              maxWidth: 220, maxHeight: 180, objectFit: "contain", borderRadius: 8,
                              border: `1px solid ${t.border}`, background: t.inputBg, display: "block",
                            }}
                            onError={(e) => { (e.target as HTMLImageElement).alt = "Failed to load"; }}
                          />
                        </div>

                        {/* Extracted data */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: t.textMuted, marginBottom: "0.4rem" }}>EXTRACTED DATA</div>
                          <pre style={{
                            margin: 0, padding: "0.75rem", background: t.codeBg, borderRadius: 8,
                            fontSize: "0.75rem", color: t.codeText, overflowX: "auto",
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            maxHeight: 200, overflowY: "auto",
                            fontFamily: "'Fira Code', 'Consolas', monospace",
                            border: `1px solid ${t.border}`,
                          }}>
                            {rec.extracted_data
                              ? (() => { try { return JSON.stringify(JSON.parse(rec.extracted_data), null, 2); } catch { return rec.extracted_data; } })()
                              : "(no data yet)"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
