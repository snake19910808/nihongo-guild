setTimeout(() => {
  const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
  ws.onopen = () => {
    const code = `
      (() => {
        const q = window.BattleManager.currentQuestion;
        const targetAns = q.correctAnswer;
        const btns = Array.from(document.querySelectorAll("#quizOptions .option-btn"));
        const matchBtn = btns.find(b => b.textContent === targetAns);
        if (matchBtn) matchBtn.click();
        
        return {
          questionPrompt: q.prompt,
          correctAnswer: targetAns,
          afterHp: window.BattleManager.monsterHp,
          afterShield: window.BattleManager.monsterShield,
          combo: window.BattleManager.combo,
          isBroken: window.BattleManager.isBroken
        };
      })()
    `;
    ws.send(JSON.stringify({
      id: 31,
      method: 'Runtime.evaluate',
      params: { expression: code, returnByValue: true }
    }));
  };
  ws.onmessage = (msg) => {
    console.log('BREAK_TEST_RESULT:', msg.data);
    process.exit(0);
  };
}, 1600);
