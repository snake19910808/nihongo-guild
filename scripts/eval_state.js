const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      const report = {};
      const items = [
        ["kana", "data/kana.json"],
        ["kanji", "data/kanji.json"],
        ["vocab", "data/vocab.json"],
        ["grammar", "data/grammar.json"],
        ["schedule", "data/schedule_398days.json"]
      ];
      for (const [name, path] of items) {
        try {
          const res = await fetch(path);
          const data = await res.json();
          report[name] = { success: true, count: data.length };
        } catch (e) {
          report[name] = { success: false, error: e.name + ': ' + e.message };
        }
      }
      return report;
    })()
  `;
  ws.send(JSON.stringify({
    id: 7,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('ONE_BY_ONE_REPORT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
