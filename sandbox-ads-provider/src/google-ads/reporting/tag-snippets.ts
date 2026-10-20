import type { ConversionAction } from "../../generated/prisma/client.js";

/** conversion_action.tag_snippets: the sandbox gtag.js install code and event snippet. */
export function tagSnippets(publicUrl: string, customerId: string, action: ConversionAction) {
  if (action.type !== "WEBPAGE") return [];
  const tagId = `AW-${customerId}`;
  return [
    {
      type: "WEBPAGE",
      pageFormat: "HTML",
      globalSiteTag: [
        `<!-- Sandbox Google tag (gtag.js) -->`,
        `<script async src="${publicUrl}/gtag/js?id=${tagId}"></script>`,
        `<script>`,
        `  window.dataLayer = window.dataLayer || [];`,
        `  function gtag(){dataLayer.push(arguments);}`,
        `  gtag('js', new Date());`,
        `  gtag('config', '${tagId}');`,
        `</script>`,
      ].join("\n"),
      eventSnippet: [
        `<script>`,
        `  gtag('event', 'conversion', {`,
        `    'send_to': '${tagId}/${action.label}',`,
        `    'value': 1.0,`,
        `    'currency': '${action.defaultCurrencyCode}',`,
        `    'transaction_id': ''`,
        `  });`,
        `</script>`,
      ].join("\n"),
    },
  ];
}
