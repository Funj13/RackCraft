import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundle the actual TypeScript generators and exporter, without writing test builds.
const result = await build({
  stdin: { contents: `export { buildRoom, disposeModel } from './src/generator/RoomBuilder';
    export { defaultRoom, validateRoom, fitRoom } from './src/types/room';
    export { exportToGLB } from './src/io/GLBExporter';
    export { Box3, Vector3 } from 'three';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent'
});
const { buildRoom, disposeModel, defaultRoom, validateRoom, fitRoom, exportToGLB, Box3, Vector3 } =
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

const config = validateRoom(JSON.parse(JSON.stringify(defaultRoom)));
const model = buildRoom(config);
const bounds = new Box3().setFromObject(model);
const size = bounds.getSize(new Vector3());
// Frames protrude 1 cm on either wall; tolerate floating-point rotations.
assert.deepEqual(size.toArray().map(Math.round), [480, 307, 382]);
assert.equal(bounds.min.y, -12);
for (const name of ['Piso', 'Teto', 'Parede_front', 'Parede_back', 'Parede_left', 'Parede_right', 'Porta_articulada', 'Vidro']) {
  assert.ok(model.getObjectByName(name), `Missing ${name}`);
}
const preview = buildRoom(config, true);
assert.equal(preview.getObjectByName('Teto'), undefined);
assert.equal(preview.getObjectByName('Parede_front'), undefined);
assert.ok(preview.getObjectByName('Parede_back'));
assert.ok(model.getObjectByName('Teto'), 'Cutaway must not change the full model');

const small = fitRoom({ ...config, width: 200, depth: 200, height: 220,
  door: { ...config.door, width: 400, height: 500 }, window: { ...config.window, width: 400, height: 500, sill: 200 } });
validateRoom(small);
assert.equal(small.door.width, 160);
assert.equal(small.window.sill + small.window.height, 210);
assert.throws(() => validateRoom({ ...config, width: -1 }));
assert.throws(() => validateRoom({ ...config, colors: {} }));
assert.throws(() => validateRoom({ ...config, window: { ...config.window, sill: 1000 } }));
const opened = buildRoom({ ...config, door: { ...config.door, open: true } });
assert.equal(opened.getObjectByName('Porta_articulada').rotation.y, -Math.PI/2);
const disabled = buildRoom({ ...config, walls: { ...config.walls, front: false }, ceiling: false });
assert.equal(disabled.getObjectByName('Porta_articulada'), undefined);
assert.equal(disabled.getObjectByName('Teto'), undefined);

// Verify the real download/export path and inspect the binary glTF scale.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
let exportedBlob, downloadName;
const originalCreate = URL.createObjectURL;
URL.createObjectURL = blob => { exportedBlob = blob; return originalCreate(blob); };
globalThis.document = { createElement: () => ({ click() { downloadName = this.download; } }) };
await exportToGLB(model, 'room-test.glb');
assert.equal(downloadName, 'room-test.glb');
const binary = Buffer.from(await exportedBlob.arrayBuffer());
assert.equal(binary.toString('ascii', 0, 4), 'glTF');
const gltf = JSON.parse(binary.toString('utf8', 20, 20 + binary.readUInt32LE(12)));
const root = gltf.nodes.find(n => n.name === config.name);
assert.deepEqual(root.scale ?? [root.matrix[0], root.matrix[5], root.matrix[10]], [0.01, 0.01, 0.01]);
assert.ok(gltf.nodes.some(n => n.name === 'Teto'));
assert.ok(gltf.nodes.some(n => n.name === 'Porta_articulada'));
assert.deepEqual(model.scale.toArray(), [1, 1, 1], 'Export must not alter source scale');
for (const asset of [model, preview, opened, disabled]) disposeModel(asset);
console.log('Room checks passed: geometry, openings, limits, preset validation, cutaway isolation and metric GLB export.');
