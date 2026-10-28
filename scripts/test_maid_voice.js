const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');

ws.onopen = () => {
  const code = `
    (async () => {
      // 1. 檢查當前設定
      const speakerId = FuriganaEngine.voicevoxSpeakerId;
      const settingVal = App.settings.voiceStyle;
      const selectVal = document.getElementById('settingVoiceStyle')?.value;

      // 2. 測試公會大廳問候觸發 (命中預錄女僕音檔)
      FuriganaEngine.speak("冒険者さん、今日も公会へようこそ！");
      const audio1Src = FuriganaEngine.currentAudio ? FuriganaEngine.currentAudio.src : null;

      // 3. 測試設定試聽按鈕 (命中預錄女僕試聽音檔)
      const testBtn = document.getElementById('testVoiceBtn');
      if (testBtn) testBtn.click();
      const testSrc = FuriganaEngine.currentAudio ? FuriganaEngine.currentAudio.src : null;

      return {
        speakerId,
        settingVal,
        selectVal,
        audio1Src,
        testSrc,
        hasLocalAudioMap: !!FuriganaEngine.localAudioMap
      };
    })()
  `;

  ws.send(JSON.stringify({
    id: 150,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  console.log('MAID_VOICE_TEST:', JSON.stringify(data.result.result.value, null, 2));
  process.exit(0);
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
};
