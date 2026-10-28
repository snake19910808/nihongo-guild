const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      const voices = window.speechSynthesis.getVoices();
      return voices.map(v => ({ name: v.name, lang: v.lang, default: v.default }));
    })()
  `;
  ws.send(JSON.stringify({
    id: 110,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('VOICES_LIST:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
