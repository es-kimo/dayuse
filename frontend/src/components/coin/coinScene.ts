import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import modelUrl from '../../../../brand/dayuse-coin/dayuse-coin.glb?url';
import { sampleCoinMotion, type CoinMotion } from './coinMotion';
import { prepareCoinModel } from './coinModel';

export interface CoinScene {
  play: (motion: CoinMotion) => void;
  dispose: () => void;
}

export function createCoinScene(host: HTMLElement, variant: 'header' | 'reward', initial: CoinMotion): CoinScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 3));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
  camera.position.set(0, 0, 4);
  const pivot = new THREE.Group();
  scene.add(pivot);
  const environment = new RoomEnvironment(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(environment, 0.12);
  environment.dispose();
  pmrem.dispose();
  scene.environment = target.texture;
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-2, 3, 5);
  const fill = new THREE.DirectionalLight(0xfff8eb, 1.4);
  fill.position.set(3, 1, 5);
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.35));

  const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(variant === 'reward' ? 0 : 0.04, -0.1, 0));
  const axis = new THREE.Vector3(0, 1, 0);
  const turn = new THREE.Quaternion();
  let model: THREE.Group | null = null;
  let disposed = false;
  let frame = 0;
  let motion = initial;
  let elapsed = 0;
  let last: number | null = null;
  let visible = true;

  const disposeModel = (group: THREE.Group) => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  };

  const render = () => {
    const pose = sampleCoinMotion(motion, elapsed);
    pivot.position.y = pose.height;
    turn.setFromAxisAngle(axis, pose.angle);
    pivot.quaternion.copy(turn).multiply(rest);
    renderer.render(scene, camera);
    if (model) host.dataset.ready = '';
    return pose.done;
  };
  const tick = (now: number) => {
    frame = 0;
    if (disposed || !model || !visible || document.hidden) return;
    if (last !== null) elapsed += now - last;
    last = now;
    if (!render()) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!disposed && model && visible && !document.hidden && !frame) {
      last = null;
      frame = requestAnimationFrame(tick);
    }
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  };
  const visibilityChanged = () => { if (document.hidden) pause(); else wake(); };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else pause();
  });
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const halfHeight = variant === 'reward' ? 0.85 : 0.58;
    camera.left = -halfHeight * width / height;
    camera.right = -camera.left;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    wake();
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    pause();
    observer.disconnect();
    resize.disconnect();
    document.removeEventListener('visibilitychange', visibilityChanged);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    if (model) disposeModel(model);
    target.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    delete host.dataset.ready;
  };
  const fail = (error: unknown) => {
    if (disposed) return;
    console.error('데이유즈 코인 3D 표시 실패. 정지 이미지로 표시합니다.', error);
    dispose();
  };
  const contextLost = (event: Event) => { event.preventDefault(); fail(new Error('WebGL context lost')); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  host.append(renderer.domElement);
  observer.observe(host);
  resize.observe(host);
  document.addEventListener('visibilitychange', visibilityChanged);
  new GLTFLoader().load(modelUrl, (gltf) => {
    if (disposed) { disposeModel(gltf.scene); return; }
    model = gltf.scene;
    prepareCoinModel(model);
    pivot.add(model);
    wake();
  }, undefined, fail);

  return {
    play(next) {
      if (next === motion && !sampleCoinMotion(motion, elapsed).done) return;
      motion = next;
      elapsed = 0;
      last = null;
      wake();
    },
    dispose,
  };
}
