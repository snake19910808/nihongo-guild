const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      App.switchTab('tab-shiori');
      const inputEl = document.getElementById('shioriChatInput');
      const sendBtn = document.getElementById('shioriSendBtn');
      if (inputEl) inputEl.value = '你好，詩織！';
      if (sendBtn) sendBtn.click();
      
      // Wait 500ms
      await new Promise(r => setTimeout(r, 600));
      
      const msgs = Array.from(document.querySelectorAll('.msg-bubble')).map(b => ({
        cls: b.className,
        text: b.textContent.trim()
      }));
      return { msgs };
    })()
  `;
  ws.send(JSON.stringify({
    id: 71,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('SHIORI_CHAT_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
