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
  assert.match(workflow, /tar -czf dist\/vcore-3d-engine-source\\.tar\\.gz[^\\n]*sw\\.js/);
  assert.match(workflow, /README\\.md/);
  assert.match(workflow, /docs\/TECHNICAL_LIMITS\\.md/);
});

test("PWA caches only same-origin application files", () => {
  assert.match(serviceWorker, /vcore-cad-v3/);
  assert.match(serviceWorker, /geometryEngine\.js/);
  assert.doesNotMatch(serviceWorker, /unpkg\.com/);
});
