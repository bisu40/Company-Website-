import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const project = fileURLToPath(new URL('..', import.meta.url));
const scenes = ['hero', 'company', 'research', 'engineering', 'closing'] as const;
type ArtworkScene = typeof scenes[number];
const widths = [640, 1280, 1920, 3840] as const;

/** Manual production step. Normal site builds use the committed optimized public assets. */
export async function prepareVisuals(selectedScenes: readonly ArtworkScene[] = scenes): Promise<void> {
  const source = path.join(project, 'artifacts', 'transformation', 'masters');
  const output = path.join(project, 'public', 'assets', 'visuals');
  // A subset supports processing completed masters while the render batch continues.
  // The no-argument production call validates and processes the complete five-scene family.
  for (const scene of selectedScenes) {
    if (!scenes.includes(scene)) throw new Error('Unknown artwork scene.');
    const file = path.join(source, `${scene}.png`);
    const metadata = await sharp(file).metadata();
    if (metadata.width !== 3840 || metadata.height !== 2160) {
      throw new Error(`${scene} must have an original 3840 by 2160 render before processing.`);
    }
  }
  await mkdir(output, { recursive: true });
  sharp.concurrency(2);
  const manifest: { scene: string; width: number; height: number; format: string; bytes: number }[] = [];
  for (const scene of selectedScenes) {
    const original = await readFile(path.join(source, `${scene}.png`));
    for (const width of widths) {
      for (const format of ['webp', 'avif'] as const) {
        const name = `${scene}-${width}.${format}`;
        let image = sharp(original).resize({ width, height: width * 9 / 16, fit: 'fill', withoutEnlargement: true });
        image = format === 'webp' ? image.webp({ quality: 84, effort: 6 }) : image.avif({ quality: 57, effort: 6, chromaSubsampling: '4:4:4' });
        const result = await image.toFile(path.join(output, name));
        if (result.width !== width || result.height !== width * 9 / 16) throw new Error(`${name} was encoded at an unexpected size.`);
      }
    }
  }
  for (const scene of scenes) {
    for (const width of widths) {
      for (const format of ['webp', 'avif'] as const) {
        const file = path.join(output, `${scene}-${width}.${format}`);
        try {
          manifest.push({ scene, width, height: width * 9 / 16, format, bytes: (await stat(file)).size });
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
        }
      }
    }
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ originalSize: [3840, 2160], authoring: 'Original procedural Blender scenes', assets: manifest }, null, 2) + '\n');
  console.log(`Processed ${selectedScenes.length} native 4K scenes; ${manifest.length} responsive images are available.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareVisuals().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Artwork processing failed.');
    process.exitCode = 1;
  });
}
