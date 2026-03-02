import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

let scene, camera, renderer;
let cube;
let controller;

init();
animate();

function init() {
  // 1) シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101018);

  // 2) カメラ（WebXRが実際の視点を上書きしてくれる）
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

  // 3) レンダラ
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // 4) Enter VRボタン
  document.body.appendChild(VRButton.createButton(renderer));

  // 5) ライト
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 1.0);
  scene.add(hemi);

  // 6) 立方体
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x66ccff })
  );
  cube.position.set(0, 1.4, -1.2);
  scene.add(cube);

  // 7) 床（目印）
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x222233 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // 8) コントローラ（トリガーで色変更）
  controller = renderer.xr.getController(0);
  controller.addEventListener("selectstart", () => {
    const mat = cube.material;
    // ざっくり色を切り替える（教材なので簡単に）
    mat.color.setHex(mat.color.getHex() === 0x66ccff ? 0xffcc66 : 0x66ccff);
  });
  scene.add(controller);

  // 9) リサイズ
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // WebXRのときは setAnimationLoop を使う
  renderer.setAnimationLoop(render);
}

function render() {
  // 毎フレーム少し回す
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}