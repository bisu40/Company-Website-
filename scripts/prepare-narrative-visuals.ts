import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const project = fileURLToPath(new URL('..', import.meta.url));
const scenes = ['hero', 'company', 'products', 'technology'] as const;
type Scene = typeof scenes[number];
const widths = [640, 1280, 1920, 3840] as const;

/** Offline-only image preparation. Normal builds only copy these reviewed public candidates. */
export async function prepareNarrativeVisuals(selected: readonly Scene[] = scenes): Promise<void> {
  const source = path.join(project, 'artifacts/narrative-rebuild/masters');
  const output = path.join(project, 'public/assets/narrative');
  for (const scene of selected) {
    if (!scenes.includes(scene)) throw new Error('Unknown narrative scene.');
    const metadata = await sharp(path.join(source, `${scene}.png`)).metadata();
    if (metadata.width !== 3840 || metadata.height !== 2160) throw new Error(`${scene} needs its native 3840 by 2160 master.`);
  }
  await mkdir(output, { recursive: true });
  sharp.concurrency(2);
  for (const scene of selected) {
    const original = await readFile(path.join(source, `${scene}.png`));
    for (const width of widths) {
      for (const format of ['avif', 'webp'] as const) {
        let image = sharp(original).flatten({ background: scene === 'technology' ? '#1f2522' : '#f0f2ef' }).resize(width, width * 9 / 16, { withoutEnlargement: true });
        image = format === 'avif' ? image.avif({ quality: 61, effort: 6, chromaSubsampling: '4:4:4' }) : image.webp({ quality: 87, effort: 6 });
        await image.toFile(path.join(output, `${scene}-${width}.${format}`));
      }
    }
  }
  const assets = [];
  for (const scene of scenes) for (const width of widths) for (const format of ['avif', 'webp']) {
    try { assets.push({ scene, width, height: width * 9 / 16, format, bytes: (await stat(path.join(output, `${scene}-${width}.${format}`))).size }); }
    catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
  await writeFile(path.join(source, 'responsive-manifest.json'), JSON.stringify({ nativeSize: [3840, 2160], source: 'Original Blender Working Model', assets }, null, 2) + '\n');
  console.log(`Prepared ${selected.length} original scenes; ${assets.length} responsive images available.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const requested = process.argv.slice(2);
  prepareNarrativeVisuals(requested.length ? requested as Scene[] : scenes).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Narrative image preparation failed.');
    process.exitCode = 1;
  });
}
