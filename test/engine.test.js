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
