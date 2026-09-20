import { LOCALES, LOCALE_LABELS, type Locale } from "./i18n.js";

export function escapeHtml(input: unknown): string {
  const text = input === undefined || input === null ? "" : String(input);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function page(title: string, body: string, locale: Locale = "en"): string {
  const langBar = LOCALES.map((l) => {
    const active = l === locale;
    return `<a href="?lang=${l}" class="lang${active ? " lang-active" : ""}">${escapeHtml(LOCALE_LABELS[l])}</a>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f7f7f5; --card: #ffffff; --border: #e4e2dd; --text: #1f1e1c;
    --muted: #6b6a66; --accent: #b45309;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #171614; --card: #221f1b; --border: #35322c; --text: #f2f0ec; --muted: #a19d94; --accent: #f0a94e; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 20px 64px; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    line-height: 1.5;
  }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  h2 { font-size: 1.05rem; margin: 28px 0 10px; }
  .sub { color: var(--muted); font-size: 0.9rem; margin-bottom: 24px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    padding: 16px 18px; margin-bottom: 14px;
  }
  .card-link { display: block; }
  .card-link:hover { border-color: var(--accent); text-decoration: none; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .title { font-weight: 600; }
  .badge {
    display: inline-block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
    text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent);
    border-radius: 999px; padding: 2px 9px; white-space: nowrap;
  }
  .meta { color: var(--muted); font-size: 0.82rem; margin-top: 4px; }
  .qa { margin-bottom: 14px; }
  .q { font-weight: 600; font-size: 0.92rem; }
  .a { color: var(--text); margin-top: 2px; white-space: pre-wrap; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
  dt { color: var(--muted); font-size: 0.85rem; white-space: nowrap; }
  dd { margin: 0; }
  ul { margin: 4px 0; padding-left: 20px; }
  table { border-collapse: collapse; width: 100%; margin-top: 6px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); font-size: 0.9rem; vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .sprint { margin-bottom: 10px; }
  .sprint-name { font-weight: 600; }
  .empty { color: var(--muted); font-style: italic; }
  .back { display: inline-block; margin-bottom: 18px; font-size: 0.9rem; }
  .langbar { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 20px; font-size: 0.78rem; }
  .lang {
    color: var(--muted); border: 1px solid var(--border); border-radius: 999px;
    padding: 2px 9px; text-decoration: none;
  }
  .lang:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }
  .lang-active { color: var(--accent); border-color: var(--accent); font-weight: 600; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="langbar">${langBar}</div>
    ${body}
  </div>
</body>
</html>`;
}
