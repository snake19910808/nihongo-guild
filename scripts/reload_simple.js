const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 11,
    method: 'Page.reload',
    params: { ignoreCache: true }
  }));
};
ws.onmessage = (msg) => {
  console.log('RELOAD_RESULT:', msg.data);
  process.exit(0);
};
