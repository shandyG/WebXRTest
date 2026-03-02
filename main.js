import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

let scene, camera, renderer, cube;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = null; // 透明（AR用）

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    50
  );

  // ★ARでは透明背景が必要なので alpha:true
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;

  // キャンバスを背面に
  const app = document.getElementById("app");
  app.appendChild(renderer.domElement);

  // キャンバスがUIクリックを邪魔しないように保険
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.zIndex = "0";

  // ライト（白く見せる）
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  // 白いキューブ（10cm）
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 })
  );
  // AR開始後は参照空間基準になるので、まずは原点から前方へ
  cube.position.set(0, 0, -1.0);
  scene.add(cube);

  document.getElementById("enter").addEventListener("click", enterAR);
  window.addEventListener("resize", onWindowResize);

  renderer.setAnimationLoop(render);
  setMsg("Enter AR を押してパススルーARを開始（HTTPS必須）");
}

async function enterAR() {
  try {
    if (!navigator.xr) {
      setMsg("WebXR未対応です。Meta Quest Browserで開いてください。");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!supported) {
      setMsg("この環境では immersive-ar（パススルーAR）がサポートされていません。");
      return;
    }

    // 参照空間：床基準が取れるなら local-floor が便利
    renderer.xr.setReferenceSpaceType("local-floor");

    const session = await navigator.xr.requestSession("immersive-ar", {
      optionalFeatures: ["local-floor", "bounded-floor"]
    });

    renderer.xr.setSession(session);

    document.getElementById("enter").style.display = "none";
    setMsg("AR開始。前方に白いキューブが表示されます。");

    session.addEventListener("end", () => {
      document.getElementById("enter").style.display = "inline-block";
      setMsg("ARを終了しました。");
    });
  } catch (e) {
    console.error(e);
    setMsg("AR開始に失敗: " + (e?.message ?? e));
  }
}

function render() {
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.005;
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setMsg(t) {
  document.getElementById("msg").textContent = t;
}
