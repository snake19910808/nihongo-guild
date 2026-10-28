const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      // 1. 切換到戰鬥分頁
      window.App.switchTab("tab-battle");
      
      const beforeHp = window.BattleManager.monsterHp;
      const beforeShield = window.BattleManager.monsterShield;
      const q = window.BattleManager.currentQuestion;
      const targetAns = q.correctAnswer;
      
      // 2. 模擬點擊正確答案
      const btns = Array.from(document.querySelectorAll("#quizOptions .option-btn"));
      const matchBtn = btns.find(b => b.textContent === targetAns);
      
      if (matchBtn) {
        matchBtn.click();
      }
      
      return {
        questionPrompt: q.prompt,
        correctAnswer: targetAns,
        matchedButton: !!matchBtn,
        beforeHp,
        beforeShield,
        afterHp: window.BattleManager.monsterHp,
        afterShield: window.BattleManager.monsterShield,
        combo: window.BattleManager.combo,
        isBroken: window.BattleManager.isBroken
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 30,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};

ws.onmessage = (msg) => {
  console.log('BATTLE_TEST_RESULT:', msg.data);
  process.exit(0);
};
