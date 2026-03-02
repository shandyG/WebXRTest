import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

let scene, camera, renderer, cube;

init();

function init() {
  // シーン作成
  scene = new THREE.Scene();

  // カメラ
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    50
  );

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;

  document.body.appendChild(renderer.domElement);

  // ライト（白く見せるために必要）
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  // 白いキューブ（10cm角）
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.0
  });

  cube = new THREE.Mesh(geometry, material);

  // ユーザーの1m前・目の高さ
  cube.position.set(0, 1.5, -1.0);
  scene.add(cube);

  // ボタン処理
  document.getElementById("enter").addEventListener("click", enterVR);

  // リサイズ対応
  window.addEventListener("resize", onWindowResize);

  // 描画ループ
  renderer.setAnimationLoop(render);
}

async function enterVR() {
  if (!navigator.xr) {
    alert("WebXR未対応ブラウザです。Questのブラウザで開いてください。");
    return;
  }

  const supported = await navigator.xr.isSessionSupported("immersive-vr");
  if (!supported) {
    alert("immersive-vr がサポートされていません。");
    return;
  }

  const session = await navigator.xr.requestSession("immersive-vr", {
    optionalFeatures: ["local-floor", "bounded-floor"]
  });

  renderer.xr.setSession(session);

  document.getElementById("enter").style.display = "none";
}

function render() {
  // 少し回転させる
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.005;

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
