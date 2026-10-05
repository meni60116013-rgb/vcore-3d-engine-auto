#!/usr/bin/env bash
set -e

echo "[1/3] Actualizando motor de geometría paramétrica..."
cat << 'CS' > src/geometryEngine.js
export class AssemblyComponent {
  constructor(id, name, type, params = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.params = params;
    this.position = params.position || { x: 0, y: 0, z: 0 };
    this.rotation = params.rotation || { x: 0, y: 0, z: 0 };
  }

  getMetrics() {
    let volume = 0;
    if (this.type === 'tubular') {
      const dOut = parseFloat(this.params.dOut) || 0;
      const t = parseFloat(this.params.thickness) || 0;
      const l = parseFloat(this.params.length) || 0;
      const dIn = Math.max(0, dOut - 2 * t);
      const area = (Math.PI / 4) * (Math.pow(dOut, 2) - Math.pow(dIn, 2));
      volume = area * l;
    } else if (this.type === 'solid_cylinder') {
      const d = parseFloat(this.params.diameter) || 0;
      const l = parseFloat(this.params.length) || 0;
      volume = (Math.PI / 4) * Math.pow(d, 2) * l;
    } else if (this.type === 'plate') {
      volume = (parseFloat(this.params.width) || 0) * (parseFloat(this.params.height) || 0) * (parseFloat(this.params.thickness) || 0);
    }
    const mass = volume * 7.85e-6;
    return { volume, mass };
  }
}

export class MachineryAssembly {
  constructor() {
    this.components = new Map();
  }
  addComponent(comp) { this.components.set(comp.id, comp); }
  getTotalMetrics() {
    let mass = 0, volume = 0;
    this.components.forEach(c => {
      const m = c.getMetrics();
      mass += m.mass;
      volume += m.volume;
    });
    return { totalMass: mass.toFixed(3), totalVolume: volume.toFixed(2), count: this.components.size };
  }
}
CS

echo "[2/3] Actualizando pruebas unitarias..."
cat << 'CS' > test/engine.test.js
import assert from 'node:assert';
import test from 'node:test';
import { AssemblyComponent, MachineryAssembly } from '../src/geometryEngine.js';

test('Calculo de ensamblaje multipieza', () => {
  const asm = new MachineryAssembly();
  asm.addComponent(new AssemblyComponent('1', 'Tubo Chasis', 'tubular', { dOut: 38.1, thickness: 2, length: 500 }));
  asm.addComponent(new AssemblyComponent('2', 'Eje Principal', 'solid_cylinder', { diameter: 20, length: 300 }));
  
  const m = asm.getTotalMetrics();
  assert.strictEqual(m.count, 2);
  assert.ok(parseFloat(m.totalMass) > 0);
});
CS

echo "[3/3] Ejecutando pruebas y haciendo Push..."
npm test
git add .
git commit -m "feat: transformar motor en ensamblador de maquinaria 3D parametrico"
git push origin main
