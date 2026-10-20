import { describe, expect, it } from "vitest";
import { parseUrl, TouchClassifier } from "./touch-classifier";

const classifier = new TouchClassifier();
const classify = (url: string, referrer?: string) => classifier.classify({ url: parseUrl(url), referrer: parseUrl(referrer) });

describe("TouchClassifier", () => {
  it("uses UTM tags and keeps the click id", () => {
    expect(classify("https://shop.example/?utm_source=Google&utm_medium=cpc&utm_campaign=Summer&gclid=abc")).toMatchObject({
      channel: "PAID_SEARCH", source: "google", medium: "cpc", campaign: "Summer", clickId: "abc", clickIdType: "gclid",
    });
  });

  it("treats paid traffic from a social network as paid social", () => {
    expect(classify("https://shop.example/?utm_source=vk&utm_medium=cpc")?.channel).toBe("PAID_SOCIAL");
  });

  it("recognises auto-tagged clicks without UTM", () => {
    expect(classify("https://shop.example/?yclid=42")).toMatchObject({ channel: "PAID_SEARCH", source: "yandex", medium: "cpc" });
    expect(classify("https://shop.example/?fbclid=1")).toMatchObject({ channel: "ORGANIC_SOCIAL", source: "facebook" });
  });

  it("classifies untagged referrers", () => {
    expect(classify("https://shop.example/", "https://www.google.com/")).toMatchObject({ channel: "ORGANIC_SEARCH", source: "google" });
    expect(classify("https://shop.example/", "https://m.facebook.com/")).toMatchObject({ channel: "ORGANIC_SOCIAL", source: "facebook" });
    expect(classify("https://shop.example/", "https://blog.partner.io/post")).toMatchObject({ channel: "REFERRAL", source: "blog.partner.io" });
  });

  it("ignores internal navigation and bare visits", () => {
    expect(classify("https://shop.example/contact", "https://www.shop.example/")).toBeNull();
    expect(classify("https://shop.example/")).toBeNull();
  });
});
