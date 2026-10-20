import type { SearchResultAd } from "./serp.service.js";

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function displayUrl(ad: SearchResultAd["creative"]): string {
  let host = ad.finalUrl;
  try {
    host = new URL(ad.finalUrl).hostname;
  } catch {}
  return [host, ad.path1, ad.path2].filter(Boolean).join(" › ");
}

/** Minimal search results page with sponsored results on top. */
export function renderSerpPage(query: string, countryCode: string | undefined, ads: SearchResultAd[]): string {
  const results = ads
    .map(
      ({ creative, clickToken }) => `
      <article class="ad">
        <div class="meta"><b>Sponsored</b> · ${escape(displayUrl(creative))}</div>
        <a href="/aclk?t=${encodeURIComponent(clickToken)}">${escape(creative.headlines.slice(0, 3).join(" | "))}</a>
        <p>${escape(creative.descriptions.slice(0, 2).join(" "))}</p>
      </article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(query || "Sandbox Search")}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; color: #202124; background: #fff; }
    header { padding: 20px 16px; border-bottom: 1px solid #dadce0; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    header b { font-size: 20px; }
    form { display: flex; gap: 8px; flex: 1; max-width: 640px; }
    input[name=q] { flex: 1; padding: 10px 16px; border: 1px solid #dfe1e5; border-radius: 24px; font-size: 16px; }
    select, button { padding: 8px 12px; border-radius: 8px; border: 1px solid #dfe1e5; background: #f8f9fa; }
    main { max-width: 680px; padding: 16px; }
    .ad { margin: 0 0 24px; }
    .meta { font-size: 13px; color: #4d5156; margin-bottom: 4px; }
    .ad a { font-size: 20px; color: #1a0dab; text-decoration: none; }
    .ad a:hover { text-decoration: underline; }
    .ad p { margin: 4px 0 0; font-size: 14px; color: #4d5156; line-height: 1.5; }
    .empty { color: #70757a; }
  </style>
</head>
<body>
  <header>
    <b>Sandbox Search</b>
    <form action="/search">
      <input name="q" value="${escape(query)}" placeholder="Search" autofocus>
      <select name="gl" aria-label="Country">
        ${["", "US", "GB", "DE", "FR", "ES", "IT", "PL", "CA", "AU", "RU", "UA", "BY", "KZ"]
          .map((code) => `<option value="${code}" ${code === (countryCode ?? "").toUpperCase() ? "selected" : ""}>${code || "Any country"}</option>`)
          .join("")}
      </select>
      <button>Search</button>
    </form>
  </header>
  <main>
    ${query ? results || '<p class="empty">No ads for this query.</p>' : '<p class="empty">Type a query that matches your keywords.</p>'}
  </main>
</body>
</html>`;
}
