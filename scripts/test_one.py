import os, sys, json, urllib.request, urllib.error

key = ""
with open(".env", "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()

m = "gemini-flash-latest"
url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
payload = json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode("utf-8")
print(f"Testing {m}...", flush=True)

try:
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        print("Response code:", resp.status, flush=True)
        print(resp.read().decode('utf-8')[:300], flush=True)
except urllib.error.HTTPError as he:
    print("HTTP Error:", he.code, flush=True)
    print(he.read().decode('utf-8')[:300], flush=True)
except Exception as e:
    print("Error:", e, flush=True)
