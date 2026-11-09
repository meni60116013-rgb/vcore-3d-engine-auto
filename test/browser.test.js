import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { test } from "node:test";
import { chromium } from "playwright";
import { AssemblyComponent } from "../src/geometryEngine.js";

const root = process.cwd();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

test("CAD browser flow: geometry, transforms, persistence and exports", { timeout: 120_000 }, async () => {
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
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      acceptDownloads: true,
      serviceWorkers: "block"
    });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));

    const address = server.address();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#viewport canvas").waitFor({ timeout: 30_000 });

    // Invalid geometry must be rejected without adding a component.
    await page.locator("#p2").fill("20");
    await page.locator("#add").click();
    assert.match(await page.locator("#error").innerText(), /espesor/i);
    assert.equal(await page.locator("#count").innerText(), "0");

    // Create a tube with a non-zero position and rotation.
    await page.locator("#p2").fill("2");
    await page.locator("#x").fill("10");
    await page.locator("#y").fill("-5");
    await page.locator("#z").fill("20");
    await page.locator("#rx").fill("90");
    await page.locator("#rz").fill("45");
    await page.locator("#add").click();
    assert.equal(await page.locator("#count").innerText(), "1");
    assert.ok(Number(await page.locator("#mass").innerText()) > 0);
    assert.ok(Number(await page.locator("#volume").innerText()) > 0);
    assert.equal(await page.locator("#parts .part").count(), 1);

    // JSON export must preserve geometry and transforms.
    const jsonDownloadPromise = page.waitForEvent("download");
    await page.locator("#json").click();
    const jsonDownload = await jsonDownloadPromise;
    assert.equal(jsonDownload.suggestedFilename(), "vcore-3d-assembly.json");
    const jsonStream = await jsonDownload.createReadStream();
    const jsonChunks = [];
    for await (const chunk of jsonStream) jsonChunks.push(chunk);
    const exported = JSON.parse(Buffer.concat(jsonChunks).toString("utf8"));
    assert.equal(exported.schemaVersion, 2);
    assert.deepEqual(exported.constraints, []);
    assert.equal(exported.components.length, 1);
    assert.equal(exported.components[0].type, "tubular");
    assert.deepEqual(exported.components[0].params.position, { x: 10, y: -5, z: 20 });
    assert.ok(Math.abs(exported.components[0].params.rotation.x - Math.PI / 2) < 1e-10);
    assert.ok(Math.abs(exported.components[0].params.rotation.z - Math.PI / 4) < 1e-10);

    // Exercise the solid-cylinder and plate parameter paths.
    await page.locator("#type").selectOption("solid_cylinder");
    assert.equal(await page.locator("#p2").isDisabled(), true);
    await page.locator("#p1").fill("25");
    await page.locator("#p3").fill("100");
    await page.locator("#add").click();
    assert.equal(await page.locator("#count").innerText(), "2");

    await page.locator("#type").selectOption("plate");
    assert.equal(await page.locator("#p2").isDisabled(), false);
    await page.locator("#p1").fill("200");
    await page.locator("#p2").fill("100");
    await page.locator("#p3").fill("5");
    await page.locator("#add").click();
    assert.equal(await page.locator("#count").innerText(), "3");

    // Add and solve an assembly distance constraint from the real UI.
    await page.locator("#constraint-type").selectOption("distance");
    await page.locator("#constraint-a").selectOption({ index: 1 });
    await page.locator("#constraint-b").selectOption({ index: 2 });
    await page.locator("#constraint-anchor").selectOption({ index: 1 });
    await page.locator("#constraint-distance").fill("100");
    await page.locator("#add-constraint").click();
    assert.equal(await page.locator("#constraints .constraint-row").count(), 1);
    await page.locator("#solve-constraints").click();
    assert.match(await page.locator("#constraint-status").innerText(), /Convergencia correcta/i);
    assert.match(await page.locator("#constraints").innerText(), /Cumplida/);

    // Clicking the visible plate in the viewport selects its tree entry.
    const canvas = page.locator("#viewport canvas");
    await canvas.scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole("button", { name: "Seleccionar Pieza 3" }).getAttribute("aria-pressed"), "true");
    const canvasBox = await canvas.boundingBox();
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
    assert.equal(await page.locator('#parts button[aria-pressed="true"]').count(), 1);
    assert.equal(await page.getByRole("button", { name: "Seleccionar Pieza 3" }).getAttribute("aria-pressed"), "false");

    assert.ok(Number(await page.locator("#overlap-count").innerText()) > 0);
    assert.match(await page.locator("#overlaps").innerText(), /Solape AABB/);

    // Select and edit an existing component without changing the assembly count.
    await page.getByRole("button", { name: "Seleccionar Pieza 2" }).click();
    assert.equal(await page.getByRole("button", { name: "Seleccionar Pieza 2" }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Editar Pieza 1" }).click();
    assert.equal(await page.locator("#add").innerText(), "Guardar cambios");
    await page.locator("#p1").fill("40");
    await page.locator("#p2").fill("2.5");
    await page.locator("#add").click();
    assert.equal(await page.locator("#count").innerText(), "3");
    assert.equal(await page.locator("#add").innerText(), "Añadir pieza");

    // Duplicate a selected component with a distinct ID and offset.
    await page.getByRole("button", { name: "Duplicar Pieza 1" }).click();
    assert.equal(await page.locator("#count").innerText(), "4");
    assert.equal(await page.getByRole("button", { name: "Seleccionar Pieza 4" }).count(), 1);

    // STL export must contain the four generated solids.
    const stlDownloadPromise = page.waitForEvent("download");
    await page.locator("#stl").click();
    const stlDownload = await stlDownloadPromise;
    assert.equal(stlDownload.suggestedFilename(), "vcore-3d-assembly.stl");
    const stlStream = await stlDownload.createReadStream();
    const stlChunks = [];
    for await (const chunk of stlStream) stlChunks.push(chunk);
    const stl = Buffer.concat(stlChunks).toString("utf8");
    assert.ok(stl.length > 400, "STL export should contain triangle data for all solids");
    assert.match(stl.slice(0, 32), /solid/i);

    // Local persistence must survive a reload and restore all components.
    await page.locator("#save").click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("vcore3d-assembly-v1")));
    assert.deepEqual(stored.components.map(component => component.type), ["tubular", "solid_cylinder", "plate", "tubular"]);
    assert.equal(stored.constraints.length, 1);
    assert.equal(stored.constraints[0].componentA, stored.components[0].id);
    assert.equal(stored.constraints[0].componentB, stored.components[1].id);
    assert.equal(stored.components[0].params.dOut, 40);
    const originalStored = stored.components[0];
    const duplicateStored = stored.components[3];
    const originalPart = new AssemblyComponent(originalStored.id, originalStored.name, originalStored.type, originalStored.params);
    const duplicatePart = new AssemblyComponent(duplicateStored.id, duplicateStored.name, duplicateStored.type, duplicateStored.params);
    const originalBounds = originalPart.getAabb();
    const duplicateBounds = duplicatePart.getAabb();
    assert.ok(Math.abs(duplicateBounds.min.x - originalBounds.max.x - 10) < 1e-8);

    // Restoring a saved assembly exits edit mode and clears stale selection.
    await page.getByRole("button", { name: "Editar Pieza 1" }).click();
    assert.equal(await page.locator("#add").innerText(), "Guardar cambios");
    await page.locator("#load").click();
    assert.equal(await page.locator("#add").innerText(), "Añadir pieza");
    assert.equal(await page.locator("#count").innerText(), "4");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#viewport canvas").waitFor({ timeout: 30_000 });
    assert.equal(await page.locator("#count").innerText(), "0");
    await page.locator("#load").click();
    assert.equal(await page.locator("#count").innerText(), "4");

    // Remove a component and clear the remainder through the confirmation dialog.
    await page.getByRole("button", { name: "Quitar Pieza 1" }).click();
    assert.equal(await page.locator("#count").innerText(), "3");
    assert.equal(await page.locator("#constraints .constraint-row").count(), 0);
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#clear").click();
    assert.equal(await page.locator("#count").innerText(), "0");
    assert.equal(await page.locator("#parts").innerText(), "Sin componentes todavía");

    // A corrupted or unsupported saved document must not mutate the current assembly.
    await page.evaluate(() => localStorage.setItem("vcore3d-assembly-v1", JSON.stringify({
      schemaVersion: 99,
      units: "mm",
      components: []
    })));
    await page.locator("#load").click();
    assert.match(await page.locator("#error").innerText(), /Archivo de ensamblaje inválido/i);
    assert.equal(await page.locator("#count").innerText(), "0");

    assert.deepEqual(pageErrors, [], `Browser runtime errors: ${pageErrors.join("; ")}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
});
