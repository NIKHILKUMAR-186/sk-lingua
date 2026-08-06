export function toCSV(rows: Record<string, any>[], columns?: string[]) {
  if (!rows || rows.length === 0) return "";
  const keys = columns ?? Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = keys.join(",");
  const lines = rows.map((r) => keys.map((k) => escape(r[k])).join(","));
  return [header, ...lines].join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime + ";charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
