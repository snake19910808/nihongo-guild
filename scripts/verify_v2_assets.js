const http = require("http");

const paths = [
  "/",
  "/index.html",
  "/manifest.json",
  "/sw.js",
  "/css/style.css",
  "/js/app.js",
  "/js/furigana.js",
  "/js/avatar.js",
  "/js/battle_fx.js",
  "/js/speech_eval.js",
  "/js/handwriting.js",
  "/js/listening_reading.js",
  "/js/srs.js",
  "/js/battle.js",
  "/js/shiori_ai.js",
  "/js/sync.js",
  "/data/kana.json",
  "/data/kanji.json",
  "/data/vocab.json",
  "/data/grammar.json",
  "/data/schedule_398days.json",
  "/data/monsters.json"
];

function checkPath(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:8000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ path, status: res.statusCode, length: data.length });
      });
    }).on("error", (err) => {
      resolve({ path, status: "ERR", error: err.message });
    });
  });
}

async function run() {
  console.log("🔍 正在檢驗所有 v2.0 前端靜態資源...");
  let allOk = true;
  for (const p of paths) {
    const res = await checkPath(p);
    if (res.status === 200) {
      console.log(`  ✅ ${p} (200 OK, ${res.length} bytes)`);
    } else {
      console.error(`  ❌ ${p} FAIL: ${res.status}`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log("🎉 所有 22 項核心資源 100% 驗證通過！");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run();
