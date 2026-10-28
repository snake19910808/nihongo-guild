const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      const q = window.BattleManager.currentQuestion;
      const opts = Array.from(document.querySelectorAll('.option-btn')).map(b => b.textContent.trim());
      const correctBtn = Array.from(document.querySelectorAll('.option-btn')).find(b => b.textContent.trim() === q.correctAnswer);
      
      const beforeHp = window.BattleManager.monsterHp;
      if (correctBtn) correctBtn.click();
      const afterHp = window.BattleManager.monsterHp;
      const combo = window.BattleManager.combo;
      
      return {
        prompt: q.prompt,
        correctAnswer: q.correctAnswer,
        options: opts,
        beforeHp,
        afterHp,
        combo
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 55,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('BATTLE_ACTION_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
