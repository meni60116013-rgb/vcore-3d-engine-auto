import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";

const root = process.cwd();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

test("PWA installs its service worker, caches Three.js and reloads offline", { timeout: 120_000 }, async () => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const file = resolve(root, relative);
      if (file !== root && !file.startsWith(root + sep)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error("Not a file");
      response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("#viewport canvas").waitFor({ timeout: 30_000 });

    // Registration occurs at the end of app initialization.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 30_000 });

    // Reload once under service-worker control so CDN modules are cached.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#viewport canvas").waitFor({ timeout: 30_000 });
    await page.waitForFunction(async () => {
      const names = await caches.keys();
      for (const name of names) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        if (requests.some(request => request.url.startsWith("https://unpkg.com/three@0.160.0/"))) return true;
      }
      return false;
    }, { timeout: 30_000 });

    const cachedUrls = await page.evaluate(async () => {
      const result = [];
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) result.push(request.url);
      }
      return result;
    });
    assert.ok(cachedUrls.some(value => value.endsWith("/index.html")), "app shell should be cached");
    assert.ok(cachedUrls.some(value => value.includes("three@0.160.0/")), "Three.js CDN modules should be cached");

    // With network disabled, the app shell and cached modules must still render.
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#viewport canvas").waitFor({ timeout: 30_000 });
    assert.equal(await page.locator("#count").innerText(), "0");
    assert.deepEqual(pageErrors, [], `Offline browser runtime errors: ${pageErrors.join("; ")}`);
    await context.setOffline(false);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
});
