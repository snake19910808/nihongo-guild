const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-srs');
      const cardFront = document.getElementById('cardFrontWord')?.textContent;
      const cardSub = document.getElementById('cardFrontSub')?.textContent;
      const statsText = document.getElementById('srsStatsText')?.textContent;
      const dueBadge = document.getElementById('srsDueCountBadge')?.textContent;
      
      return {
        cardFront,
        cardSub,
        statsText,
        dueBadge
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 61,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('SRS_UI_STATE:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
