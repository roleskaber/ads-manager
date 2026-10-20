import type { ContainerConfig } from "./compile.js";

/** Browser helpers shared by gtm.js and gtag.js: gclid storage (conversion linker) and the conversion pixel. */
const SHARED = String.raw`
  function readParam(name) {
    var match = location.search.match(new RegExp("[?&]" + name + "=([^&#]*)"));
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : null;
  }
  function storeGclid() {
    var gclid = readParam("gclid");
    if (gclid) document.cookie = "_gcl_aw=GCL." + Math.floor(Date.now() / 1000) + "." + encodeURIComponent(gclid) + "; max-age=7776000; path=/; SameSite=Lax";
  }
  function readGclid() {
    var fromUrl = readParam("gclid");
    if (fromUrl) return fromUrl;
    var cookie = document.cookie.match(/(?:^|; )_gcl_aw=GCL\.\d+\.([^;]+)/);
    return cookie ? decodeURIComponent(cookie[1]) : null;
  }
  function sendConversion(p) {
    var id = String(p.conversionId || "").replace(/^AW-/, "");
    if (!id || !p.conversionLabel) return;
    var query = ["label=" + encodeURIComponent(p.conversionLabel)];
    if (p.conversionValue !== undefined && p.conversionValue !== "") query.push("value=" + encodeURIComponent(p.conversionValue));
    if (p.currencyCode) query.push("currency_code=" + encodeURIComponent(p.currencyCode));
    if (p.orderId) query.push("oid=" + encodeURIComponent(p.orderId));
    var gclid = readGclid();
    if (gclid) query.push("gclid=" + encodeURIComponent(gclid));
    new Image().src = ORIGIN + "/pagead/conversion/" + id + "/?" + query.join("&");
  }
`;

/** gtm.js for a published container version: data layer processing, triggers, variables and tags. */
export function renderContainerScript(publicId: string, config: ContainerConfig, origin: string): string {
  return String.raw`/* Sandbox Tag Manager ${publicId} */
(function () {
  var CONFIG = ${JSON.stringify(config)};
  var ORIGIN = ${JSON.stringify(origin)};
  var CONTAINER = ${JSON.stringify(publicId)};
  var registry = (window.__sandboxGtm = window.__sandboxGtm || {});
  if (registry[CONTAINER]) return;
  registry[CONTAINER] = { config: CONFIG, fired: [] };
  var dataLayer = (window.dataLayer = window.dataLayer || []);
  var model = {};
${SHARED}
  function lookup(object, path) {
    return path.split(".").reduce(function (value, key) { return value == null ? undefined : value[key]; }, object);
  }
  function cookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^$()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : undefined;
  }
  function builtIn(name, event) {
    switch (name) {
      case "Event": case "_event": return event.event;
      case "Page URL": return location.href;
      case "Page Hostname": return location.hostname;
      case "Page Path": return location.pathname;
      case "Referrer": return document.referrer;
      case "Click Element": return event["gtm.element"];
      case "Click URL": case "Form URL": return event["gtm.elementUrl"];
      case "Click Text": return event["gtm.elementText"];
      case "Click ID": case "Form ID": return event["gtm.elementId"];
      case "Click Classes": case "Form Classes": return event["gtm.elementClasses"];
    }
  }
  function variable(name, event) {
    var value = builtIn(name, event);
    if (value !== undefined) return value;
    var definition = CONFIG.variables.filter(function (v) { return v.name === name; })[0];
    if (!definition) return undefined;
    var p = definition.params;
    switch (definition.type) {
      case "v": return lookup(model, p.name);
      case "c": return p.value;
      case "k": return cookie(p.name);
      case "j": return lookup(window, p.name);
      case "u":
        var component = (p.component || "URL").toUpperCase();
        if (component === "HOST") return location.hostname;
        if (component === "PATH") return location.pathname;
        if (component === "FRAGMENT") return location.hash.replace(/^#/, "");
        if (component === "QUERY") return p.queryKey ? readParam(p.queryKey) : location.search.replace(/^\?/, "");
        return location.href;
    }
  }
  function render(template, event) {
    return String(template == null ? "" : template).replace(/\{\{([^}]+)\}\}/g, function (_, name) {
      var value = variable(name.trim(), event);
      return value == null ? "" : String(value);
    });
  }
  function test(filter, event) {
    var a = render(filter.arg0, event), b = render(filter.arg1, event), result;
    if (filter.ignoreCase) { a = a.toLowerCase(); b = b.toLowerCase(); }
    switch (filter.type) {
      case "equals": result = a === b; break;
      case "contains": result = a.indexOf(b) !== -1; break;
      case "startsWith": result = a.indexOf(b) === 0; break;
      case "endsWith": result = a.slice(-b.length) === b; break;
      case "matchRegex": try { result = new RegExp(b).test(a); } catch (e) { result = false; } break;
      case "greater": result = Number(a) > Number(b); break;
      case "less": result = Number(a) < Number(b); break;
      default: result = false;
    }
    return filter.negate ? !result : result;
  }
  function triggerFires(trigger, event) {
    if (trigger.event ? event.event !== trigger.event : !trigger.eventFilters.every(function (f) { return test(f, event); })) return false;
    return trigger.filters.every(function (f) { return test(f, event); });
  }
  function anyFires(ids, event) {
    return CONFIG.triggers.some(function (t) { return ids.indexOf(t.id) !== -1 && triggerFires(t, event); });
  }
  function runHtml(html) {
    var holder = document.createElement("div");
    holder.innerHTML = html;
    Array.prototype.slice.call(holder.childNodes).forEach(function (node) {
      if (node.tagName === "SCRIPT") {
        var script = document.createElement("script");
        Array.prototype.slice.call(node.attributes).forEach(function (a) { script.setAttribute(a.name, a.value); });
        script.text = node.text;
        node = script;
      }
      document.body.appendChild(node);
    });
  }
  function fire(tag, event) {
    var params = {};
    for (var key in tag.params) params[key] = render(tag.params[key], event);
    registry[CONTAINER].fired.push({ tag: tag.name, event: event.event, at: Date.now() });
    if (tag.type === "gclidw") storeGclid();
    else if (tag.type === "awct") sendConversion(params);
    else if (tag.type === "html") runHtml(params.html);
  }
  function process(event) {
    if (!event || typeof event !== "object" || Object.prototype.toString.call(event) === "[object Arguments]") return;
    for (var key in event) if (key !== "event") model[key] = event[key];
    if (!event.event) return;
    CONFIG.tags.forEach(function (tag) {
      if (anyFires(tag.firing, event) && !anyFires(tag.blocking, event)) {
        try { fire(tag, event); } catch (e) { console.error("[sandbox gtm] tag " + tag.name + " failed", e); }
      }
    });
  }

  var queued = dataLayer.slice();
  var push = dataLayer.push;
  dataLayer.push = function () {
    var result = push.apply(dataLayer, arguments);
    for (var i = 0; i < arguments.length; i++) process(arguments[i]);
    return result;
  };
  var started = queued.some(function (e) { return e && e.event === "gtm.js"; });
  queued.forEach(process);
  if (!started) dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  function onReady() { dataLayer.push({ event: "gtm.dom" }); }
  function onLoad() { dataLayer.push({ event: "gtm.load" }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady); else onReady();
  if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad);

  function elementEvent(name, element, url) {
    dataLayer.push({
      event: name,
      "gtm.element": element,
      "gtm.elementUrl": url || "",
      "gtm.elementId": element.id || "",
      "gtm.elementClasses": typeof element.className === "string" ? element.className : "",
      "gtm.elementText": (element.textContent || "").trim().slice(0, 100)
    });
  }
  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest ? e.target.closest("a") : null;
    if (link) elementEvent("gtm.linkClick", link, link.href);
  }, true);
  document.addEventListener("submit", function (e) {
    if (e.target && e.target.tagName === "FORM") elementEvent("gtm.formSubmit", e.target, e.target.action);
  }, true);
})();
`;
}

/** gtag.js for Google Ads tags (AW-…): `config` links the click, `event conversion` reports it. */
export function renderGtagScript(origin: string): string {
  return String.raw`/* Sandbox gtag.js */
(function () {
  var ORIGIN = ${JSON.stringify(origin)};
  if (window.__sandboxGtag) return;
  window.__sandboxGtag = true;
  var dataLayer = (window.dataLayer = window.dataLayer || []);
${SHARED}
  function process(args) {
    if (!args || Object.prototype.toString.call(args) !== "[object Arguments]") return;
    if (args[0] === "config" && /^AW-/.test(String(args[1]))) storeGclid();
    if (args[0] === "event" && args[1] === "conversion" && args[2] && args[2].send_to) {
      var parts = String(args[2].send_to).split("/");
      sendConversion({
        conversionId: parts[0],
        conversionLabel: parts[1],
        conversionValue: args[2].value,
        currencyCode: args[2].currency,
        orderId: args[2].transaction_id
      });
    }
  }
  var queued = dataLayer.slice();
  var push = dataLayer.push;
  dataLayer.push = function () {
    var result = push.apply(dataLayer, arguments);
    for (var i = 0; i < arguments.length; i++) process(arguments[i]);
    return result;
  };
  queued.forEach(process);
})();
`;
}

/** Install snippet shown in the GTM UI, pointing at the sandbox. */
export function containerSnippet(publicId: string, origin: string) {
  return {
    snippet: [
      `<!-- Sandbox Tag Manager -->`,
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':`,
      `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],`,
      `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=`,
      `'${origin}/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);`,
      `})(window,document,'script','dataLayer','${publicId}');</script>`,
      `<!-- End Sandbox Tag Manager -->`,
    ].join("\n"),
    noscript: `<noscript><iframe src="${origin}/ns.html?id=${publicId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
  };
}
