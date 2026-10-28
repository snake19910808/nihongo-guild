const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      // Unregister any service workers
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
      // Clear all caches
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
      location.reload();
      return "Reloaded & SW cleared";
    })()
  `;
  ws.send(JSON.stringify({
    id: 10,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('RELOAD_RESPONSE:', msg.data);
  process.exit(0);
};
