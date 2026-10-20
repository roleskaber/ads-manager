/*
 * Ads Manager tracker.
 *   <script async src="https://YOUR_HOST/adsm.js" data-key="TRACKING_KEY"></script>
 *   adsm.track("lead_form_submitted", { form: "contact" });
 *   adsm.identify("crm-customer-42"); // links this browser to your CRM id for offline steps
 * Sends a page_view automatically; the landing URL and referrer tell the server which ad brought the visitor.
 */
(function () {
  var script = document.currentScript;
  var key = script && script.getAttribute("data-key");
  if (!key) return;

  var endpoint = new URL("/api/track", script.src).toString();
  var storageKey = "adsm_aid";
  var userKey = "adsm_uid";

  function store(name, value) {
    try {
      if (value !== undefined) localStorage.setItem(name, value);
      return localStorage.getItem(name);
    } catch {
      return value || null;
    }
  }

  var anonymousId = store(storageKey) || store(storageKey, (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2));

  function send(event, properties) {
    var body = JSON.stringify({
      key: key,
      event: event,
      anonymousId: anonymousId,
      userId: store(userKey) || undefined,
      url: location.href,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
      properties: properties,
    });
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    fetch(endpoint, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } });
  }

  window.adsm = {
    track: send,
    identify: function (userId) {
      store(userKey, String(userId));
      send("identify");
    },
  };

  send("page_view");
})();
