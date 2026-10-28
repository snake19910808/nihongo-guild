import os, sys, json, urllib.request, urllib.error

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

key = ""
with open(".env", "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()

candidates = [
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-4-argon",
    "gemma-4-26b-a4b-it",
    "gemini-pro-latest"
]

for m in candidates:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
    payload = json.dumps({"contents": [{"parts": [{"text": "請用繁體中文回覆一句話。"}]}]}).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            ans = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"✅ {m:28} 成功！Ans: {ans[:40]}", flush=True)
    except urllib.error.HTTPError as he:
        body = he.read().decode('utf-8', errors='ignore')
        print(f"❌ {m:28} HTTP {he.code}: {body[:80]}", flush=True)
    except Exception as e:
        print(f"❌ {m:28} 異常: {str(e)[:40]}", flush=True)
