const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-battle');
      const startBtn = document.getElementById('btn-start-battle');
      if (startBtn) startBtn.click();
      
      const enemyName = document.getElementById('battle-enemy-name')?.textContent;
      const questionPrompt = document.getElementById('battle-question-prompt')?.textContent;
      const optionsCount = document.querySelectorAll('.battle-opt-btn').length;
      
      return {
        enemyName,
        questionPrompt,
        optionsCount
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 40,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('BATTLE_TEST_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
