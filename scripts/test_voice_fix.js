const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');

ws.onopen = () => {
  const code = `
    (async () => {
      // 1. 重新載入 FuriganaEngine 相關設定
      if (window.SyncManager && window.App) {
        App.settings = SyncManager.loadSettings();
        App.fillSettingsForm();
      }

      // 2. 測試 getBestJapaneseVoice 回傳的語音
      const bestVoice = FuriganaEngine.getBestJapaneseVoice();
      const allVoices = window.speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang }));

      // 3. 測試 speakBrowser 的 Utterance 參數
      let capturedUtterance = null;
      const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = function(u) {
        capturedUtterance = {
          text: u.text,
          lang: u.lang,
          pitch: u.pitch,
          rate: u.rate,
          voiceName: u.voice ? u.voice.name : null
        };
        // 不實際出聲發音，避免干擾
      };

      FuriganaEngine.speak("冒険者さん、今日も一緒に頑張りましょうね！");
      window.speechSynthesis.speak = originalSpeak;

      return {
        speakerId: FuriganaEngine.voicevoxSpeakerId,
        settingsVoiceStyle: App.settings.voiceStyle,
        bestVoice: bestVoice ? { name: bestVoice.name, lang: bestVoice.lang } : null,
        capturedUtterance,
        totalVoices: allVoices.length
      };
    })()
  `;

  ws.send(JSON.stringify({
    id: 130,
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
  console.log('VOICE_TEST_RESULT:', JSON.stringify(data, null, 2));
  process.exit(0);
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err);
  process.exit(1);
};
