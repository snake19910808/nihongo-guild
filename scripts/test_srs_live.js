const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-srs');
      const card = window.SRSManager.currentCard;
      const frontText = document.getElementById('srs-card-front')?.textContent?.trim();
      
      // Flip card
      const cardInner = document.getElementById('srs-card-inner');
      if (cardInner) cardInner.click();
      const backText = document.getElementById('srs-card-back')?.textContent?.trim();
      
      // Grade Easy (5)
      const easyBtn = document.querySelector('.srs-grade-btn[data-rating="5"]');
      if (easyBtn) easyBtn.click();
      
      const newStats = window.SRSManager.getStats();
      
      return {
        cardFront: frontText,
        cardBack: backText,
        newStats
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 60,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('SRS_TEST_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
