import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArtScene, EncodedAuthoredScene, EncodedObject, VectorTuple } from '../src/generated/narrative/schema.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const names: ArtScene[] = ['hero', 'company', 'products', 'technology'];
const requested = process.argv[2];
if (requested && !names.includes(requested as ArtScene)) throw new Error('Choose one authored scene or omit the argument for all four.');
const selected = requested ? [requested as ArtScene] : names;
type SourceObject = Omit<EncodedObject, 'positionMin' | 'positionSize' | 'positions' | 'normals' | 'indices' | 'index32'> & { positions: number[]; normals: number[]; indices: number[] };
type SourceScene = Omit<EncodedAuthoredScene, 'objects'> & { objects: SourceObject[] };
const tuple = (values: number[]): VectorTuple => [values[0]!, values[1]!, values[2]!];
const output = path.join(root, 'src', 'generated', 'narrative');
await mkdir(output, { recursive: true });

for (const name of selected) {
  const source = JSON.parse(await readFile(path.join(root, 'artifacts', 'narrative-rebuild', 'masters', `${name}-mesh.json`), 'utf8')) as SourceScene;
  if (source.scene !== name || !source.objects.length || source.triangles > 100_000) throw new Error(`Invalid authored scene: ${name}`);
  const objects: EncodedObject[] = source.objects.map(object => {
    if (!object.positions.length || object.positions.length % 3 || object.normals.length !== object.positions.length || object.indices.length % 3) throw new Error(`Malformed mesh: ${object.name}`);
    if (![...object.positions, ...object.normals].every(Number.isFinite) || object.indices.some(index => !Number.isInteger(index) || index < 0 || index >= object.positions.length / 3)) throw new Error(`Non-finite or out-of-range mesh: ${object.name}`);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    object.positions.forEach((value, index) => { const axis = index % 3; min[axis] = Math.min(min[axis]!, value); max[axis] = Math.max(max[axis]!, value); });
    const size = max.map((value, index) => value - min[index]!);
    const positions = new Uint16Array(object.positions.map((value, index) => size[index % 3]! > 0 ? Math.round((value - min[index % 3]!) / size[index % 3]! * 65535) : 0));
    const normals = new Int16Array(object.normals.map(value => Math.round(Math.max(-1, Math.min(1, value)) * 32767)));
    const index32 = object.positions.length / 3 > 65535;
    const indices = index32 ? new Uint32Array(object.indices) : new Uint16Array(object.indices);
    return {
      name: object.name, material: object.material, role: object.role, pivot: object.pivot,
      positionMin: tuple(min), positionSize: tuple(size),
      positions: Buffer.from(positions.buffer).toString('base64'), normals: Buffer.from(normals.buffer).toString('base64'),
      indices: Buffer.from(indices.buffer).toString('base64'), index32,
      ...(object.motion ? { motion: object.motion } : {}), ...(object.path ? { path: object.path } : {}),
    };
  });
  const encoded: EncodedAuthoredScene = { scene: name, camera: source.camera, materials: source.materials, objects, bounds: source.bounds, triangles: source.triangles };
  const code = `// Generated from original Blender geometry by scripts/embed-narrative-models.ts.\nimport type { EncodedAuthoredScene } from './schema.ts';\nconst scene: EncodedAuthoredScene = ${JSON.stringify(encoded)};\nexport default scene;\n`;
  await writeFile(path.join(output, `${name}.ts`), code, 'utf8');
  console.log(`${name}: ${source.triangles.toLocaleString('en')} triangles; ${objects.length} authored objects; ${Buffer.byteLength(code).toLocaleString('en')} source bytes`);
}
