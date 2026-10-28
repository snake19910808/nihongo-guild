import os
import sys
import json
import urllib.request
import urllib.error

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()

test_models = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemma-4-31b-it"
]

for m in test_models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": "請用繁體中文回覆：詩織正在為你服務！"}]}]
    }).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            ans = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"✅ {m:26} 成功！回覆：{ans}")
    except urllib.error.HTTPError as he:
        body = he.read().decode('utf-8', errors='ignore')
        print(f"❌ {m:26} HTTP {he.code}: {body[:120]}")
    except Exception as e:
        print(f"❌ {m:26} 錯誤: {e}")
