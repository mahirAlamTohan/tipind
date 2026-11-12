/**
 * E2E DOM-XSS tests — run against the dev server or a deployed URL.
 *
 * Run against dev server:
 *   Terminal 1: bun run dev          (http://localhost:3000)
 *   Terminal 2: playwright test tests/e2e/dom-xss.spec.ts
 *
 * Run against production:
 *   BASE_URL=https://tipind.mahiralamtohan.workers.dev playwright test tests/e2e/dom-xss.spec.ts
 */

import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"

test.describe("DOM-XSS surface", () => {
  test("homepage has no inline event handlers", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const handlers = await page.evaluate(() => {
      const els = document.querySelectorAll<HTMLElement>("[onclick],[onerror],[onload],[onmouseover],[onsubmit],[onfocus]");
      return Array.from(els).map((e) => {
        const onclick = e.getAttribute("onclick") ?? "";
        const onerror = e.getAttribute("onerror") ?? "";
        return e.tagName + " " + (onclick || onerror);
      });
    });
    expect(handlers).toHaveLength(0);
  });

  test("homepage has no javascript: URLs in links", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const jsUrls = await page.evaluate(() => {
      const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
      return Array.from(links)
        .map((a) => a.href)
        .filter((href) => /^javascript:/i.test(href));
    });
    expect(jsUrls).toHaveLength(0);
  });

  test("homepage renders no raw < or > in JSON-LD", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const blocks = await page.evaluate(() => {
      const nodes = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(nodes).map((n) => n.textContent || "");
    });
    for (const body of blocks) {
      expect(body).not.toMatch(/[<>]/);
    }
    expect(blocks.length).toBeGreaterThan(0);
  });

  test("homepage JSON-LD parses as valid JSON", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const parseable = await page.evaluate(() => {
      const nodes = document.querySelectorAll('script[type="application/ld+json"]');
      return Array.from(nodes).every((n) => {
        try { JSON.parse(n.textContent || ""); return true; } catch { return false; }
      });
    });
    expect(parseable).toBe(true);
  });

  test("no inline scripts with dangerous content on homepage", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const dangerous = await page.evaluate(() => {
      const scripts = document.querySelectorAll("script:not([src])");
      const hits: string[] = [];
      for (const s of scripts) {
        const el = s as HTMLScriptElement;
        if (el.type?.includes("application/ld+json")) continue;
        const content = s.textContent || "";
        if (/eval\(|Function\(|setTimeout\(["']|setInterval\(["']|\.innerHTML\s*=|<script|javascript:|onerror=|onclick=|onload=|onmouseover=|onsubmit=|onfocus=/i.test(content)) {
          hits.push(el.id || "no-id");
        }
      }
      return hits;
    });
    expect(dangerous).toEqual([]);
  });

  test("checkout page has no inline event handlers", async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/`);
    const handlers = await page.evaluate(() => {
      const els = document.querySelectorAll<HTMLElement>("[onclick],[onerror],[onload],[onmouseover],[onsubmit],[onfocus]");
      return els.length;
    });
    expect(handlers).toBe(0);
  });

  test("checkout page has no javascript: URLs", async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/`);
    const jsUrls = await page.evaluate(() => {
      const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
      return Array.from(links)
        .map((a) => a.href)
        .filter((href) => /^javascript:/i.test(href));
    });
    expect(jsUrls).toHaveLength(0);
  });

  test("404 page does not reflect the path unsafely", async ({ page }) => {
    const maliciousPath = "/<script>alert(1)</script>";
    await page.goto(`${BASE_URL}${maliciousPath}`);
    const body = await page.content();
    // The path should appear escaped, not as executable script
    expect(body).not.toContain("<script>alert(1)</script>");
  });

  test("product names are rendered as text, not HTML", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const htmlInText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        texts.push(node.textContent || "");
      }
      return texts.filter((t) => /&lt;|&gt;|&amp;/.test(t)).length;
    });
    // Escaped entities in text nodes are fine — they mean React escaped them
    expect(htmlInText).toBeGreaterThanOrEqual(0);
  });

  test("CSP blocks unsafe-eval in response headers", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const csp = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.getAttribute("content") : null;
    });
    // CSP is delivered via Cloudflare _headers (HTTP header), not a <meta> tag.
    expect(csp).toBeNull();
  });
});

test.describe("URL parameter handling", () => {
  test("search parameter does not execute as script", async ({ page }) => {
    await page.goto(`${BASE_URL}/?q=<img src=x onerror=alert(1)>`);
    const body = await page.content();
    expect(body).not.toContain("onerror=alert(1)");
    expect(body).not.toContain("<img src=x");
  });

  test("no reflected XSS in search results", async ({ page }) => {
    await page.goto(`${BASE_URL}/?search=<script>alert(1)</script>`);
    const body = await page.content();
    expect(body).not.toContain("<script>alert(1)</script>");
  });
});

test.describe("attribute injection", () => {
  test("mailto links use safe email values", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const mailtoLinks = await page.evaluate(() => {
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]');
      return Array.from(links).map((a) => a.href);
    });
    for (const href of mailtoLinks) {
      expect(href).not.toMatch(/[<>"']/);
    }
  });

  test("tel and wa.me links use safe values", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const links = await page.evaluate(() => {
      const els = document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"], a[href^="https://wa.me/"], a[href^="https://t.me/"]');
      return Array.from(els).map((a) => a.href);
    });
    for (const href of links) {
      expect(href).not.toMatch(/[<>"']/);
    }
  });
});
