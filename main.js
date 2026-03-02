import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// ★あなたのWSSサーバーに合わせて変更（例：PCのIP）
const WS_URL = "wss://YOUR_PC_IP_OR_HOST:8081";

let scene, camera, renderer;
let labelMesh, labelCanvas, labelCtx, labelTexture;
let ws;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;

  const app = document.getElementById("app");
  app.appendChild(renderer.domElement);

  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.zIndex = "0";

  // 光（白い板や3D物体を置くなら必要）
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  // ===== AR内テキスト（Canvas → Texture → Plane） =====
  const { mesh, canvas, ctx, texture } = createTextLabel("Waiting for WebSocket...");
  labelMesh = mesh;
  labelCanvas = canvas;
  labelCtx = ctx;
  labelTexture = texture;

  // 目の前1mに出す（local-floorなら床基準になることがあります）
  labelMesh.position.set(0, 1.5, -1.0);
  scene.add(labelMesh);

  // UI
  document.getElementById("enter").addEventListener("click", enterAR);
  window.addEventListener("resize", onWindowResize);

  renderer.setAnimationLoop(render);
  setMsg(`Enter AR を押して開始。\nWS: ${WS_URL}`);
}

async function enterAR() {
  try {
    if (!navigator.xr) {
      setMsg("WebXR未対応です。Meta Quest Browserで開いてください。");
      return;
    }

    const supported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!supported) {
      setMsg("immersive-ar（パススルーAR）がサポートされていません。");
      return;
    }

    renderer.xr.setReferenceSpaceType("local-floor");

    const session = await navigator.xr.requestSession("immersive-ar", {
      optionalFeatures: ["local-floor", "bounded-floor"]
    });

    renderer.xr.setSession(session);
    document.getElementById("enter").style.display = "none";
    setMsg("AR開始。WebSocket接続を試みます…");

    // WebSocket開始（AR開始後でも、開始前でもOK）
    startWebSocket();

    session.addEventListener("end", () => {
      document.getElementById("enter").style.display = "inline-block";
      stopWebSocket();
      setMsg("ARを終了しました。");
    });
  } catch (e) {
    console.error(e);
    setMsg("AR開始に失敗: " + (e?.message ?? e));
  }
}

function startWebSocket() {
  stopWebSocket();

  try {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      setMsg("WebSocket接続: OK\n受信メッセージでARテキストが変わります。");
      updateLabelText("WS Connected ✅\nSend a message!");
    });

    ws.addEventListener("message", (ev) => {
      // 受け取った文字列をそのまま表示（必要ならJSONパース等に変更）
      const text = typeof ev.data === "string" ? ev.data : "[binary message]";
      updateLabelText(text);
    });

    ws.addEventListener("close", () => {
      setMsg("WebSocket切断");
      updateLabelText("WS Disconnected ❌");
    });

    ws.addEventListener("error", () => {
      setMsg("WebSocketエラー（HTTPS↔WSS、証明書、IP/ポートを確認）");
      updateLabelText("WS Error ❌");
    });
  } catch (e) {
    console.error(e);
    setMsg("WebSocket開始に失敗: " + (e?.message ?? e));
  }
}

function stopWebSocket() {
  if (ws) {
    try { ws.close(); } catch {}
    ws = null;
  }
}

function render() {
  // 常にカメラの方を向ける（読みやすい）
  labelMesh.quaternion.copy(camera.quaternion);
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===== テキストラベル生成・更新 =====
function createTextLabel(initialText) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true
  });

  // 物理サイズ（横40cm程度）
  const geometry = new THREE.PlaneGeometry(0.40, 0.20);
  const mesh = new THREE.Mesh(geometry, material);

  // 初期描画
  drawLabel(ctx, canvas, initialText);
  texture.needsUpdate = true;

  return { mesh, canvas, ctx, texture };
}

function updateLabelText(text) {
  drawLabel(labelCtx, labelCanvas, text);
  labelTexture.needsUpdate = true;
}

function drawLabel(ctx, canvas, text) {
  // 背景クリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 半透明の黒背景
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, 40, 40, canvas.width - 80, canvas.height - 80, 30);
  ctx.fill();

  // 文字
  ctx.fillStyle = "white";
  ctx.font = "bold 56px sans-serif";
  ctx.textBaseline = "top";

  // 改行対応（簡易）
  const lines = String(text).split("\n").slice(0, 6);
  let y = 80;
  for (const line of lines) {
    ctx.fillText(line.slice(0, 40), 80, y);
    y += 68;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setMsg(t) {
  document.getElementById("msg").textContent = t;
}
