import assert from 'node:assert/strict';
import { test } from 'node:test';

test('drawing buffers respect both the DPR ceiling and two-million-pixel budget', async () => {
  const { calculateRenderSize } = await import('../src/scenes.ts');
  for (const [width, height, dpr] of [[3840, 2160, 3], [1920, 1080, 2], [390, 844, 3], [320, 250, 1]]) {
    const size = calculateRenderSize(width!, height!, dpr!);
    assert.ok(size.width * size.height <= 2_000_000);
    assert.ok(size.pixelRatio <= 1.5);
    assert.ok(size.width <= width! * 1.5 && size.height <= height! * 1.5);
    assert.ok(Number.isInteger(size.width) && Number.isInteger(size.height));
  }
  assert.deepEqual(calculateRenderSize(320, 250, 1), { width: 320, height: 250, pixelRatio: 1 });
  assert.deepEqual(calculateRenderSize(0, Number.NaN, 2), { width: 1, height: 1, pixelRatio: 1 });
});

test('the scene selector chooses visible art and keeps the current scene during small boundary shifts', async () => {
  const { selectVisibleScene } = await import('../src/scene-coordinator.ts');
  assert.equal(selectVisibleScene([
    { id: 'above', top: -700, bottom: -100, width: 700, height: 600 },
    { id: 'hero', top: 20, bottom: 620, width: 700, height: 600 },
    { id: 'below', top: 900, bottom: 1400, width: 700, height: 500 },
  ], 800), 'hero');
  assert.equal(selectVisibleScene([
    { id: 'current', top: -300, bottom: 300, width: 700, height: 600 },
    { id: 'next', top: 450, bottom: 1050, width: 700, height: 600 },
  ], 800, 'current'), 'current');
  assert.equal(selectVisibleScene([{ id: 'below', top: 900, bottom: 1400, width: 700, height: 500 }], 800), undefined);
});

test('effects never render while disabled, hidden, suspended, or outside the nearby viewport', async () => {
  const { mayLoadScene, initializeScenes } = await import('../src/scene-coordinator.ts');
  assert.equal(mayLoadScene({ enabled: true, visible: true, pageActive: true, nearby: true }), true);
  for (const field of ['enabled', 'visible', 'pageActive', 'nearby'] as const) {
    assert.equal(mayLoadScene({ enabled: true, visible: true, pageActive: true, nearby: true, [field]: false }), false, field);
  }
  // Server-side tooling can import the coordinator without a DOM or starting WebGL.
  const cleanup = initializeScenes();
  assert.doesNotThrow(cleanup);
});

test('the authored camera contains the same native composition on desktop and narrow frames', async () => {
  const { configureAuthoredCamera } = await import('../src/scenes.ts');
  const { OrthographicCamera, Vector3 } = await import('three');
  const source = { position: [6, 7, 10], target: [0, 0, 0], orthographicScale: 6 } as const;
  for (const aspect of [16 / 9, 16 / 11, 390 / 844, 2560 / 1440]) {
    const camera = new OrthographicCamera();
    configureAuthoredCamera(camera, source, aspect);
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const corners = [-1, 1].flatMap(x => [-1, 1].map(y => right.clone().multiplyScalar(x * 6 * (16 / 9) / 2).addScaledVector(up, y * 3).project(camera)));
    assert.ok(corners.every(point => Math.abs(point.x) <= 1.000001 && Math.abs(point.y) <= 1.000001), 'No part of the authored image plane should be cropped');
    assert.ok(Math.abs(new Vector3(0, 0, 0).project(camera).x) < 0.000001, 'The authored target remains centered');
  }
});

test('authored geometry rejects invalid buffers before allocating GPU resources', async () => {
  const { createAuthoredGeometry } = await import('../src/scenes.ts');
  const mesh = { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], indices: [0, 1, 2] };
  const geometry = createAuthoredGeometry(mesh);
  try {
    const position = geometry.getAttribute('position');
    assert.equal(position.count, 3);
    assert.ok([...position.array].every(Number.isFinite));
    assert.deepEqual([...geometry.getIndex()!.array], [0, 1, 2]);
  } finally { geometry.dispose(); }
  assert.throws(() => createAuthoredGeometry({ ...mesh, positions: [Number.NaN, 0, 0] }));
  assert.throws(() => createAuthoredGeometry({ ...mesh, normals: [] }));
  assert.throws(() => createAuthoredGeometry({ ...mesh, indices: [0, 1, 8] }));
  assert.throws(() => createAuthoredGeometry({ ...mesh, indices: [0, 1] }));
});

test('six approved principles are valid, while malformed or out-of-range steps cannot reach the scene', async () => {
  const { isEngineeringStep } = await import('../src/scene-coordinator.ts');
  for (let step = 0; step < 6; step++) assert.equal(isEngineeringStep(step), true);
  for (const step of [-1, 6, 2.5, NaN, Infinity, '3', null, undefined]) assert.equal(isEngineeringStep(step), false);
});

test('markers follow authored path segments by distance without overshooting their route', async () => {
  const { sampleMarkerPath } = await import('../src/scenes.ts');
  const path = [[0, 0, 0], [3, 0, 0], [3, 0, 1]] as const;
  assert.deepEqual(sampleMarkerPath(path, -1).toArray(), [0, 0, 0]);
  assert.deepEqual(sampleMarkerPath(path, 0.5).toArray(), [2, 0, 0]);
  assert.deepEqual(sampleMarkerPath(path, 0.875).toArray(), [3, 0, 0.5]);
  assert.deepEqual(sampleMarkerPath(path, 2).toArray(), [3, 0, 1]);
});

test('demand rendering continues only until pointer, scroll and layer changes have all settled', async () => {
  const { hasPendingMotion } = await import('../src/scenes.ts');
  assert.equal(hasPendingMotion(0, 0, 0), false);
  assert.equal(hasPendingMotion(0.0001, 0.0001, 0.0001), false);
  assert.equal(hasPendingMotion(0.05, 0, 0), true);
  assert.equal(hasPendingMotion(0, 0.05, 0), true);
  assert.equal(hasPendingMotion(0, 0, 0.05), true);
});

test('all four original Blender models decode without geometry corruption and stay inside their triangle budgets', async () => {
  const { decodeAuthoredGeometry, prepareScene } = await import('../src/scenes.ts');
  for (const name of ['hero', 'company', 'products', 'technology'] as const) {
    const { default: model } = await import(`../src/generated/narrative/${name}.ts`);
    assert.ok(model.triangles > 1000 && model.triangles <= 60_000, name);
    let triangles = 0;
    for (const mesh of model.objects) {
      const geometry = decodeAuthoredGeometry(mesh);
      try {
        const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
        assert.ok([...position.array].every(Number.isFinite), mesh.name);
        assert.equal(normal.count, position.count, mesh.name);
        triangles += geometry.getIndex()!.count / 3;
        assert.ok(model.materials.some((material: { id: string }) => material.id === mesh.material), mesh.name);
        if (mesh.path?.length) assert.deepEqual(mesh.path[0], mesh.pivot, 'A marker starts at its authored resting position');
      } finally { geometry.dispose(); }
    }
    assert.equal(triangles, model.triangles, `${name}: encoded and authored topology must agree`);
    await prepareScene(name === 'technology' ? 'research' : name);
  }
});

test('typography enhancement stays importable without a DOM and clamps scroll progress', async () => {
  const { storyProgress, initializeNarrativeMotion } = await import('../src/narrative-motion.ts');
  assert.equal(storyProgress(1000, 500, 800), 0);
  assert.equal(storyProgress(-600, 500, 800), 1);
  assert.equal(storyProgress(150, 500, 800), 0.5);
  assert.equal(storyProgress(NaN, 500, 800), 0);
  assert.equal(storyProgress(0, 0, 800), 0);
  assert.doesNotThrow(initializeNarrativeMotion());
});
