// JSON inside a script element must not contain a literal HTML closing tag.
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export function downloadHtml(html: string, filename: string | null, fallback: string) {
  const name = filename ?? fallback; // Filenames have already passed Activity API validation.
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = /\.html$/i.test(name) ? name : `${name}.html`;
  anchor.click(); URL.revokeObjectURL(url);
}
