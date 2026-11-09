const MATERIALS = Object.freeze({
  steel: Object.freeze({ name: "Acero al carbono", density: 7.85e-6 }),
  stainless_304: Object.freeze({ name: "Acero inoxidable 304", density: 8.00e-6 }),
  aluminum_6061: Object.freeze({ name: "Aluminio 6061", density: 2.70e-6 }),
  titanium: Object.freeze({ name: "Titanio", density: 4.51e-6 }),
  brass: Object.freeze({ name: "Latón", density: 8.50e-6 }),
  copper: Object.freeze({ name: "Cobre", density: 8.96e-6 })
});

const TYPES = new Set(["tubular", "solid_cylinder", "plate"]);
const finitePositive = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número finito mayor que cero.`);
  }
  return value;
};
const finiteCoordinate = (value, label) => {
  const number = value === undefined ? 0 : value;
  if (typeof number !== "number" || !Number.isFinite(number)) {
    throw new RangeError(`${label} debe ser finita y un número finito.`);
  }
  return number;
};

export class AssemblyComponent {
  constructor(id, name, type, params = {}) {
    if (id === undefined || id === null || String(id).trim() === "") throw new TypeError("El ID es obligatorio.");
    if (!TYPES.has(type)) throw new TypeError(`Tipo de componente no soportado: ${type}`);
    this.id = String(id);
    this.name = String(name || `Pieza_${this.id}`);
    this.type = type;
    this.params = { ...params };
    this.material = params.material || "steel";
    if (!MATERIALS[this.material]) throw new TypeError(`Material no soportado: ${this.material}`);
    this.position = {
      x: finiteCoordinate(params.position?.x, "Posición X"),
      y: finiteCoordinate(params.position?.y, "Posición Y"),
      z: finiteCoordinate(params.position?.z, "Posición Z")
    };
    this.rotation = {
      x: finiteCoordinate(params.rotation?.x, "Rotación X"),
      y: finiteCoordinate(params.rotation?.y, "Rotación Y"),
      z: finiteCoordinate(params.rotation?.z, "Rotación Z")
    };
    this.validate();
  }

  validate() {
    const p = this.params;
    if (this.type === "tubular") {
      const d = finitePositive(p.dOut, "Diámetro exterior");
      const t = finitePositive(p.thickness, "Espesor");
      finitePositive(p.length, "Longitud");
      if (t * 2 >= d) throw new RangeError("El espesor debe ser menor que la mitad del diámetro exterior.");
    } else if (this.type === "solid_cylinder") {
      finitePositive(p.diameter, "Diámetro");
      finitePositive(p.length, "Longitud");
    } else if (this.type === "plate") {
      finitePositive(p.width, "Ancho");
      finitePositive(p.height, "Alto");
      finitePositive(p.thickness, "Espesor");
    }
    return true;
  }

  getMetrics() {
    this.validate();
    const p = this.params;
    let volume = 0;
    if (this.type === "tubular") {
      const inner = Number(p.dOut) - 2 * Number(p.thickness);
      volume = Math.PI / 4 * (Number(p.dOut) ** 2 - inner ** 2) * Number(p.length);
    } else if (this.type === "solid_cylinder") {
      volume = Math.PI / 4 * Number(p.diameter) ** 2 * Number(p.length);
    } else {
      volume = Number(p.width) * Number(p.height) * Number(p.thickness);
    }
    const density = MATERIALS[this.material].density;
    const mass = volume * density;
    if (!Number.isFinite(volume) || volume <= 0) {
      throw new RangeError("El volumen calculado excede el rango numérico permitido.");
    }
    if (!Number.isFinite(mass) || mass <= 0) {
      throw new RangeError("La masa calculada excede el rango numérico permitido.");
    }
    return { volume, mass, density, material: this.material };
  }

  getAabb() {
    this.validate();
    const p = this.params;
    let half;
    if (this.type === "tubular") {
      half = [Number(p.dOut) / 2, Number(p.dOut) / 2, Number(p.length) / 2];
    } else if (this.type === "solid_cylinder") {
      half = [Number(p.diameter) / 2, Number(p.diameter) / 2, Number(p.length) / 2];
    } else {
      half = [Number(p.width) / 2, Number(p.height) / 2, Number(p.thickness) / 2];
    }

    const { x, y, z } = this.rotation;
    const a = Math.cos(x), b = Math.sin(x);
    const d = Math.cos(y), e = Math.sin(y);
    const f = Math.cos(z), g = Math.sin(z);
    const rotation = [
      [d * f, -d * g, e],
      [a * g + b * e * f, a * f - b * e * g, -b * d],
      [b * g - a * e * f, b * f + a * e * g, a * d]
    ];
    const extent = rotation.map(row =>
      Math.abs(row[0]) * half[0] + Math.abs(row[1]) * half[1] + Math.abs(row[2]) * half[2]
    );
    const center = [this.position.x, this.position.y, this.position.z];
    const min = center.map((value, index) => value - extent[index]);
    const max = center.map((value, index) => value + extent[index]);
    if ([...extent, ...min, ...max].some(value => !Number.isFinite(value))) {
      throw new RangeError("Los límites geométricos exceden el rango numérico permitido.");
    }
    return {
      min: { x: min[0], y: min[1], z: min[2] },
      max: { x: max[0], y: max[1], z: max[2] }
    };
  }

  toJSON() {
    return {
      id: this.id, name: this.name, type: this.type, material: this.material,
      params: { ...this.params, material: this.material, position: { ...this.position }, rotation: { ...this.rotation } }
    };
  }
}

export class MachineryAssembly {
  constructor() { this.components = new Map(); }

  addComponent(component) {
    if (!(component instanceof AssemblyComponent)) throw new TypeError("Se requiere una instancia de AssemblyComponent.");
    if (this.components.has(component.id)) throw new Error(`Ya existe una pieza con ID ${component.id}.`);
    this.components.set(component.id, component);
    return component;
  }

  updateComponent(id, replacement) {
    const key = String(id);
    if (!this.components.has(key)) throw new Error(`No existe una pieza con ID ${key}.`);
    if (!(replacement instanceof AssemblyComponent)) {
      throw new TypeError("Se requiere una instancia de AssemblyComponent.");
    }
    if (replacement.id !== key) {
      throw new Error("El ID de la pieza actualizada debe coincidir con el ID original.");
    }
    replacement.validate();
    this.components.set(key, replacement);
    return replacement;
  }

  duplicateComponent(id, newId, newName) {
    const original = this.components.get(String(id));
    if (!original) throw new Error(`No existe una pieza con ID ${id}.`);
    if (newId === undefined || newId === null || String(newId).trim() === "") {
      throw new TypeError("El nuevo ID es obligatorio.");
    }
    const bounds = original.getAabb();
    const clearance = 10;
    const xOffset = bounds.max.x - bounds.min.x + clearance;
    const params = {
      ...original.params,
      material: original.material,
      position: {
        x: original.position.x + xOffset,
        y: original.position.y,
        z: original.position.z
      },
      rotation: { ...original.rotation }
    };
    const duplicate = new AssemblyComponent(
      String(newId),
      newName || `${original.name} (copia)`,
      original.type,
      params
    );
    return this.addComponent(duplicate);
  }

  removeComponent(id) { return this.components.delete(String(id)); }
  clear() { this.components.clear(); }

  findAabbOverlaps() {
    // Calcula cada AABB una sola vez y descarta pares separados en X antes
    // de evaluar los otros ejes. El barrido conserva el resultado aproximado.
    const entries = [...this.components.values()]
      .map((component, index) => ({ component, index, bounds: component.getAabb() }))
      .sort((a, b) => a.bounds.min.x - b.bounds.min.x || a.index - b.index);
    const overlaps = [];

    for (let i = 0; i < entries.length; i += 1) {
      const entryA = entries[i];
      for (let j = i + 1; j < entries.length; j += 1) {
        const entryB = entries[j];
        if (entryB.bounds.min.x >= entryA.bounds.max.x) break;

        const overlap = {
          x: Math.min(entryA.bounds.max.x, entryB.bounds.max.x) - Math.max(entryA.bounds.min.x, entryB.bounds.min.x),
          y: Math.min(entryA.bounds.max.y, entryB.bounds.max.y) - Math.max(entryA.bounds.min.y, entryB.bounds.min.y),
          z: Math.min(entryA.bounds.max.z, entryB.bounds.max.z) - Math.max(entryA.bounds.min.z, entryB.bounds.min.z)
        };
        if (Object.values(overlap).some(value => !Number.isFinite(value))) {
          throw new RangeError("El solapamiento AABB excede el rango numérico permitido.");
        }
        if (overlap.y > 0 && overlap.z > 0) {
          overlaps.push({
            componentA: entryA.component.id,
            nameA: entryA.component.name,
            componentB: entryB.component.id,
            nameB: entryB.component.name,
            overlap,
            approximate: true,
            _order: [Math.min(entryA.index, entryB.index), Math.max(entryA.index, entryB.index)]
          });
        }
      }
    }

    overlaps.sort((a, b) => a._order[0] - b._order[0] || a._order[1] - b._order[1]);
    return overlaps.map(({ _order, ...overlap }) => overlap);
  }

  getTotalMetrics() {
    let mass = 0, volume = 0;
    for (const component of this.components.values()) {
      const metrics = component.getMetrics();
      mass += metrics.mass;
      volume += metrics.volume;
      if (!Number.isFinite(mass) || !Number.isFinite(volume)) {
        throw new RangeError("Las métricas totales exceden el rango numérico permitido.");
      }
    }
    return {
      count: this.components.size,
      totalMass: mass,
      totalVolume: volume,
      formattedMass: mass.toFixed(3),
      formattedVolume: volume.toFixed(2)
    };
  }

  toJSON() {
    return { schemaVersion: 1, units: "mm", components: [...this.components.values()].map(c => c.toJSON()) };
  }

  static fromJSON(data) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.components)) {
      throw new TypeError("Archivo de ensamblaje inválido o versión no compatible.");
    }
    const assembly = new MachineryAssembly();
    for (const item of data.components) {
      assembly.addComponent(new AssemblyComponent(item.id, item.name, item.type, {
        ...item.params, material: item.material || item.params?.material
      }));
    }
    return assembly;
  }
}

export { MATERIALS };
