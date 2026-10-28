import os, sys, json, urllib.request, urllib.error

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

key = ""
with open(".env", "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()

test_list = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemma-4-31b-it", "gemma-4-26b-a4b-it"]

for m in test_list:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
    payload = json.dumps({"contents": [{"parts": [{"text": "請用繁體中文回答：你好，我是詩織！"}]}]}).encode("utf-8")
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            ans = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            print(f"SUCCESS [{m}]: {ans}")
    except urllib.error.HTTPError as he:
        print(f"FAILED [{m}] HTTP {he.code}: {he.read().decode('utf-8', errors='ignore')[:150]}")
    except Exception as e:
        print(f"ERROR [{m}]: {e}")
