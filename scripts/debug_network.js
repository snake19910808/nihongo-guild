const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Console.enable' }));
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 4,
      method: 'Runtime.evaluate',
      params: {
        expression: `fetch('data/vocab.json').then(r => r.status).catch(e => e.toString())`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 500);
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.method && (data.method.startsWith('Network.') || data.method.startsWith('Console.') || data.method.startsWith('Log.'))) {
    console.log(data.method, JSON.stringify(data.params));
  } else if (data.id === 4) {
    console.log('EVAL_RESULT:', JSON.stringify(data));
    setTimeout(() => process.exit(0), 1000);
  }
};
