const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/0');
ws.onopen = () => {
  const code = `
    (() => {
      App.switchTab('tab-hall');
      const taskItems = Array.from(document.querySelectorAll('.task-item'));
      const beforeExp = App.saveData.progress.exp || 0;
      
      // Click first task item
      if (taskItems.length > 0) {
        taskItems[0].click();
      }
      
      const afterExp = App.saveData.progress.exp || 0;
      const completedCount = document.querySelectorAll('.task-item.completed').length;
      const toastText = document.getElementById('toastContainer')?.textContent?.trim();
      
      return {
        taskCount: taskItems.length,
        beforeExp,
        afterExp,
        completedCount,
        toastText
      };
    })()
  `;
  ws.send(JSON.stringify({
    id: 85,
    method: 'Runtime.evaluate',
    params: {
      expression: code,
      returnByValue: true
    }
  }));
};
ws.onmessage = (msg) => {
  console.log('TASK_CLICK_RESULT:', JSON.stringify(JSON.parse(msg.data), null, 2));
  process.exit(0);
};
