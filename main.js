import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const modeTag = document.querySelector("#modeTag");
const xrTag = document.querySelector("#xrTag");
const resetBtn = document.querySelector("#resetBtn");

let scene, camera, renderer;
let cube;
let controller;
let controls = null;

init();

async function init() {
  // --- Scene ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101018);

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

  // フォールバック用の初期位置（XR中はWebXRが上書き）
  camera.position.set(0, 1.6, 2.2);

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // --- Light ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.0));

  // --- Objects ---
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x66ccff })
  );
  cube.position.set(0, 1.4, -1.2);
  scene.add(cube);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x222233 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // --- XR supported? ---
  const xrSupported = await isImmersiveVRSupported();
  xrTag.textContent = `webxr: ${xrSupported ? "immersive-vr ✅" : "immersive-vr ❌"}`;

  if (xrSupported) {
    // Questなど：Enter VRボタン表示
    document.body.appendChild(VRButton.createButton(renderer));
    modeTag.textContent = "mode: WebXR";

    // コントローラ（トリガーで色変え）
    controller = renderer.xr.getController(0);
    controller.addEventListener("selectstart", () => toggleCubeColor());
    scene.add(controller);
  } else {
    // iPhone/PC：OrbitControlsで操作（タッチ/マウス）
    modeTag.textContent = "mode: Fallback (OrbitControls)";
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.4, -1.2); // 立方体付近を見る
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.6;
    controls.update();

    // iPhoneでダブルタップ等に邪魔されないように（必要なら）
    renderer.domElement.style.touchAction = "none";

    // タップで色変更（フォールバック用）
    renderer.domElement.addEventListener("pointerdown", (e) => {
      // 誤タップが多いときは条件を調整
      if (e.isPrimary) toggleCubeColor();
    });
  }

  // Reset View
  resetBtn.onclick = () => {
    if (controls) {
      camera.position.set(0, 1.6, 2.2);
      controls.target.set(0, 1.4, -1.2);
      controls.update();
    }
  };

  window.addEventListener("resize", onWindowResize);

  // WebXRは setAnimationLoop が基本（フォールバックでも使ってOK）
  renderer.setAnimationLoop(render);
}

function toggleCubeColor() {
  const mat = cube.material;
  mat.color.setHex(mat.color.getHex() === 0x66ccff ? 0xffcc66 : 0x66ccff);
}

function render() {
  cube.rotation.y += 0.01;
  if (controls) controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function isImmersiveVRSupported() {
  // Safari(iPhone)等では navigator.xr 自体が無いことが多い
  if (!("xr" in navigator)) return false;

  try {
    // 一部ブラウザは isSessionSupported が未実装のことがある
    if (typeof navigator.xr.isSessionSupported !== "function") return false;
    return await navigator.xr.isSessionSupported("immersive-vr");
  } catch {
    return false;
  }
}
