const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-hall');
      const talkBtn = document.getElementById('hallTalkBtn');
      
      let speakCalled = false;
      const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      let capturedUtterance = null;
      window.speechSynthesis.speak = function(u) {
        speakCalled = true;
        capturedUtterance = {
          text: u.text,
          lang: u.lang,
          pitch: u.pitch,
          rate: u.rate,
          voiceName: u.voice?.name
        };
        return originalSpeak(u);
      };
      
      if (talkBtn) talkBtn.click();
      
      return {
        speakCalled,
        capturedUtterance,
        currentSpeakerId: FuriganaEngine.voicevoxSpeakerId
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 120,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('INSTANT_VOICE_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
