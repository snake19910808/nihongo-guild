const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (async () => {
      try {
        await App.init();
        return {
          initialized: true,
          currentDay: App.currentDay,
          activeTab: App.activeTab,
          dailyTasksCount: document.querySelectorAll('.task-item').length,
          scheduleLoaded: !!App.schedule,
          shioriMood: App.shioriMood
        };
      } catch (err) {
        return { initialized: false, error: err.name + ': ' + err.message, stack: err.stack };
      }
    })()
  `;
  ws.send(JSON.stringify({
    id: 20,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('APP_INIT_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
