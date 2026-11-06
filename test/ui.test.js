import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("CAD interface exposes assembly, transforms and export controls", () => {
  for (const id of ["type", "material", "add", "parts", "save", "load", "json", "stl", "clear", "home", "viewport"]) {
    assert.match(html, new RegExp(`id="${id}"`), `Falta el control ${id}`);
  }
  assert.match(html, /OrbitControls/);
  assert.match(html, /STLExporter/);
  assert.match(html, /rotation/);
  assert.match(html, /localStorage/);
});

test("PWA cache is versioned and includes CAD runtime modules", () => {
  assert.match(serviceWorker, /vcore-cad-v3/);
  assert.match(serviceWorker, /OrbitControls\.js/);
  assert.match(serviceWorker, /STLExporter\.js/);
});
