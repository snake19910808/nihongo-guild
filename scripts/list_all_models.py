import os
import sys
import json
import urllib.request

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
with urllib.request.urlopen(url) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    models = data.get('models', [])
    for m in models:
        name = m.get('name', '').replace('models/', '')
        disp = m.get('displayName', '')
        methods = m.get('supportedGenerationMethods', [])
        print(f"{name:35} | {disp:30} | {methods}")
