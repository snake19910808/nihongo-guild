const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 11,
    method: 'Runtime.evaluate',
    params: {
      expression: 'location.href',
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('LOCATION:', msg.data);
  process.exit(0);
};
