import { initializeVisualMotion, visualMotionEvent, visualMotionPlaying } from './visual-motion.ts';

type BoardPoint = readonly [x: number, depth: number];
type ScreenPoint = readonly [x: number, y: number];
type Trace = { points: BoardPoint[]; phase: number; velocity: number; color: string };

function boardTraces(): Trace[] {
  const traces: Trace[] = [];
  for (let index = 0; index < 52; index++) {
    const lane = Math.floor(index / 4);
    const edge = index % 4;
    const offset = (lane - 6) * .56;
    const bend = .6 + (lane % 4) * .28;
    const end = 1.7 + Math.abs(offset) * .48;
    const points: BoardPoint[] = [
      [10.9 + (lane % 3) * .26, offset * 1.56],
      [6.4 + (lane % 5) * .72, offset * 1.56],
      [5.6 + (lane % 5) * .72, offset * 1.56 + bend],
      [end + .67, offset * 1.56 + bend],
      [end, offset * 1.56 + bend - .67],
    ];
    traces.push({
      points: points.map(([x, depth]): BoardPoint => {
        if (edge === 0) return [x, depth];
        if (edge === 1) return [-x, -depth];
        if (edge === 2) return [depth, -x * .73];
        return [-depth, x * .73];
      }),
      phase: (index * .381966) % 1,
      velocity: .20 + (index % 7) * .018,
      color: index % 5 === 0 ? '181, 177, 255' : '105, 187, 255',
    });
  }
  return traces;
}

function drawCircuit(
  context: CanvasRenderingContext2D, traces: Trace[], width: number, height: number, time: number,
): void {
  const compact = width < 760;
  const sway = Math.sin(time * .53);
  const centerX = width * ((compact ? .5 : .735) + sway * .018);
  const centerY = height * ((compact ? .31 : .55) + Math.sin(time * .43) * .025);
  const scale = Math.min(width * (compact ? .095 : .061), height * .111);
  const project = ([x, depth]: BoardPoint): ScreenPoint => {
    // Perspective divide on an inclined x/z plane. Near traces expand and far traces recede.
    const horizontal = x + depth * (.42 + sway * .11);
    const vertical = depth * (.43 + Math.cos(time * .53) * .04) - x * .13;
    const distance = 1 / (1.12 - depth * .039 + x * .014);
    return [centerX + horizontal * scale * distance, centerY + vertical * scale * distance];
  };
  context.clearRect(0, 0, width, height);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (let line = -11; line <= 11; line++) {
    const [leftX, leftY] = project([-13, line]);
    const [rightX, rightY] = project([13, line]);
    const [farX, farY] = project([line, -12]);
    const [nearX, nearY] = project([line, 12]);
    context.beginPath();
    context.moveTo(leftX, leftY);
    context.lineTo(rightX, rightY);
    context.moveTo(farX, farY);
    context.lineTo(nearX, nearY);
    context.strokeStyle = 'rgba(135, 159, 226, .10)';
    context.lineWidth = .65;
    context.stroke();
  }

  traces.forEach(({ points, phase, velocity, color }, index) => {
    const path = points.map(project);
    const first = path[0]!;
    const last = path[path.length - 1]!;
    context.beginPath();
    context.moveTo(...first);
    for (const point of path.slice(1)) context.lineTo(...point);
    context.strokeStyle = `rgba(${color}, ${index % 4 === 0 ? .42 : .25})`;
    context.lineWidth = index % 4 === 0 ? 1.2 : .78;
    context.stroke();
    context.beginPath();
    context.arc(...last, index % 4 === 0 ? 2.25 : 1.55, 0, Math.PI * 2);
    context.stroke();

    if (index % 3 === 1) return;
    const progress = ((time * velocity + phase) % 1) * (path.length - 1);
    const segment = Math.min(path.length - 2, Math.floor(progress));
    const start = path[segment]!;
    const endPoint = path[segment + 1]!;
    const travel = progress - segment;
    const x = start[0] + (endPoint[0] - start[0]) * travel;
    const y = start[1] + (endPoint[1] - start[1]) * travel;
    const tail = Math.max(0, travel - .53);
    const tailX = start[0] + (endPoint[0] - start[0]) * tail;
    const tailY = start[1] + (endPoint[1] - start[1]) * tail;
    if (travel > .01) {
      const streak = context.createLinearGradient(tailX, tailY, x, y);
      streak.addColorStop(0, `rgba(${color}, 0)`);
      streak.addColorStop(.65, `rgba(${color}, .36)`);
      streak.addColorStop(1, `rgba(${color}, .88)`);
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.lineTo(x, y);
      context.strokeStyle = streak;
      context.lineWidth = index % 3 === 0 ? 2.2 : 1.4;
      context.stroke();
    }
    const glow = context.createRadialGradient(x, y, 0, x, y, 10);
    glow.addColorStop(0, `rgba(${color}, .91)`);
    glow.addColorStop(.28, `rgba(${color}, .42)`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = glow;
    context.fillRect(x - 10, y - 10, 20, 20);
    context.fillStyle = 'rgba(229, 243, 255, .85)';
    context.fillRect(x - .8, y - .8, 1.6, 1.6);
  });
}

function initializeCircuit(canvas: HTMLCanvasElement): void {
  const drawingContext = canvas.getContext('2d', { alpha: true });
  if (!drawingContext) return;
  const context: CanvasRenderingContext2D = drawingContext;
  const traces = boardTraces();
  let width = 0;
  let height = 0;
  let frame: number | undefined;
  let lastFrame: number | undefined;
  let elapsed = 0;

  function paint() {
    drawCircuit(context, traces, width, height, elapsed);
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const pixelBudget = 2_000_000;
    const resolution = Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(pixelBudget / (width * height)));
    canvas.width = Math.max(1, Math.floor(width * resolution));
    canvas.height = Math.max(1, Math.floor(height * resolution));
    context.setTransform(resolution, 0, 0, resolution, 0, 0);
    paint();
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    // Thirty drawings per second are enough for the slow background and limit battery use.
    if (lastFrame !== undefined && now - lastFrame < 31) return;
    elapsed += lastFrame === undefined ? 0 : Math.min(now - lastFrame, 67) / 1000;
    lastFrame = now;
    paint();
  }

  function syncMotion() {
    if (!visualMotionPlaying() || document.hidden) {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      lastFrame = undefined;
    } else if (frame === undefined) {
      frame = requestAnimationFrame(tick);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener(visualMotionEvent, syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  document.documentElement.classList.add('circuit-ready');
  syncMotion();
}

const canvas = document.querySelector<HTMLCanvasElement>('[data-circuit-background]');
const control = document.querySelector<HTMLButtonElement>('[data-visual-motion]');
if (control) initializeVisualMotion(control);
if (canvas) initializeCircuit(canvas);
