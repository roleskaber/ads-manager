/**
 * Test landing page for the full loop: install a container (?gtm=GTM-…) and/or the Google tag
 * (?aw=AW-…/label), arrive from a sandbox ad with ?gclid=…, then press "Buy" to push a purchase.
 */
export function renderLandingPage(origin: string, params: { gtm?: string; aw?: string }): string {
  const gtm = params.gtm && /^GTM-[A-Z0-9]+$/.test(params.gtm) ? params.gtm : undefined;
  const aw = params.aw && /^AW-\d+\/[\w-]+$/.test(params.aw) ? params.aw : undefined;
  const gtmSnippet = gtm
    ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='${origin}/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');</script>`
    : "";
  const gtagSnippet = aw
    ? `<script async src="${origin}/gtag/js?id=${aw.split("/")[0]}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${aw.split("/")[0]}');</script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sandbox Landing</title>
  ${gtmSnippet}
  ${gtagSnippet}
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #202124; }
    button { padding: 10px 18px; border-radius: 8px; border: 0; background: #1a73e8; color: #fff; font-size: 16px; cursor: pointer; }
    pre { background: #f1f3f4; padding: 12px; border-radius: 8px; white-space: pre-wrap; word-break: break-all; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Sandbox Landing</h1>
  <p>Container: <b>${gtm ?? "—"}</b> · Google tag: <b>${aw ?? "—"}</b></p>
  <button id="buy">Buy for 79.90 USD</button>
  <pre id="log"></pre>
  <script>
    var log = document.getElementById("log");
    function show(line) { log.textContent += line + "\\n"; }
    show("gclid: " + (new URLSearchParams(location.search).get("gclid") || "none"));
    document.getElementById("buy").addEventListener("click", function () {
      var orderId = "ORDER-" + Date.now();
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "purchase", value: 79.9, currency: "USD", transaction_id: orderId });
      ${aw ? `gtag('event', 'conversion', { send_to: '${aw}', value: 79.9, currency: 'USD', transaction_id: orderId });` : ""}
      show("pushed purchase " + orderId);
    });
  </script>
</body>
</html>`;
}
