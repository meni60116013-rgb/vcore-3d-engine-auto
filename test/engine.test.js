import assert from 'node:assert';
import test from 'node:test';
import { TubularProfileEngine } from '../src/geometryEngine.js';

test('Test automatizado de engine', () => {
  const engine = new TubularProfileEngine(38.1, 2.0, 500);
  assert.strictEqual(typeof engine.getAnalysisReport().area_mm2, 'number');
});
