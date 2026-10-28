const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      const results = {};
      results.hasApp = !!window.App;
      results.hasAvatar = !!window.AvatarManager;
      results.hasBattleFX = !!window.BattleFX;
      results.hasSpeechEval = !!window.SpeechEvaluator;
      results.hasHandwriting = !!window.HandwritingBoard;
      results.hasListeningReading = !!window.ListeningReadingModule;
      results.hasFurigana = !!window.FuriganaEngine;
      results.hasSRS = !!window.SRSManager;
      results.hasBattle = !!window.BattleManager;
      
      results.avatarName = window.AvatarManager ? window.AvatarManager.currentAvatar.name : null;
      results.monstersCount = window.BattleManager && window.BattleManager.datasets ? (window.BattleManager.datasets.monsters || []).length : 0;
      results.currentMonster = window.BattleManager && window.BattleManager.currentMonster ? window.BattleManager.currentMonster.name : null;
      results.currentShield = window.BattleManager ? window.BattleManager.monsterShield : null;
      results.srsCardsCount = window.SRSManager ? window.SRSManager.allCards.length : 0;
      results.srsDueCount = window.SRSManager ? window.SRSManager.dueCards.length : 0;
      results.srsMode = window.SRSManager ? window.SRSManager.mode : null;
      
      return results;
    })()
  `;
  ws.send(JSON.stringify({
    id: 20,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};

ws.onmessage = (msg) => {
  console.log('LIVE_STATE:', msg.data);
  process.exit(0);
};
