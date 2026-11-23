import {
  Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer,
} from 'three';
import './hero-emblem.ts';

const boardVertex = `
  uniform float time;
  varying vec3 board;
  void main() {
    vec3 point = position;
    float wave = sin(point.x * .51 + point.y * .23 - time * .57);
    point.z += .24 * wave + .13 * sin(point.y * .55 - point.x * .17 + time * .42);
    board = point;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.);
  }
`;

const boardFragment = `
  uniform float time;
  varying vec3 board;

  float hash(vec2 id) {
    return fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
  }

  float track(float distance, float width, float aa) {
    return 1. - smoothstep(width - aa, width + aa, distance);
  }

  float pulse(float coordinate, float clock) {
    float head = fract(coordinate - clock);
    return exp(-head * 8.) * smoothstep(.97, 1., head)
      + exp(-head * 8.) * (1. - smoothstep(.53, .88, head));
  }

  void main() {
    vec2 point = board.xy * .90;
    vec2 cell = floor(point);
    vec2 local = fract(point);
    float detail = hash(cell);
    float row = hash(vec2(cell.y, 3.));
    float column = hash(vec2(9., cell.x));
    float aa = clamp(max(fwidth(point.x), fwidth(point.y)) * .6, .002, .034);

    float rowLine = abs(local.y - (.24 + row * .17));
    float columnLine = abs(local.x - (.67 + column * .11));
    float horizontal = track(rowLine, .014, aa);
    float vertical = track(columnLine, .012, aa);
    float turn = abs(local.y - (.64 + max(0., local.x - .58) * .56));
    float branch = track(turn, .010, aa)
      * smoothstep(.08, .1, local.x) * (1. - smoothstep(.78, .8, local.x))
      * step(.28, detail);
    float parallel = track(abs(local.y - (.18 + row * .17)), .006, aa)
      * smoothstep(.04, .07, local.x) * (1. - smoothstep(.52, .58, local.x))
      * step(.44, detail);

    vec2 pad = abs(local - vec2(.39, .71)) - vec2(.13, .079);
    float padShape = max(pad.x, pad.y);
    float chip = (1. - smoothstep(-aa, aa, padShape)) * step(.74, detail);
    float border = track(abs(padShape), .009, aa) * step(.74, detail);
    float node = track(length(local - vec2(.67 + column * .11, .24 + row * .17)), .030, aa)
      * step(.51, detail);
    float grid = max(track(min(local.x, 1. - local.x), .004, aa), track(min(local.y, 1. - local.y), .004, aa));

    vec3 dark = vec3(.053, .071, .111);
    float wave = .5 + .5 * sin(point.x * .23 - point.y * .19 - time * .66);
    vec3 color = dark + vec3(.022, .032, .061) * wave + board.z * vec3(.015, .024, .048);
    color += vec3(.060, .098, .17) * grid * .24;
    color += vec3(.043, .077, .135) * (horizontal + vertical * .69 + branch * .87 + parallel * .52);
    color += vec3(.034, .060, .102) * chip + vec3(.065, .112, .184) * border + vec3(.080, .15, .226) * node;

    float flowX = pulse(point.x * .29 + row, time * (.22 + row * .14));
    float flowY = pulse(point.y * -.26 + column, time * (.19 + column * .15));
    float signalX = flowX * horizontal;
    float signalY = flowY * vertical;
    float bloom = flowX * exp(-18. * rowLine) + flowY * exp(-22. * columnLine);
    color += vec3(.053, .103, .197) * bloom * .62;
    color += vec3(.22, .44, .74) * signalX * .67 + vec3(.17, .43, .57) * signalY * .62;
    gl_FragColor = vec4(color, 1.);
  }
`;

function initializeCircuit(canvas: HTMLCanvasElement): void {
  let renderer: WebGLRenderer;
  try {
    const context = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!context) return;
    renderer = new WebGLRenderer({ canvas, context, antialias: false });
  } catch {
    return;
  }

  renderer.setClearColor('#151c2d');
  const scene = new Scene();
  const camera = new PerspectiveCamera(44, 1, .1, 100);
  const time = { value: 0 };
  const material = new ShaderMaterial({
    uniforms: { time }, vertexShader: boardVertex, fragmentShader: boardFragment,
    toneMapped: false,
  });
  // A subdivided surface provides real depth and keeps the field extending past every viewport edge.
  const board = new Mesh(new PlaneGeometry(80, 80, 84, 84), material);
  board.rotation.x = -Math.PI / 2;
  scene.add(board);

  let frame: number | undefined;
  let lastFrame: number | undefined;
  let available = true;

  function paint() {
    const elapsed = time.value;
    camera.position.set(Math.sin(elapsed * .29) * .93, 7.6 + Math.sin(elapsed * .34) * .42, 9.3 + Math.sin(elapsed * .23) * .35);
    camera.lookAt(Math.sin(elapsed * .25) * .34, 0, 0);
    renderer.render(scene, camera);
    canvas.dataset.rendered = '';
  }

  function resize() {
    if (!available) return;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    const pixelBudget = 2_000_000;
    const ratio = Math.min(devicePixelRatio || 1, 1.6, Math.sqrt(pixelBudget / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    paint();
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    if (lastFrame !== undefined && now - lastFrame < 31) return;
    time.value += lastFrame === undefined ? 0 : Math.min(now - lastFrame, 67) / 1000;
    lastFrame = now;
    paint();
  }

  function syncMotion() {
    if (!available || document.hidden) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      lastFrame = undefined;
    } else if (frame === undefined) {
      frame = requestAnimationFrame(tick);
    }
  }

  canvas.addEventListener('webglcontextlost', () => {
    available = false;
    delete canvas.dataset.rendered;
    syncMotion();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    available = true;
    resize();
    syncMotion();
  });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncMotion);
  resize();
  syncMotion();
}

const backdrop = document.querySelector<HTMLCanvasElement>('[data-circuit-background]');
if (backdrop) initializeCircuit(backdrop);
