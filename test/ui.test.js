import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");

test("CAD interface exposes assembly, transforms and export controls", () => {
  for (const id of ["type", "material", "add", "parts", "save", "load", "json", "stl", "clear", "home", "viewport"]) {
    assert.match(html, new RegExp(`id="${id}"`), `Falta el control ${id}`);
  }
  assert.match(html, /OrbitControls/);
  assert.match(html, /STLExporter/);
  assert.match(html, /rotation/);
  assert.match(html, /localStorage/);
});

test("CI source bundle includes the service worker and project documentation", () => {
  assert.ok(workflow.includes("tar -czf dist/vcore-3d-engine-source.tar.gz index.html manifest.json package.json sw.js src test README.md docs/TECHNICAL_LIMITS.md"));
});

test("PWA caches the app shell and only the pinned Three.js CDN modules", () => {
  assert.match(serviceWorker, /vcore-cad-v4/);
  assert.match(serviceWorker, /geometryEngine\\.js/);
  assert.match(serviceWorker, /https:\\/\\/unpkg\\.com/);
  assert.match(serviceWorker, /three@0\\.160\\.0/);
  assert.match(serviceWorker, /response\\.type === "cors"/);
  assert.match(serviceWorker, /cache\\.match\\(request\\)/);
  assert.match(serviceWorker, /url\\.origin === TRUSTED_CDN_ORIGIN/);
  assert.match(serviceWorker, /url\\.pathname\\.startsWith\\(TRUSTED_CDN_PREFIX\\)/);
});
