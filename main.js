import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { Text } from "https://unpkg.com/troika-three-text@0.49.0/dist/troika-three-text.esm.js";

// ====== 設定：あなたのサーバIP/ホスト名に変更 ======
const WS_URL = "wss://192.168.11.50:8443"; // 例: wss://192.168.0.10:8443
// ==============================================

let scene, camera, renderer;
let textMesh;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = null; // AR用

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.xr.enabled = true;

  const app = document.getElementById("app");
  app.appendChild(renderer.domElement);

  // ライト（テキスト/物体が見えるように）
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  // AR空間テキスト（TroikaText）
  textMesh = new Text();
  textMesh.text = "Waiting message...";
  textMesh.fontSize = 0.08;          // 8cm程度
  textMesh.color = 0xffffff;
  textMesh.outlineWidth = 0.002;     // 読みやすく（輪郭）
  textMesh.outlineColor = 0x000000;
  textMesh.anchorX = "center";
  textMesh.anchorY = "middle";
  textMesh.position.set(0, 1.5, -1.2); // 目の前
  textMesh.maxWidth = 1.2;
  textMesh.sync();
  scene.add(textMesh);

  document.getElementById("enter").addEventListener("click", enterAR);
  window.addEventListener("resize", onResize);

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  setMsg("Enter AR を押して開始。\nAR開始後にWebSocketへ接続します。");
}

async function enterAR() {
  try {
    if (!navigator.xr) {
      setMsg("WebXR未対応です。Meta Quest Browserで開いてください。");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!supported) {
      setMsg("immersive-ar がサポートされていません。");
      return;
    }

    renderer.xr.setReferenceSpaceType("local-floor");

    const session = await navigator.xr.requestSession("immersive-ar", {
      optionalFeatures: ["local-floor", "bounded-floor"]
    });

    renderer.xr.setSession(session);
    document.getElementById("enter").style.display = "none";
    setMsg("AR開始。WebSocket接続中…\n" + WS_URL);

    // AR開始後にWebSocket接続
    connectWebSocket();

    session.addEventListener("end", () => {
      document.getElementById("enter").style.display = "inline-block";
      setMsg("AR終了。");
    });
  } catch (e) {
    console.error(e);
    setMsg("AR開始に失敗: " + (e?.message ?? e));
  }
}

function connectWebSocket() {
  let ws;
  let retryMs = 800;

  const connect = () => {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      retryMs = 800;
      setMsg("WebSocket接続OK。\n受信メッセージでARテキストが変わります。");
    });

    ws.addEventListener("message", (ev) => {
      // 受信形式：プレーン文字 or JSON {"text":"..."}
      const str = typeof ev.data === "string" ? ev.data : "";
      let nextText = str;

      try {
        const obj = JSON.parse(str);
        if (obj && typeof obj.text === "string") nextText = obj.text;
      } catch (_) {}

      updateARText(nextText);
    });

    ws.addEventListener("close", () => {
      setMsg(`WebSocket切断。再接続します… (${retryMs}ms)`);
      setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 1.6, 8000);
    });

    ws.addEventListener("error", () => {
      // error後にcloseが来ることが多いので表示だけ
      setMsg("WebSocketエラー。証明書/URL/ポートを確認してください。\n" + WS_URL);
    });
  };

  connect();
}

function updateARText(t) {
  const safe = (t ?? "").toString().slice(0, 500); // 長すぎ防止
  textMesh.text = safe.length ? safe : "(empty)";
  textMesh.sync();
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function setMsg(t) {
  document.getElementById("msg").textContent = t;
}

