import {
  CanvasTexture, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute, Group, HemisphereLight, Mesh,
  MeshPhysicalMaterial, PerspectiveCamera, Scene, SRGBColorSpace, Vector2, WebGLRenderer,
} from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

declare const __IRIUM_EMBLEM_SVG__: string;

function violetPosition(surface: HTMLCanvasElement): number {
  const data = surface.getContext('2d')!.getImageData(0, 0, surface.width, 1).data;
  let strongest = -Infinity;
  let violet = 0;
  for (let x = 0; x < surface.width; x++) {
    const index = x * 4;
    const saturation = data[index + 2]! - (data[index]! + data[index + 1]!) / 2;
    if (saturation > strongest) {
      strongest = saturation;
      violet = x;
    }
  }
  return (violet + .5) / surface.width;
}

function buildEmblem(image: HTMLImageElement): Group {
  // Use presentation attributes so parsing the official paint respects the site's inline-style policy.
  const artwork = __IRIUM_EMBLEM_SVG__
    .replace(/\sstyle="([^"]*)"/g, (_attribute, style: string) =>
      [...style.matchAll(/(?:^|;)\s*(fill|fill-rule|stop-color|stop-opacity):\s*([^;]+)/g)]
        .map(([, property, value]) => ` ${property}="${value!.trim()}"`).join(''),
    )
    // SVGLoader expects numeric stop offsets and would clamp percentage values above one.
    .replace(/\boffset="([\d.]+)%"/g, (_attribute, offset: string) => `offset="${Number(offset) / 100}"`);
  const { paths, xml } = new SVGLoader().parse(artwork);
  const [left = 0, top = 0, width = 1, height = 1] = (xml.getAttribute('viewBox') ?? '').trim().split(/\s+/).map(Number);
  const depth = width * .23;
  const surface = document.createElement('canvas');
  surface.width = 512;
  surface.height = 512;
  const paint = surface.getContext('2d');
  if (!paint) return new Group();
  paint.drawImage(image, 0, 0, surface.width, surface.height);
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  const polished = { metalness: .13, roughness: .19, clearcoat: 1, clearcoatRoughness: .10 };
  const face = new MeshPhysicalMaterial({
    ...polished, map: texture, alphaTest: .45,
    emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: .28,
  });
  const emblem = new Group();
  emblem.scale.set(1 / width, -1 / width, 1 / width);

  paths.forEach((path, order) => {
    const shapes = path.toShapes();
    if (!shapes.length) return;
    const paint = SVGLoader.createFillMaterial(path);
    if (!paint) return;
    const gradient = paint.map;
    const projection = gradient?.matrix.clone();
    const violet = gradient?.image instanceof HTMLCanvasElement ? violetPosition(gradient.image) : 0;
    if (gradient) {
      gradient.channel = 1;
      gradient.matrix.identity();
    }
    const sides = new MeshPhysicalMaterial({ ...polished, color: paint.color, map: gradient });
    paint.dispose();

    const geometry = new ExtrudeGeometry(shapes, {
      depth, steps: 3, curveSegments: 10, bevelEnabled: true, bevelSegments: 3,
      bevelThickness: width * .015, bevelSize: width * .004,
    });
    const vertices = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const ribbonUV = new Float32BufferAttribute(new Float32Array(vertices.count * 2), 2);
    const ribbonPoint = new Vector2();
    for (let vertex = 0; vertex < vertices.count; vertex++) {
      const x = vertices.getX(vertex);
      const y = vertices.getY(vertex);
      uv.setXY(vertex, (x - left) / width, 1 - (y - top) / height);
      if (projection) {
        ribbonPoint.set(x, y).applyMatrix3(projection);
        const facePosition = Math.max(0, Math.min(1, ribbonPoint.x));
        const back = Math.max(0, Math.min(1, (1 - vertices.getZ(vertex) / depth) * 2.5));
        // Bring violet forward along the walls so it is visible even inside the overlapping ribbons.
        ribbonUV.setXY(vertex, facePosition + (violet - facePosition) * back, ribbonPoint.y);
      }
    }
    geometry.setAttribute('uv1', ribbonUV);
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
    if (!renderingAvailable || !visible || document.hidden) {
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
  document.addEventListener('visibilitychange', syncMotion);
  resize();
  syncMotion();
}

const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-emblem]');
const image = document.querySelector<HTMLImageElement>('.hero-emblem');
if (canvas && image) void initializeHero(canvas, image);
