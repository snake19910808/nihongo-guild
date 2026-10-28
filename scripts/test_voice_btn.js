const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 140,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btn = document.getElementById('testVoiceBtn');
        return {
          exists: !!btn,
          text: btn ? btn.textContent : null
        };
      })()`,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('BTN_CHECK:', JSON.stringify(JSON.parse(msg.data).result.result.value, null, 2));
  process.exit(0);
};
