// Backend API client. The base URL is configurable at build time via
// VITE_BACKEND_URL (see .env.example), defaulting to the local dev server.

export const BACKEND =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8010";

async function getJson(path, opts) {
  const r = await fetch(`${BACKEND}${path}`, opts);
  return r.json();
}

export const api = {
  getState: () => getJson("/api/state"),
  reset: () => fetch(`${BACKEND}/api/reset`, { method: "POST" }),
  simulateAttack: () => fetch(`${BACKEND}/api/simulate-attack`, { method: "POST" }),
  analyzeLogs: () => fetch(`${BACKEND}/api/analyze-logs`, { method: "POST" }),
  analyzeUpload: (rows) =>
    fetch(`${BACKEND}/api/analyze-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, reset: true }),
    }),
  aiReport: (id) => getJson(`/api/report/${id}/ai`, { method: "POST" }),
};
