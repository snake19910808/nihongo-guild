const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      try {
        await FuriganaEngine.speak("冒険者さん、今日もお疲れ様でした。");
        return {
          currentAudioSrc: FuriganaEngine.currentAudio?.src,
          speakerId: FuriganaEngine.voicevoxSpeakerId
        };
      } catch (e) {
        return { error: e.name + ': ' + e.message };
      }
    })()
  `;
  ws.send(JSON.stringify({
    id: 100,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('SPEAK_TEST_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
