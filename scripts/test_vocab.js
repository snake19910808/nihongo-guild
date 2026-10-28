const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      try {
        const res = await fetch('data/vocab.json');
        const text = await res.text();
        return { ok: res.ok, status: res.status, length: text.length, sample: text.slice(0, 100) };
      } catch (err) {
        return { error: err.name + ': ' + err.message, stack: err.stack };
      }
    })()
  `;
  ws.send(JSON.stringify({
    id: 12,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('FETCH_VOCAB:', msg.data);
  process.exit(0);
};
