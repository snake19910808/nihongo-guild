const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    ({
      kana: App.data.kana.length,
      kanji: App.data.kanji.length,
      vocab: App.data.vocab.length,
      grammar: App.data.grammar.length,
      schedule: App.data.schedule.length,
      currentDay: App.currentDayIndex,
      questTitle: document.getElementById('quest-day-title')?.textContent,
      heroName: document.getElementById('hero-name')?.textContent,
      heroLevel: document.getElementById('hero-level')?.textContent
    })
  `;
  ws.send(JSON.stringify({
    id: 21,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('APP_STATE:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
