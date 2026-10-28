const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-hall');
      const talkBtn = document.getElementById('hallTalkBtn');
      const voiceBtn = document.getElementById('shioriHallVoiceBtn');
      const goChatBtn = document.getElementById('hallGoChatBtn');
      
      const beforeGreeting = App.currentGreeting?.ja;
      if (talkBtn) talkBtn.click();
      const afterGreeting = App.currentGreeting?.ja;
      
      // Test going to chat
      if (goChatBtn) goChatBtn.click();
      const activeTabAfterChat = document.querySelector('.tab-pane.active')?.id;
      
      // Switch back to hall
      App.switchTab('tab-hall');
      
      return {
        talkBtnText: talkBtn?.textContent?.trim(),
        voiceBtnText: voiceBtn?.textContent?.trim(),
        goChatBtnText: goChatBtn?.textContent?.trim(),
        beforeGreeting,
        afterGreeting,
        activeTabAfterChat
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 90,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('SHIORI_HALL_TEST:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
