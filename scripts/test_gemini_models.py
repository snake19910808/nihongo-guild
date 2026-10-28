import os
import sys
import json
import urllib.request
import urllib.error
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if not os.path.exists(env_path):
        return None
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip()
                if key and not key.startswith("#"):
                    return key
    return None

def test_models():
    api_key = load_env()
    if not api_key:
        print("❌ 未在 .env 檔案中找到有效的 GEMINI_API_KEY！")
        print("👉 請先在專案目錄下的 .env 填入您的 API Key：")
        print("   GEMINI_API_KEY=AIzaSy...")
        return

    print("🔑 偵測到 GEMINI_API_KEY，開始查詢可用模型列表與連線測試...\n")
    
    # 1. 取得所有可用模型列表
    url_list = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        req = urllib.request.Request(url_list)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            print(f"📋 您的 API Key 共支援 {len(models)} 個可用模型/端點！\n")
    except Exception as e:
        print(f"❌ 查詢模型列表失敗：{e}")
        return

    # 篩選支援 generateContent 的模型
    candidate_names = []
    for m in models:
        methods = m.get("supportedGenerationMethods", [])
        name = m.get("name", "").replace("models/", "")
        if "generateContent" in methods:
            candidate_names.append((name, m.get("displayName", ""), m.get("description", "")))

    print(f"🎯 支援文字生成的模型共有 {len(candidate_names)} 個。\n")
    print(f"{'模型代號 (ID)':<32} | {'狀態':<8} | {'耗時':<7} | {'測試回覆摘要'}")
    print("-" * 75)

    test_prompt = "こんにちは！請用繁體中文回答一句話並自我介紹為詩織。"
    
    # 優先測試幾款推薦的核心模型
    priority_keywords = ["flash", "flash-lite", "pro"]
    sorted_candidates = sorted(
        candidate_names,
        key=lambda x: (
            0 if "3.8-flash" in x[0] or "2.5-flash" in x[0] else
            1 if "flash-lite" in x[0] else
            2 if "flash" in x[0] else
            3 if "pro" in x[0] else 4
        )
    )

    results = []
    # 測試前 8 個最相關的模型
    for name, disp, desc in sorted_candidates[:8]:
        test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{name}:generateContent?key={api_key}"
        payload = json.dumps({
            "contents": [{"parts": [{"text": test_prompt}]}]
        }).encode("utf-8")

        start = time.time()
        try:
            req = urllib.request.Request(
                test_url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = time.time() - start
                res_data = json.loads(resp.read().decode("utf-8"))
                text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                summary = text.replace("\n", " ")[:30] + "..."
                print(f"{name:<32} | ✅ OK    | {elapsed:.2f}s  | {summary}")
                results.append({"name": name, "status": "OK", "time": elapsed, "desc": desc})
        except urllib.error.HTTPError as he:
            elapsed = time.time() - start
            err_msg = f"HTTP {he.code}"
            print(f"{name:<32} | ❌ {err_msg:<5} | {elapsed:.2f}s  | 無法呼叫 ({he.reason})")
            results.append({"name": name, "status": err_msg, "time": elapsed})
        except Exception as e:
            elapsed = time.time() - start
            print(f"{name:<32} | ❌ Error | {elapsed:.2f}s  | {str(e)[:30]}")
            results.append({"name": name, "status": "Error", "time": elapsed})

    print("-" * 75)
    return results

if __name__ == "__main__":
    test_models()
