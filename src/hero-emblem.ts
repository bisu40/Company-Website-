import {
  CanvasTexture, Color, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute, Group, HemisphereLight, Mesh,
  MeshPhysicalMaterial, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { visualMotionEvent, visualMotionPlaying } from './visual-motion.ts';

declare const __IRIUM_EMBLEM_SVG__: string;

function emblemColor({ data, width, height }: ImageData, u: number, v: number, color: Color): void {
  const x = Math.max(0, Math.min(width - 1, Math.floor(u * width)));
  const y = Math.max(0, Math.min(height - 1, Math.floor((1 - v) * height)));
  let sample = (y * width + x) * 4;
  if (data[sample + 3]! < 192) {
    // Bevel vertices can extend just past the painted outline. Use the nearest solid artwork there.
    let closest = Infinity;
    for (let sy = Math.max(0, y - 8); sy <= Math.min(height - 1, y + 8); sy++) {
      for (let sx = Math.max(0, x - 8); sx <= Math.min(width - 1, x + 8); sx++) {
        const candidate = (sy * width + sx) * 4;
        const distance = (sx - x) ** 2 + (sy - y) ** 2;
        if (distance < closest && data[candidate + 3]! >= 192) {
          sample = candidate;
          closest = distance;
        }
      }
    }
  }
  if (data[sample + 3]! === 0) {
    color.set('#d7e050');
    return;
  }
  color.setRGB(data[sample]! / 255, data[sample + 1]! / 255, data[sample + 2]! / 255, SRGBColorSpace);
}

function buildEmblem(image: HTMLImageElement): Group {
  // The SVG is baked into the bundle for its contours. The same official SVG image supplies the face colors.
  const contours = __IRIUM_EMBLEM_SVG__.replace(/\sstyle="[^"]*"/g, '');
  const { paths, xml } = new SVGLoader().parse(contours);
  const [left = 0, top = 0, width = 1, height = 1] = (xml.getAttribute('viewBox') ?? '').trim().split(/\s+/).map(Number);
  const depth = width * .23;
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 512;
  const paint = surface.getContext('2d');
  if (!paint) return new Group();
  paint.drawImage(image, 0, 0, surface.width, surface.height);
  const pixels = paint.getImageData(0, 0, surface.width, surface.height);
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  const polished = { metalness: .13, roughness: .19, clearcoat: 1, clearcoatRoughness: .10 };
  const face = new MeshPhysicalMaterial({
    ...polished, map: texture, alphaTest: .45,
    emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: .28,
  });
  const sides = new MeshPhysicalMaterial({ ...polished, vertexColors: true });
  const emblem = new Group();
  emblem.scale.set(1 / width, -1 / width, 1 / width);

  paths.forEach((path, order) => {
    const shapes = path.toShapes();
    if (!shapes.length) return;
    const geometry = new ExtrudeGeometry(shapes, {
      depth, curveSegments: 10, bevelEnabled: true, bevelSegments: 3,
      bevelThickness: width * .015, bevelSize: width * .004,
    });
    const vertices = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const colors = new Float32Array(vertices.count * 3);
    const color = new Color();
    for (let vertex = 0; vertex < vertices.count; vertex++) {
      const u = (vertices.getX(vertex) - left) / width;
      const v = 1 - (vertices.getY(vertex) - top) / height;
      uv.setXY(vertex, u, v);
      emblemColor(pixels, u, v, color);
      colors.set([color.r, color.g, color.b], vertex * 3);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.translate(-left - width / 2, -top - height / 2, -depth / 2 + order * .45);
    emblem.add(new Mesh(geometry, [face, sides]));
  });
  return emblem;
}

async function initializeHero(canvas: HTMLCanvasElement, image: HTMLImageElement): Promise<void> {
  let renderer: WebGLRenderer;
  let emblem: Group;
  try {
    await image.decode();
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!context) return;
    emblem = buildEmblem(image);
    if (!emblem.children.length) return;
    renderer = new WebGLRenderer({ canvas, context, alpha: true });
  } catch {
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, .1, 10);
  // Leave room in the taller canvas for the full tilt and vertical travel.
  camera.position.z = 2.80;
  scene.add(emblem, new HemisphereLight('#ffffff', '#8e8e8e', 2.2));
  const key = new DirectionalLight('#ffffff', 2.65);
  key.position.set(-2, 3, 4);
  const rim = new DirectionalLight('#ffffff', 2.4);
  rim.position.set(4, 0, -2);
  scene.add(key, rim);

  let frame: number | undefined;
  let renderingAvailable = true;
  let visible = canvas.getBoundingClientRect().top < innerHeight && canvas.getBoundingClientRect().bottom > 0;
  let previous: number | undefined;
  let elapsed = 0;

  function render() {
    if (!renderingAvailable) return;
    emblem.rotation.set(-.15 + .20 * Math.cos(elapsed * 1.24), .92 * Math.sin(.41 + elapsed * 1.27), -.09 * Math.cos(elapsed * 1.1));
    emblem.position.y = .10 * Math.sin(elapsed * 1.85);
    key.position.x = -2 + Math.sin(elapsed * 1.27) * 2;
    renderer.render(scene, camera);
    document.documentElement.classList.add('hero-3d-ready');
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (previous !== undefined && now - previous < 25) return;
    elapsed += previous === undefined ? 0 : Math.min(now - previous, 67) / 1000;
    previous = now;
    render();
  }

  function syncMotion() {
    if (!renderingAvailable || !visualMotionPlaying() || !visible || document.hidden) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      previous = undefined;
    } else if (frame === undefined) {
      frame = requestAnimationFrame(tick);
    }
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    syncMotion();
  }).observe(canvas);
  canvas.addEventListener('webglcontextlost', () => {
    renderingAvailable = false;
    document.documentElement.classList.remove('hero-3d-ready');
    syncMotion();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderingAvailable = true;
    resize();
    syncMotion();
  });
  document.addEventListener(visualMotionEvent, syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  resize();
  syncMotion();
}

const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-emblem]');
const image = document.querySelector<HTMLImageElement>('.hero-emblem');
if (canvas && image) {
  function start() {
    if (!visualMotionPlaying()) return;
    document.removeEventListener(visualMotionEvent, start);
    void initializeHero(canvas!, image!);
  }
  document.addEventListener(visualMotionEvent, start);
  start();
}
