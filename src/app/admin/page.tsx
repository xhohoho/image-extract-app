"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageRecord {
  id: string;
  r2_key: string;
  uploaded_at: number;
  extracted_data: string | null;
  status: string;
}

const DARK = {
  bg: "#0a0a0f", surface: "#111118", card: "#16161f", border: "#22222e",
  borderHover: "#6366f1", text: "#e8e8f0", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#a5b4fc",
  errorBg: "#1a0f0f", errorBorder: "#3f1515", errorText: "#f87171",
  successText: "#4ade80", codeBg: "#0d0d14", codeText: "#c4b5fd",
  toggleBg: "#22222e", inputBg: "#0d0d14", rowHover: "#1a1a27",
  warningBg: "#1a1500", warningBorder: "#3d3000", warningText: "#fbbf24",
};

const LIGHT = {
  bg: "#f8f9fc", surface: "#ffffff", card: "#ffffff", border: "#e2e5ed",
  borderHover: "#6366f1", text: "#111827", textMuted: "#6b7280", textSubtle: "#9ca3af",
  accent: "#6366f1", accentEnd: "#8b5cf6", accentText: "#4f46e5",
  errorBg: "#fef2f2", errorBorder: "#fecaca", errorText: "#dc2626",
  successText: "#16a34a", codeBg: "#f8f9fc", codeText: "#4f46e5",
  toggleBg: "#e2e5ed", inputBg: "#f9fafb", rowHover: "#f3f4f6",
  warningBg: "#fffbeb", warningBorder: "#fde68a", warningText: "#d97706",
};

export default function AdminPage() {
  const [dark, setDark] = useState(true);
  const t = dark ? DARK : LIGHT;

  // Auth state
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Data state
  const [records, setRecords] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const fetchRecords = useCallback(async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/images", {
        headers: { "x-admin-password": pw },
      });
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json() as { records: ImageRecord[] };
      setRecords(data.records ?? []);
    } catch {
      setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleLogin() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/images", {
        headers: { "x-admin-password": password },
      });
      if (res.status === 401) {
        setAuthError("Wrong password.");
      } else {
        const data = await res.json() as { records: ImageRecord[] };
        setRecords(data.records ?? []);
        setAuthed(true);
      }
    } catch {
      setAuthError("Connection error.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/images/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (expandedId === id) setExpandedId(null);
        showSuccess("Image deleted.");
      } else {
        setError("Delete failed.");
      }
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    setDeleteAllLoading(true);
    try {
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        const data = await res.json() as { deleted: number };
        setRecords([]);
        setDeleteAllConfirm(false);
        showSuccess(`Deleted ${data.deleted} image${data.deleted !== 1 ? "s" : ""}.`);
      } else {
        setError("Delete all failed.");
      }
    } catch {
      setError("Delete all failed.");
    } finally {
      setDeleteAllLoading(false);
    }
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }

  function statusColor(status: string) {
    if (status === "done") return t.successText;
    if (status === "error") return t.errorText;
    return t.warningText;
  }

  // ── Login screen ──────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <nav style={{
          borderBottom: `1px solid ${t.border}`, background: t.surface,
          padding: "0 2rem", height: 56, display: "flex", alignItems: "center",
          justifyContent: "space-between",
          boxShadow: dark ? "0 1px 12px rgba(0,0,0,0.4)" : "0 1px 8px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text }}>ImageExtract</span>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px",
              background: dark ? "#1e1e3a" : "#ede9fe", color: t.accentText, borderRadius: 4,
            }}>ADMIN</span>
          </div>
          <button onClick={() => setDark(!dark)} style={{
            background: t.toggleBg, border: `1px solid ${t.border}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: "0.85rem", color: t.textMuted,
          }}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 16,
            padding: "2rem", width: "100%", maxWidth: 380,
            boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 2px 16px rgba(0,0,0,0.08)",
          }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>🔐</div>
              <h2 style={{ margin: "0 0 0.3rem", fontSize: "1.2rem", fontWeight: 700, color: t.text }}>Admin Access</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: t.textMuted }}>Enter your admin password to continue</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{
                  padding: "0.7rem 1rem", borderRadius: 8, border: `1px solid ${authError ? t.errorBorder : t.border}`,
                  background: t.inputBg, color: t.text, fontSize: "0.9rem", outline: "none",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = t.accent}
                onBlur={(e) => e.target.style.borderColor = authError ? t.errorBorder : t.border}
                autoFocus
              />

              {authError && (
                <div style={{
                  padding: "0.5rem 0.75rem", background: t.errorBg, border: `1px solid ${t.errorBorder}`,
                  borderRadius: 7, fontSize: "0.82rem", color: t.errorText,
                }}>❌ {authError}</div>
              )}

              <button
                onClick={handleLogin}
                disabled={!password || authLoading}
                style={{
                  padding: "0.75rem", borderRadius: 9, border: "none",
                  background: (!password || authLoading) ? (dark ? "#1e1e2e" : "#e5e7eb") : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: (!password || authLoading) ? t.textMuted : "#fff",
                  fontSize: "0.9rem", fontWeight: 600, cursor: (!password || authLoading) ? "not-allowed" : "pointer",
                }}>
                {authLoading ? "Checking…" : "Login"}
              </button>

              <a href="/" style={{
                textAlign: "center", fontSize: "0.82rem", color: t.textMuted,
                textDecoration: "none", marginTop: "0.25rem",
              }}>← Back to app</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────
  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
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
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: t.text }}>ImageExtract</span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 600, padding: "2px 6px",
            background: dark ? "#1e1e3a" : "#ede9fe", color: t.accentText, borderRadius: 4,
          }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <a href="/" style={{
            padding: "5px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.toggleBg, color: t.textMuted, fontSize: "0.82rem",
            textDecoration: "none", fontWeight: 500,
          }}>← App</a>
          <button onClick={() => setDark(!dark)} style={{
            background: t.toggleBg, border: `1px solid ${t.border}`,
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: "0.85rem", color: t.textMuted,
          }}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button onClick={() => { setAuthed(false); setPassword(""); setRecords([]); }} style={{
            padding: "5px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.toggleBg, color: t.textMuted, fontSize: "0.82rem", cursor: "pointer", fontWeight: 500,
          }}>Logout</button>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.2rem", fontSize: "1.5rem", fontWeight: 700, color: t.text }}>
              Database Manager
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: t.textMuted }}>
              {records.length} record{records.length !== 1 ? "s" : ""} in D1 · R2 images
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => fetchRecords(password)}
              disabled={loading}
              style={{
                padding: "0.55rem 1rem", borderRadius: 8, border: `1px solid ${t.border}`,
                background: t.toggleBg, color: t.textMuted, fontSize: "0.85rem",
                cursor: loading ? "not-allowed" : "pointer", fontWeight: 500,
              }}>
              {loading ? "Loading…" : "↺ Refresh"}
            </button>
            {records.length > 0 && (
              <button
                onClick={() => setDeleteAllConfirm(true)}
                style={{
                  padding: "0.55rem 1rem", borderRadius: 8, border: `1px solid ${t.errorBorder}`,
                  background: t.errorBg, color: t.errorText, fontSize: "0.85rem",
                  cursor: "pointer", fontWeight: 600,
                }}>
                🗑 Delete All
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div style={{
            marginBottom: "1rem", padding: "0.65rem 1rem",
            background: dark ? "#0f1f0f" : "#f0fdf4", border: `1px solid ${dark ? "#1a3a1a" : "#bbf7d0"}`,
            borderRadius: 8, fontSize: "0.85rem", color: t.successText, fontWeight: 500,
          }}>✓ {successMsg}</div>
        )}
        {error && (
          <div style={{
            marginBottom: "1rem", padding: "0.65rem 1rem",
            background: t.errorBg, border: `1px solid ${t.errorBorder}`,
            borderRadius: 8, fontSize: "0.85rem", color: t.errorText,
          }}>❌ {error} <button onClick={() => setError("")} style={{ background: "none", border: "none", color: t.errorText, cursor: "pointer", float: "right" }}>✕</button></div>
        )}

        {/* Delete all confirm modal */}
        {deleteAllConfirm && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}>
            <div style={{
              background: t.card, border: `1px solid ${t.errorBorder}`, borderRadius: 14,
              padding: "1.75rem", maxWidth: 380, width: "100%",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}>
              <div style={{ fontSize: 32, textAlign: "center", marginBottom: "0.75rem" }}>⚠️</div>
              <h3 style={{ margin: "0 0 0.5rem", color: t.text, textAlign: "center", fontSize: "1.1rem" }}>Delete everything?</h3>
              <p style={{ margin: "0 0 1.25rem", color: t.textMuted, fontSize: "0.875rem", textAlign: "center" }}>
                This will permanently delete all {records.length} records from D1 and all images from R2. Cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setDeleteAllConfirm(false)}
                  style={{
                    flex: 1, padding: "0.65rem", borderRadius: 8, border: `1px solid ${t.border}`,
                    background: t.toggleBg, color: t.text, fontSize: "0.875rem", cursor: "pointer", fontWeight: 500,
                  }}>Cancel</button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteAllLoading}
                  style={{
                    flex: 1, padding: "0.65rem", borderRadius: 8, border: "none",
                    background: "#dc2626", color: "#fff", fontSize: "0.875rem",
                    cursor: deleteAllLoading ? "not-allowed" : "pointer", fontWeight: 600,
                  }}>{deleteAllLoading ? "Deleting…" : "Yes, delete all"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {loading && records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted, fontSize: "0.9rem" }}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 14,
            padding: "4rem 2rem", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: "0.75rem", opacity: 0.5 }}>🗄️</div>
            <p style={{ color: t.textMuted, margin: 0, fontSize: "0.9rem" }}>No records found in the database.</p>
          </div>
        ) : (
          <div style={{
            background: t.card, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden",
            boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 2px 16px rgba(0,0,0,0.06)",
          }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 0.7fr 80px",
              padding: "0.65rem 1.25rem", borderBottom: `1px solid ${t.border}`,
              background: dark ? "#0f0f16" : "#f9fafb",
            }}>
              {["ID", "Uploaded", "R2 Key", "Status", ""].map((h) => (
                <span key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>

            {records.map((rec, i) => (
              <div key={rec.id}>
                <div
                  style={{
                    display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 0.7fr 80px",
                    padding: "0.75rem 1.25rem", borderBottom: i < records.length - 1 ? `1px solid ${t.border}` : "none",
                    alignItems: "center", transition: "background 0.15s",
                    background: expandedId === rec.id ? (dark ? "#1a1a27" : "#f3f4f6") : "transparent",
                  }}
                  onMouseEnter={(e) => { if (expandedId !== rec.id) (e.currentTarget as HTMLElement).style.background = t.rowHover; }}
                  onMouseLeave={(e) => { if (expandedId !== rec.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* ID */}
                  <div>
                    <button
                      onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        textAlign: "left", display: "flex", alignItems: "center", gap: "0.4rem",
                      }}>
                      <span style={{ fontSize: "0.72rem", color: t.accentText, fontFamily: "monospace" }}>
                        {rec.id.slice(0, 8)}…
                      </span>
                      <span style={{ fontSize: "0.65rem", color: t.textMuted }}>
                        {expandedId === rec.id ? "▲" : "▼"}
                      </span>
                    </button>
                  </div>

                  {/* Uploaded at */}
                  <span style={{ fontSize: "0.8rem", color: t.textSubtle }}>{formatDate(rec.uploaded_at)}</span>

                  {/* R2 key */}
                  <span style={{ fontSize: "0.75rem", color: t.textMuted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rec.r2_key.replace("images/", "")}
                  </span>

                  {/* Status */}
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600, color: statusColor(rec.status),
                    textTransform: "capitalize",
                  }}>{rec.status}</span>

                  {/* Delete btn */}
                  <button
                    onClick={() => handleDelete(rec.id)}
                    disabled={deletingId === rec.id}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.errorBorder}`,
                      background: t.errorBg, color: t.errorText, fontSize: "0.78rem",
                      cursor: deletingId === rec.id ? "not-allowed" : "pointer", fontWeight: 500,
                      opacity: deletingId === rec.id ? 0.5 : 1,
                    }}>
                    {deletingId === rec.id ? "…" : "Delete"}
                  </button>
                </div>

                {/* Expanded row — extracted data */}
                {expandedId === rec.id && (
                  <div style={{
                    padding: "0 1.25rem 1rem", borderBottom: i < records.length - 1 ? `1px solid ${t.border}` : "none",
                    background: dark ? "#1a1a27" : "#f3f4f6",
                  }}>
                    <div style={{ marginBottom: "0.4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textMuted }}>Full ID</span>
                    </div>
                    <code style={{ fontSize: "0.75rem", color: t.accentText, fontFamily: "monospace", display: "block", marginBottom: "0.75rem" }}>{rec.id}</code>

                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: t.textMuted, display: "block", marginBottom: "0.4rem" }}>Extracted Data</span>
                    <pre style={{
                      margin: 0, padding: "0.75rem 1rem", background: t.codeBg, borderRadius: 8,
                      fontSize: "0.78rem", color: t.codeText, overflowX: "auto", whiteSpace: "pre-wrap",
                      wordBreak: "break-word", maxHeight: 280, overflowY: "auto",
                      fontFamily: "'Fira Code', 'Consolas', monospace", border: `1px solid ${t.border}`,
                    }}>
                      {rec.extracted_data
                        ? (() => { try { return JSON.stringify(JSON.parse(rec.extracted_data), null, 2); } catch { return rec.extracted_data; } })()
                        : "(no data yet)"}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
