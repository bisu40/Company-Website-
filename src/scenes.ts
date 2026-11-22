import {
  ACESFilmicToneMapping, BufferGeometry, DirectionalLight, Float32BufferAttribute,
  Group, HemisphereLight, MathUtils, Mesh, MeshPhysicalMaterial, OrthographicCamera,
  PCFSoftShadowMap, PMREMGenerator, Scene, ShadowMaterial, Vector3, WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { storyProgress } from './narrative-motion.ts';
import type { ArtScene, AuthoredCamera, EncodedAuthoredScene, EncodedObject, VectorTuple } from './generated/narrative/schema.ts';

export type SceneKind = 'hero' | 'company' | 'products' | 'research' | 'engineering' | 'closing';
export type ResearchMode = 'intelligence' | 'architecture' | 'security' | 'tools';
export interface SceneController {
  setRunning(enabled: boolean): void;
  setResearchMode(mode: ResearchMode): void;
  setEngineeringStep(step: number): void;
  dispose(): void;
}

/** Explicit physical dimensions keep large/high-DPR screens within a bounded GPU allocation. */
export function calculateRenderSize(width: number, height: number, dpr: number): { width: number; height: number; pixelRatio: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { width: 1, height: 1, pixelRatio: 1 };
  const logicalWidth = Math.min(width, 16_384);
  const logicalHeight = Math.min(height, 16_384);
  const requested = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const pixelRatio = Math.min(requested, 1.5, Math.sqrt(2_000_000 / (logicalWidth * logicalHeight)));
  return { width: Math.max(1, Math.floor(logicalWidth * pixelRatio)), height: Math.max(1, Math.floor(logicalHeight * pixelRatio)), pixelRatio };
}

export function hasPendingMotion(pointerError: number, progressError: number, layerError: number): boolean {
  return Math.max(Math.abs(pointerError), Math.abs(progressError), Math.abs(layerError)) > 0.001;
}

export function artForScene(kind: SceneKind): ArtScene {
  return kind === 'research' || kind === 'engineering' ? 'technology' : kind === 'closing' ? 'company' : kind;
}

const modelImports = {
  hero: () => import('./generated/narrative/hero.ts'),
  company: () => import('./generated/narrative/company.ts'),
  products: () => import('./generated/narrative/products.ts'),
  technology: () => import('./generated/narrative/technology.ts'),
};
const preparedModels = new Map<ArtScene, EncodedAuthoredScene>();
const pendingModels = new Map<ArtScene, Promise<void>>();

/** Model bytes are authored public geometry in local JS chunks, never a network API or remote asset. */
export async function prepareScene(kind: SceneKind): Promise<void> {
  const name = artForScene(kind);
  if (preparedModels.has(name)) return;
  let pending = pendingModels.get(name);
  if (!pending) {
    pending = modelImports[name]().then(module => {
      const model = module.default;
      if (model.scene !== name || !model.objects.length || model.triangles > 100_000) throw new Error('Invalid authored model.');
      preparedModels.set(name, model);
    }).finally(() => { pendingModels.delete(name); });
    pendingModels.set(name, pending);
  }
  await pending;
}

/** Preserve the native image composition; narrower frames contain rather than crop it. */
export function configureAuthoredCamera(camera: OrthographicCamera, source: AuthoredCamera, aspect: number): void {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const span = source.orthographicScale * Math.max(1, (16 / 9) / ratio);
  camera.left = -span * ratio / 2; camera.right = span * ratio / 2;
  camera.top = span / 2; camera.bottom = -span / 2;
  camera.near = 0.01; camera.far = 1000;
  camera.position.fromArray(source.position); camera.up.set(0, 1, 0);
  camera.lookAt(new Vector3().fromArray(source.target));
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}

interface GeometryInput { readonly positions: ArrayLike<number>; readonly normals: ArrayLike<number>; readonly indices: ArrayLike<number> }
export function createAuthoredGeometry(input: GeometryInput): BufferGeometry {
  const count = input.positions.length;
  if (!count || count % 3 || count > 1_500_000 || input.normals.length !== count || !input.indices.length || input.indices.length % 3 || input.indices.length > 1_500_000) throw new Error('Malformed authored geometry.');
  const positions = Array.from(input.positions), normals = Array.from(input.normals), indices = Array.from(input.indices);
  if (!positions.every(Number.isFinite) || !normals.every(Number.isFinite) || indices.some(index => !Number.isInteger(index) || index < 0 || index >= count / 3)) throw new Error('Invalid authored geometry coordinates.');
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  return geometry;
}

function bytes(encoded: string): Uint8Array {
  const binary = atob(encoded), decoded = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) decoded[index] = binary.charCodeAt(index);
  return decoded;
}

export function decodeAuthoredGeometry(object: EncodedObject): BufferGeometry {
  const positionBytes = bytes(object.positions), normalBytes = bytes(object.normals), indexBytes = bytes(object.indices);
  const positionsView = new DataView(positionBytes.buffer), normalsView = new DataView(normalBytes.buffer), indicesView = new DataView(indexBytes.buffer);
  const count = positionBytes.byteLength / 2;
  const positions = new Float32Array(count), normals = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const axis = index % 3;
    positions[index] = object.positionMin[axis]! + positionsView.getUint16(index * 2, true) / 65535 * object.positionSize[axis]!;
    normals[index] = normalsView.getInt16(index * 2, true) / 32767;
  }
  const indexSize = object.index32 ? 4 : 2, indexCount = indexBytes.byteLength / indexSize;
  const indices = new Uint32Array(indexCount);
  for (let index = 0; index < indexCount; index++) indices[index] = object.index32 ? indicesView.getUint32(index * 4, true) : indicesView.getUint16(index * 2, true);
  return createAuthoredGeometry({ positions, normals, indices });
}

/** Piecewise distance interpolation stays inside the authored route, including right-angle decisions. */
export function sampleMarkerPath(path: readonly VectorTuple[], progress: number): Vector3 {
  if (!path.length) return new Vector3();
  const position = new Vector3().fromArray(path[0]!);
  if (path.length === 1) return position;
  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < path.length; index++) {
    const length = new Vector3().fromArray(path[index]!).distanceTo(new Vector3().fromArray(path[index - 1]!));
    lengths.push(length); total += length;
  }
  if (!total) return position;
  let distance = MathUtils.clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * total;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (distance <= length || index === lengths.length - 1) return position.fromArray(path[index]!).lerp(new Vector3().fromArray(path[index + 1]!), length ? distance / length : 0);
    distance -= length;
  }
  return position.fromArray(path[path.length - 1]!);
}

interface MovingPart { mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>; source: EncodedObject; origin: Vector3 }

/** Called only after the coordinator has prepared the visible model and disposed the previous renderer. */
export function createScene(options: { host: HTMLElement; kind: SceneKind; onFailure: () => void }): SceneController | null {
  const { host, kind, onFailure } = options;
  const model = preparedModels.get(artForScene(kind));
  if (!model) { onFailure(); return null; }
  const region = host.closest<HTMLElement>('[data-scene]') ?? host;
  const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const resources = new Set<{ dispose(): void }>();
  const listeners = new AbortController();
  const scene = new Scene(), modelGroup = new Group(); scene.add(modelGroup);
  const camera = new OrthographicCamera();
  const target = new Vector3().fromArray(model.camera.target);
  const originalOffset = new Vector3().fromArray(model.camera.position).sub(target);
  const viewRight = new Vector3(1, 0, 0);
  const parts: MovingPart[] = [];
  let renderer: WebGLRenderer | undefined, resizeObserver: ResizeObserver | undefined;
  let disposed = false, running = false, animating = false, lastFrame = 0;
  let pointerX = 0, pointerY = 0, easedX = 0, easedY = 0;
  let easedProgress: number | undefined;
  let selection = 0;
  const keep = <T extends { dispose(): void }>(resource: T): T => { resources.add(resource); return resource; };

  function dispose(): void {
    if (disposed) return;
    disposed = true; running = false; animating = false;
    listeners.abort(); resizeObserver?.disconnect();
    region.removeAttribute('data-rendered');
    if (region.dataset.sceneState !== 'fallback') region.dataset.sceneState = 'poster';
    renderer?.setAnimationLoop(null);
    for (const resource of resources) resource.dispose();
    resources.clear(); parts.length = 0; scene.clear();
    if (renderer) { renderer.domElement.remove(); renderer.dispose(); renderer.forceContextLoss(); }
  }
  function fail(): void {
    if (disposed) return;
    region.dataset.sceneState = 'fallback'; dispose(); onFailure();
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power', stencil: false, preserveDrawingBuffer: false });
    if (!context) { fail(); return null; }
    renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power', stencil: false, preserveDrawingBuffer: false });
    renderer.setPixelRatio(1); renderer.setClearColor(0xf0f2ef, 0);
    renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block';
    host.append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); }, { signal: listeners.signal });

    const room = new RoomEnvironment(), pmrem = new PMREMGenerator(renderer);
    try { scene.environment = keep(pmrem.fromScene(room, 0.08)).texture; }
    finally { room.dispose(); pmrem.dispose(); }
    scene.add(new HemisphereLight(0xffffff, 0xc8cfc2, 1.1));
    const key = new DirectionalLight(0xffffff, 2.3); key.position.set(-4, 8, 5); key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 30; key.shadow.normalBias = 0.015; key.shadow.bias = -0.0002;
    keep(key.shadow); scene.add(key);
    const fill = new DirectionalLight(0xe8ede3, 0.7); fill.position.set(5, 3, -3); scene.add(fill);
    const materials = new Map(model.materials.map(material => [material.id, keep(new MeshPhysicalMaterial({
      color: material.color, metalness: material.metalness, roughness: material.roughness,
      clearcoat: material.metalness < 0.1 ? 0.12 : 0.05, clearcoatRoughness: 0.45, envMapIntensity: 0.7,
    }))]));
    for (const object of model.objects) {
      if (object.role === 'ground') {
        const receiver = new Mesh(keep(decodeAuthoredGeometry(object)), keep(new ShadowMaterial({ color: 0x172119, opacity: 0.18 })));
        receiver.position.fromArray(object.pivot); receiver.receiveShadow = true; modelGroup.add(receiver);
        continue;
      }
      const baseMaterial = materials.get(object.material);
      if (!baseMaterial) throw new Error('Authored material is missing.');
      const moving = object.role === 'gate' || object.role === 'cover' || object.role === 'marker';
      const material = moving ? keep(baseMaterial.clone()) : baseMaterial;
      const mesh = new Mesh(keep(decodeAuthoredGeometry(object)), material);
      mesh.name = object.name; mesh.position.fromArray(object.pivot);
      mesh.castShadow = true; mesh.receiveShadow = true; modelGroup.add(mesh);
      if (moving) parts.push({ mesh, source: object, origin: mesh.position.clone() });
    }

    function resize(): void {
      if (disposed || !renderer) return;
      const rect = host.getBoundingClientRect(), size = calculateRenderSize(rect.width, rect.height, window.devicePixelRatio);
      renderer.setSize(size.width, size.height, false);
      configureAuthoredCamera(camera, model!.camera, rect.width / Math.max(rect.height, 1));
      viewRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      wake();
    }

    function render(time: number): void {
      if (disposed || !renderer) return;
      if (mobile && lastFrame && time - lastFrame < 1000 / 30) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 1 / 60;
      lastFrame = time;
      const easing = 1 - Math.exp(-delta * 6);
      easedX += (pointerX - easedX) * easing; easedY += (pointerY - easedY) * easing;
      if (Math.abs(pointerX - easedX) < 0.001) easedX = pointerX;
      if (Math.abs(pointerY - easedY) < 0.001) easedY = pointerY;
      const rect = region.getBoundingClientRect(), targetProgress = storyProgress(rect.top, rect.height, window.innerHeight);
      easedProgress ??= targetProgress;
      easedProgress += (targetProgress - easedProgress) * easing;
      if (Math.abs(targetProgress - easedProgress) < 0.001) easedProgress = targetProgress;
      const progress = easedProgress;
      // Small, controlled camera travel is tied to reading position or pointer input, never elapsed time.
      const offset = originalOffset.clone().applyAxisAngle(new Vector3(0, 1, 0), easedX * 0.025 + (progress - 0.5) * 0.025).applyAxisAngle(viewRight, easedY * 0.015);
      camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld();
      camera.zoom = 1 + progress * 0.045; camera.updateProjectionMatrix();
      let partError = 0;
      for (const part of parts) {
        const destination = part.origin.clone();
        if (part.source.path?.length) destination.copy(sampleMarkerPath(part.source.path, progress));
        else if (part.source.motion) {
          const selectedGroup = part.source.motion.group === undefined || part.source.motion.group === selection % 3;
          const amount = kind === 'research' || kind === 'engineering'
            ? progress * 0.35 + (selectedGroup ? 0.45 : 0.05) + selection / 5 * 0.15
            : MathUtils.smoothstep(progress, 0.08 + (part.source.motion.group ?? 0) * 0.18, 0.35 + (part.source.motion.group ?? 0) * 0.18);
          destination.addScaledVector(new Vector3().fromArray(part.source.motion.axis), part.source.motion.distance * amount);
        }
        part.mesh.position.lerp(destination, easing);
        const error = part.mesh.position.distanceTo(destination);
        if (error < 0.001) part.mesh.position.copy(destination);
        partError = Math.max(partError, error);
      }
      try {
        renderer.render(scene, camera);
        if (region.dataset.rendered !== 'true') { region.dataset.rendered = 'true'; region.dataset.sceneState = 'ready'; }
      } catch { fail(); }
      if (!disposed && animating && !hasPendingMotion(Math.max(Math.abs(pointerX - easedX), Math.abs(pointerY - easedY)), targetProgress - progress, partError)) {
        renderer.setAnimationLoop(null); animating = false; lastFrame = 0;
      }
    }

    function wake(): void {
      if (disposed || !renderer || !running || animating) return;
      animating = true; lastFrame = 0; renderer.setAnimationLoop(render);
    }
    region.addEventListener('pointermove', event => {
      if (mobile || event.pointerType !== 'mouse') return;
      const rect = region.getBoundingClientRect();
      pointerX = MathUtils.clamp((event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1, -1, 1);
      pointerY = MathUtils.clamp((event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1, -1, 1);
      wake();
    }, { passive: true, signal: listeners.signal });
    region.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; wake(); }, { signal: listeners.signal });
    window.addEventListener('scroll', wake, { passive: true, signal: listeners.signal });
    if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); }
    else window.addEventListener('resize', resize, { signal: listeners.signal });
    resize(); render(performance.now());
    if (disposed) return null;
    return {
      setRunning(enabled) {
        if (disposed || !renderer) return;
        running = enabled;
        if (enabled) wake(); else { renderer.setAnimationLoop(null); animating = false; lastFrame = 0; }
      },
      setResearchMode(mode) {
        if (disposed || kind !== 'research') return;
        const index = ['intelligence', 'architecture', 'security', 'tools'].indexOf(mode);
        if (index >= 0 && selection !== index) { selection = index; wake(); }
      },
      setEngineeringStep(step) {
        if (disposed || kind !== 'engineering' || !Number.isInteger(step) || step < 0 || step > 5) return;
        if (selection !== step) { selection = step; wake(); }
      },
      dispose,
    };
  } catch { fail(); return null; }
}
