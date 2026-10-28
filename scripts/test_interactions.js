const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      // 1. Check tab buttons
      const tabs = Array.from(document.querySelectorAll('.nav-tab')).map(b => b.dataset.tab);
      
      // 2. Switch to Battle tab
      App.switchTab('battle');
      const battleZone = document.getElementById('battle-zone-select')?.value;
      
      // 3. Switch to SRS tab
      App.switchTab('srs');
      const srsStats = window.SRSManager.getStats();
      
      // 4. Switch to Shiori tab
      App.switchTab('shiori');
      const chatMessages = document.querySelectorAll('.chat-msg').length;
      
      // 5. Switch back to Quest tab
      App.switchTab('quest');
      
      return {
        tabs,
        battleZone,
        srsStats,
        chatMessages
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
  console.log('INTERACTIONS_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
