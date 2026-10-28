import os, sys, urllib.request, urllib.parse, json, time

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

text = "冒険者さん、今日もお疲れ様でした。"
# 17: 九州そら セクシー (Kyushu Sora Sexy)
# 4: 四国めたん セクシー (Shikoku Metan Sexy)
# 15: 九州そら あまあま (Kyushu Sora Sweet)

url = f"https://api.tts.quest/v3/voicevox/synthesis?text={urllib.parse.quote(text)}&speaker=17"

print("Requesting VOICEVOX synthesis for Kyushu Sora (Sexy)...", flush=True)
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print("Response:", json.dumps(data, indent=2, ensure_ascii=False), flush=True)
    status_url = data.get("audioStatusUrl")
    mp3_url = data.get("mp3DownloadUrl")
    
if status_url:
    for i in range(15):
        time.sleep(1)
        with urllib.request.urlopen(status_url, timeout=5) as s_resp:
            s_data = json.loads(s_resp.read().decode('utf-8'))
            print(f"Status check {i+1}:", s_data.get("isAudioReady"), flush=True)
            if s_data.get("isAudioReady"):
                print("AUDIO READY! Direct MP3 URL:", mp3_url, flush=True)
                break
