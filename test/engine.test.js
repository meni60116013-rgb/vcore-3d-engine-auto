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
  }), /número finito/);
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

test("actualiza componentes de forma validada sin cambiar su identidad", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("edit-me", "Eje original", "solid_cylinder", {
    diameter: 10, length: 20, position: { x: 1, y: 2, z: 3 }
  }));

  const replacement = new AssemblyComponent("edit-me", "Eje actualizado", "solid_cylinder", {
    diameter: 15, length: 30, material: "aluminum_6061",
    position: { x: 4, y: 5, z: 6 }
  });
  assembly.updateComponent("edit-me", replacement);
  assert.equal(assembly.components.get("edit-me").name, "Eje actualizado");
  assert.equal(assembly.components.get("edit-me").params.diameter, 15);
  assert.equal(assembly.getTotalMetrics().count, 1);

  assert.throws(() => assembly.updateComponent("missing", replacement), /No existe/);
  assert.throws(() => assembly.updateComponent("edit-me", new AssemblyComponent("wrong-id", "Otro", "plate", {
    width: 10, height: 10, thickness: 2
  })), /ID de la pieza actualizada/);
});

test("duplica componentes conservando geometría y material con separación AABB segura", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("source", "Soporte", "plate", {
    width: 100, height: 50, thickness: 4, material: "stainless_304",
    position: { x: 3, y: 4, z: 5 },
    rotation: { x: 0.1, y: 0.2, z: 0.3 }
  }));

  const original = assembly.components.get("source");
  const originalBounds = original.getAabb();
  const copy = assembly.duplicateComponent("source", "copy", "Soporte duplicado");
  assert.equal(copy.id, "copy");
  assert.equal(copy.name, "Soporte duplicado");
  assert.equal(copy.type, "plate");
  assert.equal(copy.material, "stainless_304");
  assert.deepEqual(copy.rotation, { x: 0.1, y: 0.2, z: 0.3 });
  const copyBounds = copy.getAabb();
  assert.ok(Math.abs(copyBounds.min.x - originalBounds.max.x - 10) < 1e-9);
  assert.equal(assembly.findAabbOverlaps().length, 0);
  assert.equal(assembly.getTotalMetrics().count, 2);
  assert.throws(() => assembly.duplicateComponent("source", "copy"), /Ya existe/);
  assert.throws(() => assembly.duplicateComponent("missing", "new-copy"), /No existe/);
});

test("calcula AABB rotadas para piezas y aplica la transformación XYZ", () => {
  const plate = new AssemblyComponent("rotated", "Placa girada", "plate", {
    width: 10, height: 2, thickness: 2,
    rotation: { x: 0, y: 0, z: Math.PI / 2 }
  });
  const bounds = plate.getAabb();
  assert.ok(Math.abs(bounds.min.x + 1) < 1e-10);
  assert.ok(Math.abs(bounds.max.x - 1) < 1e-10);
  assert.ok(Math.abs(bounds.min.y + 5) < 1e-10);
  assert.ok(Math.abs(bounds.max.y - 5) < 1e-10);
  assert.equal(bounds.min.z, -1);
  assert.equal(bounds.max.z, 1);
});

test("detecta candidatos de solapamiento AABB y excluye piezas que solo se tocan", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("a", "Placa A", "plate", {
    width: 10, height: 10, thickness: 2
  }));
  assembly.addComponent(new AssemblyComponent("b", "Placa B", "plate", {
    width: 4, height: 4, thickness: 2, position: { x: 3, y: 0, z: 0 }
  }));
  const candidates = assembly.findAabbOverlaps();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].componentA, "a");
  assert.equal(candidates[0].componentB, "b");
  assert.deepEqual(candidates[0].overlap, { x: 4, y: 4, z: 2 });
  assert.equal(candidates[0].approximate, true);

  assembly.removeComponent("b");
  assembly.addComponent(new AssemblyComponent("touching", "Placa contigua", "plate", {
    width: 4, height: 4, thickness: 2, position: { x: 7, y: 0, z: 0 }
  }));
  assert.equal(assembly.findAabbOverlaps().length, 0);
});

test("marca explícitamente como aproximado el solapamiento de una pieza dentro de un tubo hueco", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("tube-shell", "Tubo hueco", "tubular", {
    dOut: 20, thickness: 2, length: 100
  }));
  assembly.addComponent(new AssemblyComponent("inner-shaft", "Eje interior", "solid_cylinder", {
    diameter: 4, length: 10
  }));
  const candidates = assembly.findAabbOverlaps();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].approximate, true);
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

test("rechaza dimensiones y coordenadas no numéricas sin coerción implícita", () => {
  assert.throws(() => new AssemblyComponent("string-dim", "Pieza", "solid_cylinder", {
    diameter: "10", length: 20
  }), /número finito/);
  assert.throws(() => new AssemblyComponent("bool-dim", "Pieza", "plate", {
    width: true, height: 10, thickness: 2
  }), /número finito/);
  assert.throws(() => new AssemblyComponent("null-coordinate", "Pieza", "plate", {
    width: 10, height: 10, thickness: 2, position: { x: null }
  }), /número finito/);
  const defaults = new AssemblyComponent("defaults", "Pieza", "plate", {
    width: 10, height: 10, thickness: 2
  });
  assert.deepEqual(defaults.position, { x: 0, y: 0, z: 0 });
});


test("optimiza el barrido AABB calculando límites una vez y conserva el orden de pares", () => {
  const assembly = new MachineryAssembly();
  const parts = [
    new AssemblyComponent("a", "A", "plate", { width: 10, height: 10, thickness: 2, position: { x: 4, y: 0, z: 0 } }),
    new AssemblyComponent("b", "B", "plate", { width: 10, height: 10, thickness: 2, position: { x: 0, y: 0, z: 0 } }),
    new AssemblyComponent("c", "C", "plate", { width: 10, height: 10, thickness: 2, position: { x: 30, y: 0, z: 0 } }),
    new AssemblyComponent("d", "D", "plate", { width: 10, height: 10, thickness: 2, position: { x: 6, y: 0, z: 0 } })
  ];
  const calls = new Map();
  for (const part of parts) {
    const getAabb = part.getAabb.bind(part);
    calls.set(part.id, 0);
    part.getAabb = () => {
      calls.set(part.id, calls.get(part.id) + 1);
      return getAabb();
    };
    assembly.addComponent(part);
  }

  const overlaps = assembly.findAabbOverlaps();
  assert.deepEqual(overlaps.map(pair => [pair.componentA, pair.componentB]), [
    ["a", "b"], ["a", "d"], ["b", "d"]
  ]);
  assert.deepEqual([...calls.values()], [1, 1, 1, 1]);
  assert.ok(overlaps.every(pair => pair.approximate === true));
});


test("evalúa restricciones coincidentes y de distancia sin mover componentes", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("a", "A", "plate", { width: 2, height: 2, thickness: 2 }));
  assembly.addComponent(new AssemblyComponent("b", "B", "plate", {
    width: 2, height: 2, thickness: 2, position: { x: 3, y: 4, z: 0 }
  }));
  assembly.addConstraint({ id: "co", type: "coincident", componentA: "a", componentB: "b" });
  assembly.addConstraint({ id: "dist", type: "distance", componentA: "a", componentB: "b", distance: 5, tolerance: 1e-8 });
  const before = { ...assembly.components.get("b").position };
  const result = assembly.validateConstraints();
  assert.deepEqual(result.map(item => item.status), ["violated", "satisfied"]);
  assert.equal(result[0].actual, 5);
  assert.equal(result[0].target, 0);
  assert.equal(result[1].residual, 0);
  assert.deepEqual(assembly.components.get("b").position, before);
});

test("valida entradas y referencias de restricciones", () => {
  const assembly = new MachineryAssembly();
  for (const id of ["a", "b"]) assembly.addComponent(new AssemblyComponent(id, id, "plate", { width: 1, height: 1, thickness: 1 }));
  assert.throws(() => assembly.addConstraint({ type: "distance", componentA: "a", componentB: "b", distance: 1 }), /ID de restricción/);
  assert.throws(() => assembly.addConstraint({ id: "self", type: "distance", componentA: "a", componentB: "a", distance: 1 }), /misma pieza/);
  assert.throws(() => assembly.addConstraint({ id: "missing", type: "distance", componentA: "a", componentB: "x", distance: 1 }), /inexistentes/);
  assert.throws(() => assembly.addConstraint({ id: "bad-type", type: "parallel", componentA: "a", componentB: "b" }), /no soportado/);
  assert.throws(() => assembly.addConstraint({ id: "missing-distance", type: "distance", componentA: "a", componentB: "b" }), /requiere un objetivo/);
  assert.throws(() => assembly.addConstraint({ id: "bad-distance", type: "distance", componentA: "a", componentB: "b", distance: -1 }), /no puede ser negativa/);
  assert.throws(() => assembly.addConstraint({ id: "bad-tolerance", type: "distance", componentA: "a", componentB: "b", distance: 1, tolerance: Number.NaN }), /número finito/);
  assembly.addConstraint({ id: "unique", type: "distance", componentA: "a", componentB: "b", distance: 1 });
  assert.throws(() => assembly.addConstraint({ id: "unique", type: "distance", componentA: "a", componentB: "b", distance: 1 }), /Ya existe/);
});

test("elimina restricciones dependientes y limpia el ensamblaje", () => {
  const assembly = new MachineryAssembly();
  for (const id of ["a", "b", "c"]) assembly.addComponent(new AssemblyComponent(id, id, "plate", { width: 1, height: 1, thickness: 1 }));
  assembly.addConstraint({ id: "ab", type: "coincident", componentA: "a", componentB: "b" });
  assembly.addConstraint({ id: "bc", type: "distance", componentA: "b", componentB: "c", distance: 2 });
  assert.equal(assembly.removeConstraint("missing"), false);
  assert.equal(assembly.removeComponent("b"), true);
  assert.equal(assembly.constraints.size, 0);
  assembly.addConstraint({ id: "ac", type: "coincident", componentA: "a", componentB: "c" });
  assembly.clear();
  assert.equal(assembly.constraints.size, 0);
  assert.equal(assembly.components.size, 0);
});

test("serializa restricciones en v2 y conserva compatibilidad de archivos v1", () => {
  const assembly = new MachineryAssembly();
  assembly.addComponent(new AssemblyComponent("a", "A", "plate", { width: 1, height: 1, thickness: 1 }));
  assembly.addComponent(new AssemblyComponent("b", "B", "plate", { width: 1, height: 1, thickness: 1, position: { x: 2 } }));
  assembly.addConstraint({ id: "spacing", type: "distance", componentA: "a", componentB: "b", distance: 2, tolerance: 0.01 });
  const json = JSON.parse(JSON.stringify(assembly.toJSON()));
  assert.equal(json.schemaVersion, 2);
  assert.deepEqual(MachineryAssembly.fromJSON(json).toJSON(), assembly.toJSON());
  const legacy = { schemaVersion: 1, units: "mm", components: json.components };
  const migrated = MachineryAssembly.fromJSON(legacy);
  assert.equal(migrated.components.size, 2);
  assert.equal(migrated.constraints.size, 0);
  assert.throws(() => MachineryAssembly.fromJSON({ schemaVersion: 2, components: [], constraints: "invalid" }), /lista de restricciones/);
});
