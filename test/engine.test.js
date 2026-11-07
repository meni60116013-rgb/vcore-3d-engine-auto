import assert from "node:assert/strict";
import test from "node:test";
import { AssemblyComponent, MachineryAssembly, MATERIALS } from "../src/geometryEngine.js";

test("calcula volumen, masa y cantidad de un ensamblaje multipieza", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("tube", "Tubo", "tubular", { dOut: 38.1, thickness: 2, length: 500 }));
  assembly.addComponent(new AssemblyComponent("shaft", "Eje", "solid_cylinder", { diameter: 20, length: 300 }));
  const metrics = assembly.getTotalMetrics();
  assert.equal(metrics.count, 2);
  assert.ok(metrics.totalMass > 0);
  assert.ok(metrics.totalVolume > 0);
  assert.equal(metrics.formattedMass, metrics.totalMass.toFixed(3));
});

test("valida dimensiones y rechaza geometría físicamente imposible", () => {
  assert.throws(() => new AssemblyComponent("bad", "Tubo inválido", "tubular", { dOut: 20, thickness: 10, length: 100 }), /menor que la mitad/);
  assert.throws(() => new AssemblyComponent("bad2", "Eje inválido", "solid_cylinder", { diameter: -2, length: 100 }), /mayor que cero/);
  assert.throws(() => new AssemblyComponent("bad3", "Placa inválida", "plate", { width: 10, height: 0, thickness: 2 }), /mayor que cero/);
  assert.throws(() => new AssemblyComponent("bad4", "Tipo", "unknown", {}), /no soportado/);
});

test("acepta coordenadas y rotaciones finitas, rechaza valores no finitos", () => {
  const part = new AssemblyComponent("p", "Placa", "plate", {
    width: 10, height: 20, thickness: 2,
    position: { x: 10, y: -5, z: 0 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 }
  });
  assert.equal(part.position.x, 10);
  assert.equal(part.rotation.x, Math.PI / 2);
  assert.throws(() => new AssemblyComponent("nan", "Placa", "plate", {
    width: 1, height: 1, thickness: 1, position: { x: Number.NaN }
  }), /finita/);
});

test("calcula materiales con densidades diferenciadas", () => {
  const steel = new AssemblyComponent("s", "Acero", "solid_cylinder", { diameter: 10, length: 100, material: "steel" }).getMetrics();
  const aluminum = new AssemblyComponent("a", "Aluminio", "solid_cylinder", { diameter: 10, length: 100, material: "aluminum_6061" }).getMetrics();
  assert.ok(steel.mass > aluminum.mass);
  assert.equal(aluminum.density, MATERIALS.aluminum_6061.density);
});

test("impide IDs duplicados y permite eliminar componentes", () => {
  const assembly = new MachineryAssembly();
  const part = new AssemblyComponent("1", "Eje", "solid_cylinder", { diameter: 10, length: 20 });
  assembly.addComponent(part);
  assert.throws(() => assembly.addComponent(part), /Ya existe/);
  assert.equal(assembly.removeComponent("1"), true);
  assert.equal(assembly.removeComponent("1"), false);
  assert.equal(assembly.getTotalMetrics().count, 0);
});

test("serializa y restaura un ensamblaje sin perder parámetros", () => {
  const original = new MachineryAssembly();
  original.addComponent(new AssemblyComponent("1", "Tubo", "tubular", {
    dOut: 30, thickness: 2, length: 250, material: "stainless_304",
    position: { x: 5, y: 6, z: 7 }, rotation: { x: 0.1, y: 0.2, z: 0.3 }
  }));
  const restored = MachineryAssembly.fromJSON(JSON.parse(JSON.stringify(original.toJSON())));
  assert.deepEqual(restored.toJSON(), original.toJSON());
  assert.throws(() => MachineryAssembly.fromJSON({ schemaVersion: 99, components: [] }), /no compatible/);
});

test("rechaza materiales sin densidad definida", () => {
  assert.throws(() => new AssemblyComponent("unknown-material", "Pieza", "solid_cylinder", {
    diameter: 10, length: 20, material: "unobtainium"
  }), /Material no soportado/);
});


test("verifica fórmulas analíticas exactas para tubo, cilindro y placa", () => {
  const tube = new AssemblyComponent("tube-exact", "Tubo", "tubular", {
    dOut: 20, thickness: 2, length: 100
  }).getMetrics();
  const cylinder = new AssemblyComponent("cylinder-exact", "Eje", "solid_cylinder", {
    diameter: 10, length: 100
  }).getMetrics();
  const plate = new AssemblyComponent("plate-exact", "Placa", "plate", {
    width: 10, height: 20, thickness: 2
  }).getMetrics();

  assert.ok(Math.abs(tube.volume - 3600 * Math.PI) < 1e-9);
  assert.ok(Math.abs(cylinder.volume - 2500 * Math.PI) < 1e-9);
  assert.equal(plate.volume, 400);
  assert.equal(tube.mass, tube.volume * MATERIALS.steel.density);
  assert.equal(cylinder.mass, cylinder.volume * MATERIALS.steel.density);
  assert.equal(plate.mass, plate.volume * MATERIALS.steel.density);
});

test("rechaza resultados geométricos y métricas acumuladas fuera del rango numérico", () => {
  const oversized = new AssemblyComponent("oversized", "Eje extremo", "solid_cylinder", {
    diameter: 1e155, length: 1e155
  });
  assert.throws(() => oversized.getMetrics(), /rango numérico/);

  const assembly = new MachineryAssembly();
  const params = { width: 1e103, height: 1e103, thickness: 1e102 };
  assembly.addComponent(new AssemblyComponent("large-a", "Placa A", "plate", params));
  assembly.addComponent(new AssemblyComponent("large-b", "Placa B", "plate", params));
  assert.throws(() => assembly.getTotalMetrics(), /rango numérico/);
});

test("mantiene inmutables las densidades de referencia", () => {
  assert.ok(Object.isFrozen(MATERIALS));
  for (const material of Object.values(MATERIALS)) assert.ok(Object.isFrozen(material));
});
