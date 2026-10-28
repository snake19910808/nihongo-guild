const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-battle');
      const enemyName = document.getElementById('monsterName')?.textContent;
      const questionPrompt = document.getElementById('quizPrompt')?.textContent?.trim();
      const options = Array.from(document.querySelectorAll('.quiz-opt-btn')).map(b => b.textContent.trim());
      
      return {
        enemyName,
        questionPrompt,
        options
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 50,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('BATTLE_STATE:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
